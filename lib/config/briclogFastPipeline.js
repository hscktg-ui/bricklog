/**
 * BRICLOG Tri-AI Fast Pipeline
 * 네이버(재료) → 제미나이(조사·의도) → GPT(작성 1회) → 로컬(분량·검수)
 * Max Quality ON 시 slow path · BRICLOG_FAST_PIPELINE=false 로만 끔
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isGeminiConfigured } from "@/lib/content/contentIntelligenceV12";
import { getQualityTarget } from "@/lib/quality/qualityDefaults";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";

export function isBriclogFastPipelineEnabled() {
  if (isBriclogMaxQualityEnabled()) return false;
  return process.env.BRICLOG_FAST_PIPELINE !== "false";
}

/** 클라이언트 조사·검증 완료 — 서버 depth·Naver 축소 */
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

/** depth cascade — 충분한 팩트·클라이언트 검증 시 0라운드 */
export function resolveResearchDepthMaxRounds(input = {}, topicIsModelLike = false) {
  if (isClientResearchPreVerified(input)) return 0;
  if (researchFactCount(input) >= 8) return 0;
  let rounds = getResearchDepthMaxRounds(topicIsModelLike);
  const tier = String(input?.blogLengthTier || "medium").toLowerCase();
  if (tier === "long") rounds += 2;
  else if (tier === "medium") rounds += 1;
  return rounds;
}

/** GPT-5.5 지배 시 조사 최대 — Max Quality 또는 명시 env 시만 */
export function isTriAiResearchMaxMode() {
  if (isBriclogMaxQualityEnabled()) return true;
  if (process.env.BRICLOG_TRI_AI_RESEARCH_MAX === "true") return true;
  if (process.env.BRICLOG_TRI_AI_RESEARCH_MAX === "false") return false;
  return false;
}

/** 조사 JSON 합성 — Gemini 전담 (GPT는 작성만) */
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
    return isTriAiResearchMaxMode() ? 8 : 4;
  }
  if (isTriAiResearchMaxMode()) {
    const n = Number(process.env.BRICLOG_NAVER_MAX_QUERIES);
    if (Number.isFinite(n) && n > 0) return n;
    return isBriclogMaxQualityEnabled() ? 16 : 12;
  }
  if (isBriclogMissionEnforced() && isBriclogFastPipelineEnabled()) {
    const n = Number(process.env.BRICLOG_NAVER_MAX_QUERIES);
    return Number.isFinite(n) && n > 0 ? n : 4;
  }
  if (!isBriclogFastPipelineEnabled()) {
    return Number(process.env.BRICLOG_SEARCH_EXPANSION_MAX_QUERIES) || 10;
  }
  const n = Number(process.env.BRICLOG_NAVER_MAX_QUERIES);
  return Number.isFinite(n) && n > 0 ? n : 4;
}

export function getResearchDepthMaxRounds(topicIsModelLike = false) {
  if (isBriclogMaxQualityEnabled()) {
    return topicIsModelLike ? 3 : 2;
  }
  if (isTriAiResearchMaxMode()) {
    return topicIsModelLike ? 2 : 2;
  }
  if (isBriclogMissionEnforced() && isBriclogFastPipelineEnabled()) {
    return topicIsModelLike ? 1 : 0;
  }
  if (!isBriclogFastPipelineEnabled()) {
    return topicIsModelLike ? 2 : 1;
  }
  return 0;
}

export function shouldSkipModelTopicExtraResearch() {
  if (isTriAiResearchMaxMode()) return false;
  return isBriclogFastPipelineEnabled();
}

export function getCoreMaxRewrites() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_LLM_MAX_REWRITES);
    return Number.isFinite(n) && n >= 1 ? Math.min(6, n) : 5;
  }
  if (!isBriclogFastPipelineEnabled()) return 3;
  const n = Number(process.env.BRICLOG_LLM_MAX_REWRITES);
  return Number.isFinite(n) && n >= 1 ? Math.min(4, n) : 3;
}

export function isChannelPackDeferred() {
  if (isBriclogMaxQualityEnabled()) return false;
  if (!isBriclogFastPipelineEnabled()) return false;
  return process.env.BRICLOG_CHANNEL_PACK_DEFER !== "false";
}

export function getLocalFinishMaxMs() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_LOCAL_FINISH_MS);
    return Number.isFinite(n) && n > 0 ? n : 35_000;
  }
  if (isBriclogMissionEnforced() && isBriclogFastPipelineEnabled()) {
    const n = Number(process.env.BRICLOG_LOCAL_FINISH_MS);
    return Number.isFinite(n) && n > 0 ? n : 14_000;
  }
  if (!isBriclogFastPipelineEnabled()) return 30_000;
  const n = Number(process.env.BRICLOG_LOCAL_FINISH_MS);
  return Number.isFinite(n) && n > 0 ? n : 8_000;
}

export function getStrictLengthMaxAttempts() {
  if (isBriclogMaxQualityEnabled()) return 20;
  return isBriclogFastPipelineEnabled() ? 3 : 20;
}

export function getGenerationTimeBudgetMs() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_GENERATION_BUDGET_MS);
    return Number.isFinite(n) && n > 0 ? n : 120_000;
  }
  if (!isBriclogFastPipelineEnabled()) return 90_000;
  const n = Number(process.env.BRICLOG_GENERATION_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : 72_000;
}

export function getLlmLoopBudgetMs() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_LLM_LOOP_BUDGET_MS);
    return Number.isFinite(n) && n > 0 ? n : 120_000;
  }
  if (!isBriclogFastPipelineEnabled()) return 90_000;
  const n = Number(process.env.BRICLOG_LLM_LOOP_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : 55_000;
}

/** GPT human-tier expansion pass — Max Quality·Mission 시 ON (GPT-5.5 포함) */
export function isWriterEngineExpansionEnabled() {
  if (process.env.BRICLOG_WRITER_ENGINE === "false") return false;
  if (isBriclogMaxQualityEnabled()) return true;
  if (isGpt55WriterDominant()) {
    return process.env.BRICLOG_WRITER_ENGINE === "true";
  }
  return isBriclogMissionEnforced();
}

/** GPT 작성 프롬프트 — Max Quality 시 full EQS/master-quality block */
export function isSlimWriterPromptEnabled() {
  if (isBriclogMaxQualityEnabled()) return false;
  if (isGpt55WriterDominant()) return true;
  if (process.env.BRICLOG_SLIM_WRITER_PROMPT === "false") return false;
  return isBriclogFastPipelineEnabled();
}

/** LLM 초안 문장 prune — 기본 OFF (후처리로 voice 손상 방지) */
export function shouldSkipOffAxisPrune() {
  if (process.env.BRICLOG_PRUNE_OFF_AXIS === "true") return false;
  return isBriclogFastPipelineEnabled();
}

/** 플레이스·인스타·썸네일 — Max Quality 시 블로그와 동일 깊이 */
export function isChannelStandaloneFastEnabled() {
  if (isBriclogMaxQualityEnabled()) return false;
  if (process.env.BRICLOG_CHANNEL_STANDALONE_FAST === "false") return false;
  return isBriclogFastPipelineEnabled();
}

export function getChannelLlmLoopBudgetMs() {
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_CHANNEL_LLM_LOOP_MS);
    return Number.isFinite(n) && n > 0 ? n : 60_000;
  }
  if (!isBriclogFastPipelineEnabled()) return 45_000;
  const n = Number(process.env.BRICLOG_CHANNEL_LLM_LOOP_MS);
  return Number.isFinite(n) && n > 0 ? n : 28_000;
}

/** 클라이언트 /api/content/channel fetch — Vercel route maxDuration=300과 정렬 */
export function getChannelClientFetchTimeoutMs(input = {}) {
  const forced = Number(process.env.BRICLOG_CHANNEL_CLIENT_FETCH_MS);
  if (Number.isFinite(forced) && forced > 0) return forced;
  const routeBudgetMs = 295_000;
  if (isChannelStandaloneFastInput(input)) {
    const fastBudget = getChannelLlmLoopBudgetMs() + 62_000;
    return Math.max(fastBudget, routeBudgetMs);
  }
  return routeBudgetMs;
}

export function shouldSkipChannelSupplementalResearch(input = null) {
  if (input?.channelStandaloneFast === true) return true;
  return isChannelStandaloneFastEnabled();
}

export function getChannelSoftPassFloor() {
  return Math.max(85, getQualityTarget() - 8);
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
  if (isBriclogMaxQualityEnabled()) return 60_000;
  if (isTriAiResearchMaxMode()) return preVerified ? 28_000 : 45_000;
  if (isBriclogMissionEnforced() && isBriclogFastPipelineEnabled()) return 24_000;
  return isBriclogFastPipelineEnabled() ? 18_000 : 45_000;
}

export function getChannelPackDeadlineMs() {
  if (isChannelPackDeferred()) return Number.MAX_SAFE_INTEGER;
  return isBriclogMaxQualityEnabled() ? 120_000 : 78_000;
}

export function getBlogWriteMaxTokens(tier = "medium") {
  if (isBriclogMaxQualityEnabled()) {
    if (tier === "short") return 4200;
    if (tier === "long") return 5600;
    return 5200;
  }
  if (!isBriclogFastPipelineEnabled()) {
    return tier === "short" ? 3200 : 3800;
  }
  if (tier === "short") return 3400;
  if (tier === "long") return 4800;
  return 4400;
}

export const BRICLOG_FAST_PIPELINE_BRIEF = `【BRICLOG · Tri-AI】
Naver=지역·한국 검색 재료 | Gemini=조사·팩트·고객질문 | GPT=본문 1회 | Memory=브랜드 유지.
조사 부족 시 작성 금지. 정보량 없이 글자수 맞추기 금지. SEO는 결과이지 목표가 아님.`;
