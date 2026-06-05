import { createServiceSupabase } from "@/lib/supabase/server";
import { isMissingFeedbackTable } from "@/lib/feedback/db";
import { applyInsightToEvolutionRules } from "@/lib/evolution-lab/insightToRules";
import { isAutoEvolveFromFeedbackEnabled, isFriendBetaLearningMode } from "@/lib/config/engineEvolutionFlags";
import { evaluateInsightAutoApply } from "@/lib/feedback/humanOverrideEngine";
import { MASTER_V6_AI_BANNED_OPENINGS } from "@/lib/product/briclogMasterSystemV6";

/**
 * 피드백·이벤트 패턴에서 전역 인사이트 후보 생성 (자동 규칙 적용 없음)
 */
export async function aggregateGlobalInsightCandidates() {
  const db = createServiceSupabase();
  if (!db) return { ok: false, reason: "no_service_role" };

  const since = new Date();
  since.setDate(since.getDate() - 14);

  const [fbRes, evRes] = await Promise.all([
    db
      .from("content_feedback")
      .select("reaction, tags")
      .gte("created_at", since.toISOString())
      .limit(2000),
    db
      .from("content_events")
      .select("event_type, channel, meta")
      .gte("created_at", since.toISOString())
      .limit(3000),
  ]);

  if (fbRes.error && isMissingFeedbackTable(fbRes.error)) {
    return { ok: false, reason: "tables_missing" };
  }

  const tagCounts = {};
  let bad = 0;
  let total = 0;
  for (const row of fbRes.data || []) {
    total += 1;
    if (row.reaction === "bad") bad += 1;
    for (const t of row.tags || []) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }

  const copyEvents = (evRes.data || []).filter((e) =>
    /copy/.test(e.event_type)
  ).length;
  const rewriteEvents = (evRes.data || []).filter(
    (e) => e.event_type === "rewrite"
  ).length;
  const deleteEvents = (evRes.data || []).filter(
    (e) => e.event_type === "delete"
  ).length;

  const dwellSamples = (evRes.data || [])
    .map((e) => Number(e.meta?.dwell_seconds || e.meta?.dwellSeconds || 0))
    .filter((n) => n > 0);
  const avgDwellSeconds = dwellSamples.length
    ? dwellSamples.reduce((a, b) => a + b, 0) / dwellSamples.length
    : null;
  const conversionRate =
    copyEvents + rewriteEvents > 0 ? copyEvents / (copyEvents + rewriteEvents) : null;

  const performanceMetrics = {
    sampleSize: total + (evRes.data || []).length,
    conversionRate,
    avgDwellSeconds,
    tagRate: total ? (tagCounts.too_ad || 0) / total : null,
  };

  const suggestions = [];
  const badRate = total ? bad / total : 0;
  const beta = isFriendBetaLearningMode();
  const aiTagMin = beta ? 2 : 5;
  const adTagMin = beta ? 2 : 4;
  const badRateMin = beta ? 0.25 : 0.35;
  const badCountMin = beta ? 4 : 10;
  const rewriteMin = beta ? 3 : 8;

  if ((tagCounts.too_ai || 0) + (tagCounts.gpt_tone || 0) >= aiTagMin) {
    suggestions.push({
      insight_type: "ai_cliche_threshold",
      payload: {
        message: "AI/GPT 톤 지적이 다수 — cliché 검출 임계값 상향 검토",
        tagCounts: {
          too_ai: tagCounts.too_ai || 0,
          gpt_tone: tagCounts.gpt_tone || 0,
        },
        suggestedAction: "review_quality_rules",
        autoApply: false,
      },
    });
  }

  if ((tagCounts.too_ad || 0) >= adTagMin) {
    suggestions.push({
      insight_type: "ad_tone_guard",
      payload: {
        message: "광고 톤 피드백 다수 — 과장 표현 가드 강화 검토",
        count: tagCounts.too_ad,
        autoApply: false,
      },
    });
  }

  if (badRate >= badRateMin && total >= badCountMin) {
    suggestions.push({
      insight_type: "negative_feedback_rate",
      payload: {
        message: `부정 피드백 비율 ${Math.round(badRate * 100)}%`,
        bad,
        total,
        autoApply: false,
      },
    });
  }

  if (rewriteEvents > copyEvents && rewriteEvents >= rewriteMin) {
    suggestions.push({
      insight_type: "rewrite_vs_copy",
      payload: {
        message: "재작성이 복사보다 많음 — 초안 품질·프롬프트 점검",
        rewriteEvents,
        copyEvents,
        autoApply: false,
      },
    });
  }

  const aiClicheMin = beta ? 3 : 6;
  if ((tagCounts.too_ai || 0) + (tagCounts.gpt_tone || 0) >= aiClicheMin) {
    suggestions.push({
      insight_type: "community_ai_opening_ban",
      payload: {
        message: "AI/GPT 톤·관용 도입 다수 — 전역 금지어 후보",
        forbiddenCandidates: MASTER_V6_AI_BANNED_OPENINGS.slice(0, 5),
        autoApply: true,
      },
    });
  }

  if (deleteEvents >= (beta ? 5 : 12) && rewriteEvents >= rewriteMin) {
    suggestions.push({
      insight_type: "community_delete_pattern",
      payload: {
        message: "삭제·재작성 다수 — 초안 만족도 낮음, 정보성·브랜드 일치 강화",
        deleteEvents,
        rewriteEvents,
        autoApply: false,
      },
    });
  }

  const inserted = [];
  const autoApplied = [];
  for (const s of suggestions) {
    const { data: existing } = await db
      .from("global_quality_insights")
      .select("id")
      .eq("insight_type", s.insight_type)
      .eq("status", "pending")
      .limit(1);

    if (existing?.length) continue;

    const { data, error } = await db
      .from("global_quality_insights")
      .insert({
        insight_type: s.insight_type,
        payload: s.payload,
        status: "pending",
      })
      .select("id, insight_type")
      .single();

    if (!error && data) {
      inserted.push(data);
      if (isAutoEvolveFromFeedbackEnabled()) {
        const override = evaluateInsightAutoApply(s, performanceMetrics);
        if (!override.apply) {
          continue;
        }
        const evolution = await applyInsightToEvolutionRules(s, {
          persistToDb: true,
        });
        if (evolution.applied) {
          autoApplied.push(s.insight_type);
          await db
            .from("global_quality_insights")
            .update({
              status: "approved",
              approved_at: new Date().toISOString(),
              payload: {
                ...(s.payload || {}),
                autoApplied: true,
                evolutionRulesApplied: evolution,
              },
            })
            .eq("id", data.id);
        }
      }
    }
  }

  return {
    ok: true,
    inserted: inserted.length,
    autoApplied: autoApplied.length,
    suggestions: suggestions.length,
  };
}

export async function listPendingInsights(db) {
  const { data, error } = await db
    .from("global_quality_insights")
    .select("id, insight_type, payload, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function approveInsight(db, insightId) {
  const { data: pending, error: fetchError } = await db
    .from("global_quality_insights")
    .select("id, insight_type, payload, status")
    .eq("id", insightId)
    .eq("status", "pending")
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!pending) {
    const err = new Error("승인 대기 중인 인사이트가 없습니다.");
    err.code = "not_found";
    throw err;
  }

  const evolutionRules = await applyInsightToEvolutionRules(pending, {
    persistToDb: true,
  });

  const { data, error } = await db
    .from("global_quality_insights")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      payload: {
        ...(pending.payload || {}),
        evolutionRulesApplied: evolutionRules,
      },
    })
    .eq("id", insightId)
    .eq("status", "pending")
    .select()
    .single();
  if (error) throw error;
  return { ...data, evolutionRules };
}
