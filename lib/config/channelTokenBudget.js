/**
 * 채널별 OpenAI completion 토큰 예산 SSOT
 * blog에 집중 · place/instagram·조사 축소 · env로 채널별 덮어쓰기
 */
import { usesMaxCompletionTokens, OPENAI_WRITER_MODEL } from "@/lib/llm/openaiCompletionParams";
import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";
import { isBriclogFastPipelineEnabled } from "@/lib/config/briclogFastPipeline";

export const CHANNEL_TOKEN_BUDGET_VERSION = "channel-token-v1";

const BUDGETS = Object.freeze({
  blog: Object.freeze({
    columnistFast: 2400,
    columnistSlow: 5200,
    columnistRetryBump: 280,
    columnistBenchRetry: 4800,
    orchestratorShort: 2600,
    orchestratorMedium: 2800,
    orchestratorLong: 3400,
    orchestratorSensitive: 3200,
    qualityReview: 1200,
  }),
  place: Object.freeze({ standalone: 1500, derived: 0 }),
  instagram: Object.freeze({ standalone: 1300, derived: 0 }),
  research: Object.freeze({ synthesisSla: 960, synthesisFull: 1280, expandSla: 1400, expandFull: 2200 }),
});

function readChannelEnv(channel, key, fallback) {
  const envKey = `BRICLOG_${String(channel).toUpperCase()}_${String(key)
    .replace(/([A-Z])/g, "_$1")
    .toUpperCase()}_TOKENS`;
  const n = Number(process.env[envKey]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * @param {"blog"|"place"|"instagram"|"research"} channel
 * @param {string} facet
 */
export function getChannelTokenBudget(channel, facet) {
  const base = BUDGETS[channel]?.[facet];
  if (base == null) return 0;
  return readChannelEnv(channel, facet, base);
}

/** Columnist fast/slow — input.columnistForceSlow · columnistFastDelivery */
export function resolveColumnistCompletionTokens(input = {}, opts = {}) {
  const fast =
    !input.columnistForceSlow &&
    (opts.fast ??
      (Boolean(input.columnistFastDelivery) ||
        (isBriclogFastPipelineEnabled() && !isBriclogMaxQualityEnabled())));
  if (fast) return getChannelTokenBudget("blog", "columnistFast");
  return getChannelTokenBudget("blog", "columnistSlow");
}

/** Columnist tier-retry bump (fast path only) */
export function resolveColumnistRetryMaxTokens(baseTokens, round = 2) {
  if (round <= 1) return baseTokens;
  const bump = getChannelTokenBudget("blog", "columnistRetryBump");
  return Math.min(baseTokens + bump, getChannelTokenBudget("blog", "columnistFast") + 600);
}

export function getBlogOrchestratorWriteMaxTokens(tier = "medium", sensitive = false) {
  if (sensitive) return getChannelTokenBudget("blog", "orchestratorSensitive");
  let base;
  if (isBriclogMaxQualityEnabled()) {
    if (tier === "short") base = 3600;
    else if (tier === "long") base = 4800;
    else base = 4400;
  } else if (!isBriclogFastPipelineEnabled()) {
    base = tier === "short" ? 2800 : 3400;
  } else if (tier === "short") {
    base = getChannelTokenBudget("blog", "orchestratorShort");
  } else if (tier === "long") {
    base = getChannelTokenBudget("blog", "orchestratorLong");
  } else {
    base = getChannelTokenBudget("blog", "orchestratorMedium");
  }
  if (usesMaxCompletionTokens(OPENAI_WRITER_MODEL)) {
    const headroom = tier === "short" ? 3600 : tier === "long" ? 4200 : 3800;
    return base + headroom;
  }
  return base;
}

export function getPlaceChannelMaxTokens({ derived = false } = {}) {
  return derived
    ? getChannelTokenBudget("place", "derived")
    : getChannelTokenBudget("place", "standalone");
}

export function getInstagramChannelMaxTokens({ derived = false } = {}) {
  return derived
    ? getChannelTokenBudget("instagram", "derived")
    : getChannelTokenBudget("instagram", "standalone");
}

export function getResearchSynthesisMaxTokens(sla = false) {
  return sla
    ? getChannelTokenBudget("research", "synthesisSla")
    : getChannelTokenBudget("research", "synthesisFull");
}

export function summarizeChannelTokenBudgets() {
  return {
    version: CHANNEL_TOKEN_BUDGET_VERSION,
    blog: BUDGETS.blog,
    place: BUDGETS.place,
    instagram: BUDGETS.instagram,
    research: BUDGETS.research,
  };
}
