import { createServiceSupabase } from "@/lib/supabase/server";
import { isMissingFeedbackTable } from "@/lib/feedback/db";
import { applyInsightToEvolutionRules } from "@/lib/evolution-lab/insightToRules";

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
      .select("event_type, channel")
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

  const suggestions = [];
  const badRate = total ? bad / total : 0;

  if ((tagCounts.too_ai || 0) + (tagCounts.gpt_tone || 0) >= 5) {
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

  if ((tagCounts.too_ad || 0) >= 4) {
    suggestions.push({
      insight_type: "ad_tone_guard",
      payload: {
        message: "광고 톤 피드백 다수 — 과장 표현 가드 강화 검토",
        count: tagCounts.too_ad,
        autoApply: false,
      },
    });
  }

  if (badRate >= 0.35 && total >= 10) {
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

  if (rewriteEvents > copyEvents && rewriteEvents >= 8) {
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

  const inserted = [];
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

    if (!error && data) inserted.push(data);
  }

  return { ok: true, inserted: inserted.length, suggestions: suggestions.length };
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

  const evolutionRules = applyInsightToEvolutionRules(pending);

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
