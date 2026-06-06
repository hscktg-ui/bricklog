/**
 * BRICLOG SELF EVOLUTION CORE v1.0
 * 실패 감지 · 복사 성공 · 수정 학습 · 커뮤니티 신호 · 주간 진화
 */
import { createServiceSupabase } from "@/lib/supabase/server";
import {
  assessPublishWithoutEditing,
  detectCoreViolations,
  MIN_BODY_INFORMATION_UNITS,
} from "@/lib/product/coreContentEngine";
import { assessTopicCoverage } from "@/lib/evolution/topicCoverageEngine";
import { assessResearchDepth } from "@/lib/evolution/researchDepthEngine";
import { analyzeHumanCorrection, formatHumanCorrectionBrief } from "@/lib/evolution/humanCorrectionEngine";
import {
  AUTO_BAN_SEED_PHRASES,
  detectBannedPhrasesInText,
  evaluateAutoBanCandidates,
} from "@/lib/evolution/autoBanEngine";
import { rankCommunityContentSignals } from "@/lib/evolution/communitySignalEngine";
import { buildEvolutionPatchFromInsight } from "@/lib/evolution-lab/insightToRules";
import {
  saveGlobalEngineRulesPatch,
} from "@/lib/evolution-lab/globalEngineRulesDb";
import { refreshEvolutionRulesCache } from "@/lib/evolution-lab/rulesStore";
import { isAutoEvolveFromFeedbackEnabled } from "@/lib/config/engineEvolutionFlags";
import { interpretContentBehavior } from "@/lib/feedback/behaviorInterpretationEngine";

import { SELF_EVOLUTION_VERSION } from "@/lib/evolution/evolutionConstants";
export { SELF_EVOLUTION_VERSION };

export const FAILURE_ACTIONS = new Set([
  "rewrite",
  "delete",
  "human_edit",
  "regenerate",
]);

export const FAILURE_REASONS = {
  low_information: "정보 부족",
  brand_inaccurate: "브랜드 부정확",
  repetition: "반복 문장",
  industry_cross: "업종 오염",
  too_ad: "광고성 과다",
  seo_stuffing: "SEO 과다",
  structure_repeat: "구조 반복",
  low_examples: "사례 부족",
  topic_thin: "주제 설명 부족",
  fiction: "허구 체험",
  padding: "길이 패딩",
  research_thin: "조사 부족",
  topic_coverage_gap: "주제 커버리지 부족",
};

const TAG_TO_FAILURE = {
  low_info: "low_information",
  too_weak: "low_information",
  brand_weak: "brand_inaccurate",
  repeat: "repetition",
  too_ad: "too_ad",
  seo_weak: "seo_stuffing",
  too_ai: "structure_repeat",
  gpt_tone: "structure_repeat",
  length_wrong: "padding",
};

export { assessTopicCoverage, TOPIC_COVERAGE_QUESTIONS } from "@/lib/evolution/topicCoverageEngine";
export { assessResearchDepth } from "@/lib/evolution/researchDepthEngine";

export function isFailureAction(eventType = "") {
  return FAILURE_ACTIONS.has(String(eventType || "").trim());
}

export function mapTagsToFailureReasons(tags = []) {
  const out = new Set();
  for (const t of tags || []) {
    const code = TAG_TO_FAILURE[t];
    if (code) out.add(code);
  }
  return [...out];
}

export function mapAuditToFailureReasons(audit = {}) {
  const reasons = new Set();
  for (const issue of audit.issues || []) {
    switch (issue.code) {
      case "low_info_units":
      case "low_information_yield":
      case "low_reader_learnings":
        reasons.add("low_information");
        break;
      case "repetition":
      case "duplicate":
      case "numbered_pad":
      case "padding_pattern":
        reasons.add("repetition");
        break;
      case "industry_cross":
        reasons.add("industry_cross");
        break;
      case "fiction_experience":
        reasons.add("fiction");
        break;
      case "subject_matter_insufficient":
        reasons.add("topic_thin");
        break;
      default:
        break;
    }
  }
  return [...reasons];
}

/** COPY SUCCESS ENGINE */
export function assessCopySuccess(events = []) {
  const copies = events.filter((e) => /copy|download/.test(e.event_type || "")).length;
  const saves = events.filter((e) => e.event_type === "save").length;
  const rewrites = events.filter((e) => e.event_type === "rewrite").length;
  const success = copies > 0 || saves > 0;
  const copyRate =
    copies + rewrites > 0 ? copies / (copies + rewrites) : copies > 0 ? 1 : 0;
  return {
    success,
    copies,
    saves,
    rewrites,
    copyRate,
    publishSignal: copies >= 1 && rewrites <= 1,
  };
}

/** FAILURE DETECTION ENGINE */
export function detectGenerationFailure({
  eventType = "",
  feedback = null,
  pack = null,
  input = {},
  events = [],
  beforePlain = "",
  afterPlain = "",
} = {}) {
  const reasons = new Set();
  const action = String(eventType || "");

  if (isFailureAction(action)) {
    reasons.add(action === "rewrite" || action === "regenerate" ? "regenerate" : action);
  }

  if (feedback) {
    for (const r of mapTagsToFailureReasons(feedback.tags)) reasons.add(r);
    if (feedback.reaction === "bad") reasons.add("low_information");
  }

  if (pack) {
    const audit = detectCoreViolations(pack, input);
    for (const r of mapAuditToFailureReasons(audit)) reasons.add(r);
    const topic = assessTopicCoverage(pack, input);
    if (!topic.ok) reasons.add("topic_coverage_gap");
    const publish = assessPublishWithoutEditing(pack, input);
    if (!publish.publishReady) {
      for (const r of publish.reasons || []) {
        if (r.includes("repetition") || r.includes("duplicate")) reasons.add("repetition");
        if (r.includes("fiction")) reasons.add("fiction");
        if (r.includes("low")) reasons.add("low_information");
      }
    }
  }

  const correction = analyzeHumanCorrection(beforePlain, afterPlain);
  if (correction.changed) {
    for (const d of correction.deltas) {
      if (d.type === "ad_removed") reasons.add("too_ad");
      if (d.type === "info_added") reasons.add("low_information");
      if (d.type === "repetition_removed") reasons.add("repetition");
    }
  }

  const behavior = interpretContentBehavior(events, feedback);
  if (behavior.metrics.rewrites >= 2) reasons.add("regenerate");
  if (behavior.metrics.deletes > 0) reasons.add("delete");

  const labeled = [...reasons].map((id) => ({
    id,
    label: FAILURE_REASONS[id] || id,
  }));

  return {
    isFailure: labeled.length > 0,
    reasons: labeled,
    behavior,
    correction,
    copySuccess: assessCopySuccess(events),
  };
}

function buildFailureInsight(failure = {}) {
  return {
    insight_type: "generation_failure",
    payload: {
      message: "사용자 행동 기반 생성 실패 신호",
      version: SELF_EVOLUTION_VERSION,
      reasons: failure.reasons,
      action: failure.action,
      anonymous: true,
      suggestedAction: "engine_improvement",
    },
  };
}

async function upsertEvolutionInsight(db, insight) {
  if (!db || !insight?.insight_type) return { ok: false };
  try {
    const { error } = await db.from("global_quality_insights").insert({
      insight_type: insight.insight_type,
      payload: insight.payload || {},
      status: "pending",
    });
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

async function applyAutoBanPhrases(phrases = []) {
  if (!phrases.length || !isAutoEvolveFromFeedbackEnabled()) {
    return { ok: true, applied: 0, skipped: true };
  }
  const db = createServiceSupabase();
  if (!db) return { ok: false };
  const patch = buildEvolutionPatchFromInsight({
    insight_type: "auto_ban_phrase",
    payload: { phrases, message: "삭제율 90%+ 패턴 전역 금지" },
  });
  if (!patch) return { ok: true, applied: 0 };
  const save = await saveGlobalEngineRulesPatch(patch, db);
  await refreshEvolutionRulesCache(db);
  return { ok: save.ok, applied: phrases.length };
}

/**
 * 콘텐츠 이벤트 1건 → 실패·금지·학습 기록
 */
export async function runSelfEvolutionOnContentEvent(event = {}, ctx = {}) {
  const failure = detectGenerationFailure({
    eventType: event.event_type,
    feedback: ctx.feedback,
    pack: ctx.pack,
    input: ctx.input,
    events: ctx.events,
    beforePlain: ctx.beforePlain,
    afterPlain: ctx.afterPlain,
  });

  const result = {
    version: SELF_EVOLUTION_VERSION,
    failure,
    correctionBrief: formatHumanCorrectionBrief(failure.correction),
    copySuccess: failure.copySuccess,
  };

  if (!failure.isFailure && event.event_type !== "copy_all" && event.event_type !== "save") {
    return result;
  }

  const db = createServiceSupabase();
  if (db && failure.isFailure) {
    await upsertEvolutionInsight(
      db,
      buildFailureInsight({
        ...failure,
        action: event.event_type,
      })
    );
  }

  const text = ctx.afterPlain || ctx.beforePlain || "";
  const bannedHits = detectBannedPhrasesInText(text);
  if (bannedHits.length && (event.event_type === "delete" || event.event_type === "human_edit")) {
    const evalBan = evaluateAutoBanCandidates(
      bannedHits.map((h) => ({
        phrase: h.phrase,
        action: "delete",
        count: 1,
      }))
    );
    if (evalBan.globalBan.length) {
      result.autoBan = await applyAutoBanPhrases([
        ...evalBan.globalBan,
        ...AUTO_BAN_SEED_PHRASES.filter((p) => text.includes(p)),
      ]);
    }
  }

  return result;
}

/**
 * SELF EVOLUTION ENGINE — 주간(14일) 행동 분석
 */
export async function runWeeklySelfEvolutionAnalysis(db = null) {
  const client = db || createServiceSupabase();
  if (!client) return { ok: false, reason: "no_service_role" };

  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceIso = since.toISOString();

  const [evRes, fbRes, itemsRes] = await Promise.all([
    client
      .from("content_events")
      .select("content_item_id, event_type, meta, created_at")
      .gte("created_at", sinceIso)
      .limit(5000),
    client
      .from("content_feedback")
      .select("reaction, tags, intents")
      .gte("created_at", sinceIso)
      .limit(2000),
    client
      .from("content_items")
      .select("id, channel, title, quality_score")
      .gte("created_at", sinceIso)
      .limit(2000),
  ]);

  const events = evRes.data || [];
  const feedback = fbRes.data || [];
  const items = itemsRes.data || [];

  const copies = events.filter((e) => /copy|download/.test(e.event_type)).length;
  const saves = events.filter((e) => e.event_type === "save").length;
  const rewrites = events.filter((e) => e.event_type === "rewrite").length;
  const edits = events.filter((e) => e.event_type === "human_edit").length;
  const deletes = events.filter((e) => e.event_type === "delete").length;
  const dwell = events
    .map((e) => Number(e.meta?.dwell_seconds || 0))
    .filter((n) => n > 0);
  const avgDwell = dwell.length
    ? dwell.reduce((a, b) => a + b, 0) / dwell.length
    : 0;

  const bad = feedback.filter((f) => f.reaction === "bad").length;
  const community = rankCommunityContentSignals(items, events);

  const improvements = [];
  if (rewrites > copies * 0.5) improvements.push("반복 감소 · 정보성 증가");
  if (bad > feedback.length * 0.3) improvements.push("광고성 감소 · 브랜드 일치성 증가");
  if (avgDwell < 30) improvements.push("주제 커버리지 · 조사 깊이 증가");

  const metrics = {
    copyRate: copies + rewrites ? copies / (copies + rewrites) : 0,
    saveRate: items.length ? saves / items.length : 0,
    editRate: items.length ? edits / items.length : 0,
    regenRate: items.length ? rewrites / items.length : 0,
    deleteRate: items.length ? deletes / items.length : 0,
    avgDwellSeconds: Math.round(avgDwell),
    badFeedbackRate: feedback.length ? bad / feedback.length : 0,
  };

  const insight = {
    insight_type: "self_evolution_weekly",
    payload: {
      version: SELF_EVOLUTION_VERSION,
      message: "주간 자가 진화 분석",
      metrics,
      improvements,
      communityTop: community.top.slice(0, 5),
      anonymous: true,
    },
  };

  await upsertEvolutionInsight(client, insight);

  if (community.top.length) {
    await upsertEvolutionInsight(client, {
      insight_type: "community_signal",
      payload: {
        message: "상위 5% 성공 콘텐츠 구조",
        structures: community.structures,
        anonymous: true,
      },
    });
  }

  return {
    ok: true,
    version: SELF_EVOLUTION_VERSION,
    metrics,
    improvements,
    community,
    minInfoUnits: MIN_BODY_INFORMATION_UNITS,
  };
}

/** FINAL QUESTION — core engine 위임 */
export { assessPublishWithoutEditing as assessFinalPublishQuestion };
