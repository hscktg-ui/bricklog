/**
 * BRICLOG Tri-AI Fast Pipeline — 전 채널 30초 SLA
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isGeminiConfigured } from "@/lib/content/contentIntelligenceV12";
import { getQualityTarget } from "@/lib/quality/qualityDefaults";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";

/** 고객 약속 — 블로그+플레이스+인스타 전체 (ms) */
export const CUSTOMER_CHANNEL_SLA_MS = 30_000;

/** 클라이언트 축 조사 완료 플래그 (v2PipelineGate 와 동일 조건) */
export function isClientAxisResearchComplete(input = {}) {
  return Boolean(
    input.v2ResearchReady &&
      input.v2PreWriteVerified &&
      (input.v2PipelineStage === "information_research_verified" ||
        input.v2AxisVerified)
  );
}

/** Fast — 조사·작성을 /api/content/blog 1회로 (클라이언트 조사 중복 제거) */
export function shouldSkipClientAxisResearch(input = {}) {
  if (!isBriclogFastPipelineEnabled()) return false;
  if (input.regenReuseResearch || input.serverAxisResearchOnly === false) return false;
  if (input.channelDeriveExempt) return false;
  if (isClientResearchPreVerified(input) || isClientAxisResearchComplete(input)) {
    return false;
  }
  return true;
}

/** Fast — 서버 검증 pack 은 클라이언트 postVerify 생략 */
export function shouldFastPipelineSkipClientPostVerify(partial = {}, blog = null) {
  if (!isBriclogFastPipelineEnabled()) return false;
  if (partial?.meta?.serverVerifiedSkipClientReverify) return true;
  if (partial?.meta?.fastPipelineDelivery) return true;
  return Boolean(blog?.sections?.length >= 2 && partial?.meta?.v2PipelineVerified);
}

export function isBriclogFastPipelineEnabled() {
  if (isBriclogMaxQualityEnabled()) return false;
  return process.env.BRICLOG_FAST_PIPELINE !== "false";
}

export function isClientResearchPreVerified(input = {}) {
  return Boolean(
    input?.v2ResearchReady &&
      input?.v2PreWriteVerified &&
      (input?.v2PipelineStage === "information_research_verified" ||
        input?.v2AxisVerified)
  );
}

function researchFactCount(input = {}) {
  const n = input?.researchFactCount ?? input?.researchFacts?.length;
  return Number.isFinite(n) ? n : 0;
}

export function resolveResearchDepthMaxRounds(input = {}, topicIsModelLike = false) {
  if (isClientResearchPreVerified(input)) return 0;
  if (researchFactCount(input) >= 6) return 0;
  if (isBriclogFastPipelineEnabled()) return 0;
  let rounds = getResearchDepthMaxRounds(topicIsModelLike);
  const tier = String(input?.blogLengthTier || "medium").toLowerCase();
  if (tier === "long") rounds += 1;
  return rounds;
}

export function isTriAiResearchMaxMode() {
  if (isBriclogMaxQualityEnabled()) return true;
  if (process.env.BRICLOG_TRI_AI_RESEARCH_MAX === "true") return true;
  if (process.env.BRICLOG_TRI_AI_RESEARCH_MAX === "false") return false;
  return false;
}

export function useGeminiResearchProvider() {
  const forced = String(process.env.BRICLOG_RESEARCH_PROVIDER || "")
    .trim()
    .toLowerCase();
  if (forced === "openai") return false;
  if (forced === "gemini") return isGeminiConfigured();
  return isGeminiConfigured();
}

export function getNaverMaxQueries(input = null) {
  const preVerified = input && isClientResearchPreVerified(input);
  if (preVerified) {
    const verifiedCap = Number(process.env.BRICLOG_NAVER_MAX_QUERIES_VERIFIED);
    if (Number.isFinite(verifiedCap) && verifiedCap > 0) return verifiedCap;
    return 2;
  }
  if (isTriAiResearchMaxMode()) {
    const n = Number(process.env.BRICLOG_NAVER_MAX_QUERIES);
    if (Number.isFinite(n) && n > 0) return n;
    return isBriclogMaxQualityEnabled() ? 12 : 3;
  }
  if (isBriclogMissionEnforced() && isBriclogFastPipelineEnabled()) {
    const n = Number(process.env.BRICLOG_NAVER_MAX_QUERIES);
    return Number.isFinite(n) && n > 0 ? n : 3;
  }
  if (!isBriclogFastPipelineEnabled()) {
    return Number(process.env.BRICLOG_SEARCH_EXPANSION_MAX_QUERIES) || 8;
  }
  const n = Number(process.env.BRICLOG_NAVER_MAX_QUERIES);
  return Number.isFinite(n) && n > 0 ? n : 3;
}

export function getResearchDepthMaxRounds(topicIsModelLike = false) {
  if (isBriclogMaxQualityEnabled()) {
    return topicIsModelLike ? 2 : 1;
  }
  if (isTriAiResearchMaxMode()) return topicIsModelLike ? 1 : 1;
  if (isBriclogMissionEnforced() && isBriclogFastPipelineEnabled()) return 0;
  if (!isBriclogFastPipelineEnabled()) return topicIsModelLike ? 1 : 0;
  return 0;
}

export function shouldSkipModelTopicExtraResearch() {
  if (isTriAiResearchMaxMode()) return false;
  return isBriclogFastPipelineEnabled();
}

export function getCoreMaxRewrites() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_LLM_MAX_REWRITES);
    return Number.isFinite(n) && n >= 1 ? Math.min(4, n) : 3;
  }
  if (!isBriclogFastPipelineEnabled()) return 2;
  const n = Number(process.env.BRICLOG_LLM_MAX_REWRITES);
  const base = Number.isFinite(n) && n >= 1 ? Math.min(2, n) : 1;
  if (isGpt55WriterDominant() && process.env.BRICLOG_WRITER_FIRST !== "false") {
    return Math.max(base, 2);
  }
  return base;
}

export function getAllChannelSlaBudgetMs() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_ALL_CHANNEL_SLA_MS);
    return Number.isFinite(n) && n > 0 ? n : 90_000;
  }
  if (!isBriclogFastPipelineEnabled()) return 60_000;
  const n = Number(process.env.BRICLOG_ALL_CHANNEL_SLA_MS);
  return Number.isFinite(n) && n > 0 ? n : CUSTOMER_CHANNEL_SLA_MS;
}

export function shouldUseDerivedChannelLocalOnly(
  input = {},
  channel = "",
  sourceBlog = null
) {
  if (isBriclogMaxQualityEnabled()) return false;
  if (!isBriclogFastPipelineEnabled()) return false;
  if (process.env.BRICLOG_DERIVED_CHANNEL_LOCAL_ONLY === "false") return false;
  if (!sourceBlog?.sections?.length) return false;
  const ch = String(channel || input.contentChannel || "").toLowerCase();
  return ch === "place" || ch === "instagram";
}

export function shouldSkipHeavyPostLlmExpansion() {
  if (isBriclogMaxQualityEnabled()) return false;
  if (!isBriclogFastPipelineEnabled()) return false;
  if (process.env.BRICLOG_HEAVY_POST_LLM === "true") return false;
  return true;
}

export function getBlogClientFetchTimeoutMs() {
  const forced = Number(process.env.BRICLOG_BLOG_CLIENT_FETCH_MS);
  if (Number.isFinite(forced) && forced > 0) return forced;
  return getAllChannelSlaBudgetMs() + 2_000;
}

export function isChannelPackDeferred() {
  if (isBriclogMaxQualityEnabled()) return false;
  if (!isBriclogFastPipelineEnabled()) return false;
  return process.env.BRICLOG_CHANNEL_PACK_DEFER !== "false";
}

export function getLocalFinishMaxMs() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_LOCAL_FINISH_MS);
    return Number.isFinite(n) && n > 0 ? n : 12_000;
  }
  if (!isBriclogFastPipelineEnabled()) return 8_000;
  const n = Number(process.env.BRICLOG_LOCAL_FINISH_MS);
  return Number.isFinite(n) && n > 0 ? n : 2_000;
}

export function getStrictLengthMaxAttempts() {
  if (isBriclogMaxQualityEnabled()) return 8;
  return isBriclogFastPipelineEnabled() ? 1 : 6;
}

export function getGenerationTimeBudgetMs() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_GENERATION_BUDGET_MS);
    return Number.isFinite(n) && n > 0 ? n : 90_000;
  }
  if (!isBriclogFastPipelineEnabled()) return 60_000;
  const n = Number(process.env.BRICLOG_GENERATION_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : 26_000;
}

export function getLlmLoopBudgetMs() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_LLM_LOOP_BUDGET_MS);
    return Number.isFinite(n) && n > 0 ? n : 90_000;
  }
  if (!isBriclogFastPipelineEnabled()) return 50_000;
  const n = Number(process.env.BRICLOG_LLM_LOOP_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : 22_000;
}

export function isWriterEngineExpansionEnabled() {
  if (process.env.BRICLOG_WRITER_ENGINE === "false") return false;
  if (isBriclogMaxQualityEnabled()) return true;
  return process.env.BRICLOG_WRITER_ENGINE === "true";
}

export function isSlimWriterPromptEnabled() {
  if (isBriclogMaxQualityEnabled()) return false;
  if (isGpt55WriterDominant()) return true;
  if (process.env.BRICLOG_SLIM_WRITER_PROMPT === "false") return false;
  return isBriclogFastPipelineEnabled();
}

export function shouldSkipOffAxisPrune() {
  if (process.env.BRICLOG_PRUNE_OFF_AXIS === "true") return false;
  return isBriclogFastPipelineEnabled();
}

export function isChannelStandaloneFastEnabled() {
  if (isBriclogMaxQualityEnabled()) return false;
  if (process.env.BRICLOG_CHANNEL_STANDALONE_FAST === "false") return false;
  return isBriclogFastPipelineEnabled();
}

export function getChannelLlmLoopBudgetMs() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_CHANNEL_LLM_LOOP_MS);
    return Number.isFinite(n) && n > 0 ? n : 45_000;
  }
  if (!isBriclogFastPipelineEnabled()) return 25_000;
  const n = Number(process.env.BRICLOG_CHANNEL_LLM_LOOP_MS);
  return Number.isFinite(n) && n > 0 ? n : 12_000;
}

export function getChannelClientFetchTimeoutMs(input = {}) {
  const forced = Number(process.env.BRICLOG_CHANNEL_CLIENT_FETCH_MS);
  if (Number.isFinite(forced) && forced > 0) return forced;
  if (isChannelStandaloneFastInput(input)) {
    return getChannelLlmLoopBudgetMs() + 6_000;
  }
  return getAllChannelSlaBudgetMs() + 2_000;
}

export function shouldSkipChannelSupplementalResearch(input = null) {
  if (input?.channelStandaloneFast === true) return true;
  return isChannelStandaloneFastEnabled();
}

export function getChannelSoftPassFloor() {
  return Math.max(95, getQualityTarget() - 5);
}

export function isChannelStandaloneFastInput(input = {}) {
  if (input.channelStandaloneFast === false) return false;
  if (input.channelStandaloneFast === true) return true;
  if (!isChannelStandaloneFastEnabled()) return false;
  const ch = String(input.contentChannel || "").toLowerCase();
  if (!["place", "instagram", "image"].includes(ch)) return false;
  return input.sourceChannel !== "blog" && !input._sourceBlogPack;
}

export function getResearchClientTimeoutMs(input = null) {
  const preVerified = input && isClientResearchPreVerified(input);
  if (isBriclogMaxQualityEnabled()) return 45_000;
  if (isTriAiResearchMaxMode()) return preVerified ? 12_000 : 20_000;
  if (preVerified) return 6_000;
  return isBriclogFastPipelineEnabled() ? 5_000 : 30_000;
}

export function getChannelPackDeadlineMs() {
  if (isChannelPackDeferred()) return Number.MAX_SAFE_INTEGER;
  return isBriclogMaxQualityEnabled()
    ? 90_000
    : Math.min(getAllChannelSlaBudgetMs(), 28_000);
}

export function getBlogWriteMaxTokens(tier = "medium") {
  if (isBriclogMaxQualityEnabled()) {
    if (tier === "short") return 3600;
    if (tier === "long") return 4800;
    return 4400;
  }
  if (!isBriclogFastPipelineEnabled()) {
    return tier === "short" ? 2800 : 3400;
  }
  if (tier === "short") return 2600;
  if (tier === "long") return 3600;
  return 3000;
}

export const BRICLOG_FAST_PIPELINE_BRIEF = `【BRICLOG · Tri-AI】
Naver=재료 | Gemini=조사 | GPT=본문 1회. 조사 부족 시 작성 금지. SEO는 결과.`;
