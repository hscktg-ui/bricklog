import { createServiceSupabase } from "@/lib/supabase/server";
import { aggregateGlobalInsightCandidates } from "@/lib/feedback/globalInsights";
import { buildEvolutionPatchFromInsight } from "@/lib/evolution-lab/insightToRules";
import {
  loadGlobalEngineRulesFromDb,
  saveGlobalEngineRulesPatch,
} from "@/lib/evolution-lab/globalEngineRulesDb";
import { refreshEvolutionRulesCache } from "@/lib/evolution-lab/rulesStore";
import { isAutoEvolveFromFeedbackEnabled } from "@/lib/config/engineEvolutionFlags";
import { interpretContentBehavior } from "@/lib/feedback/behaviorInterpretationEngine";
import {
  detectGenerationFailure,
  SELF_EVOLUTION_VERSION,
} from "@/lib/evolution/selfEvolutionCore";
import { insightsFromFeedbackIntents } from "@/lib/feedback/feedbackIntentEngine";

const TAG_INSIGHT_MAP = [
  {
    tags: ["too_ai", "gpt_tone"],
    insight: {
      insight_type: "ai_cliche_threshold",
      payload: { message: "사용자 피드백 — AI/GPT 톤 지적" },
    },
  },
  {
    tags: ["too_ad"],
    insight: {
      insight_type: "ad_tone_guard",
      payload: { message: "사용자 피드백 — 광고 톤 지적" },
    },
  },
  {
    tags: ["repeat"],
    insight: {
      insight_type: "repetition_guard",
      payload: { message: "사용자 피드백 — 반복 문장" },
    },
  },
  {
    tags: ["brand_weak"],
    insight: {
      insight_type: "brand_voice",
      payload: { message: "사용자 피드백 — 브랜드 톤 약함" },
    },
  },
  {
    tags: ["low_info", "too_weak"],
    insight: {
      insight_type: "information_density",
      payload: { message: "사용자 피드백 — 정보·현장감 부족" },
    },
  },
  {
    tags: ["seo_weak"],
    insight: {
      insight_type: "search_intent",
      payload: { message: "사용자 피드백 — 검색 의도·현장감 약함" },
    },
  },
  {
    tags: ["length_wrong"],
    insight: {
      insight_type: "density_over_length",
      payload: { message: "사용자 피드백 — 분량보다 정보 밀도" },
    },
  },
];

function immediateInsightsFromFeedback(feedback = {}) {
  const tags = new Set(feedback.tags || []);
  const out = [];
  const seen = new Set();
  const push = (insight) => {
    if (!insight?.insight_type || seen.has(insight.insight_type)) return;
    seen.add(insight.insight_type);
    out.push(insight);
  };

  for (const row of TAG_INSIGHT_MAP) {
    if (row.tags.some((t) => tags.has(t))) push(row.insight);
  }
  for (const insight of insightsFromFeedbackIntents(feedback.intents || [])) {
    push(insight);
  }
  if (feedback.reaction === "bad" && tags.has("low_info")) {
    push({
      insight_type: "rewrite_vs_copy",
      payload: { message: "사용자 피드백 — 정보·현장감 부족" },
    });
  }
  return out;
}

/**
 * 피드백 1건 → DB 전역 규칙 패치 (브랜드 학습과 별도)
 */
export async function applyFeedbackToGlobalEngine(feedback = {}) {
  if (!isAutoEvolveFromFeedbackEnabled()) {
    return { ok: true, skipped: true, reason: "auto_evolve_off" };
  }

  const db = createServiceSupabase();
  if (!db) return { ok: false, reason: "no_service_role" };

  const insights = immediateInsightsFromFeedback(feedback);
  if (!insights.length) {
    return { ok: true, applied: 0, reason: "no_matching_tags" };
  }

  let applied = 0;
  for (const insight of insights) {
    const patch = buildEvolutionPatchFromInsight(insight);
    if (!patch) continue;
    const save = await saveGlobalEngineRulesPatch(patch, db);
    if (save.ok) applied += save.saved?.length || 0;
    else if (save.reason === "tables_missing") {
      return { ok: false, reason: "tables_missing" };
    }
  }

  await refreshEvolutionRulesCache(db);
  return { ok: true, applied, insights: insights.length };
}

/**
 * 피드백 저장 직후 — 즉시 패치 + 집계 인사이트 후보
 */
export async function runFeedbackEngineLoop(feedback = {}, events = []) {
  const behavior = interpretContentBehavior(events, feedback);
  const failure = detectGenerationFailure({
    eventType: feedback.reaction === "good" ? "" : "rewrite",
    feedback,
    events,
  });
  const immediate = await applyFeedbackToGlobalEngine(feedback);
  const aggregate = await aggregateGlobalInsightCandidates();
  return {
    immediate,
    aggregate,
    behavior,
    selfEvolution: {
      version: SELF_EVOLUTION_VERSION,
      failure,
    },
  };
}

/** 생성 API cold start — DB 규칙 캐시 */
export async function hydrateGlobalEngineForGeneration() {
  const db = createServiceSupabase();
  if (!db) return { ok: false };
  await refreshEvolutionRulesCache(db);
  return { ok: true };
}

export async function peekGlobalEngineRules() {
  const db = createServiceSupabase();
  if (!db) return null;
  return loadGlobalEngineRulesFromDb(db);
}
