/**
 * BRICLOG Tri-AI Fast Pipeline — 전 채널 30초 SLA
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isGeminiConfigured } from "@/lib/content/contentIntelligenceV12";
import { getQualityTarget } from "@/lib/quality/qualityDefaults";
import {
  isLaunchPublishFirstMode,
  getLaunchPublishTimeBudgetMs,
  getLaunchPublishMaxAttempts,
  LAUNCH_PUBLISH_CLIENT_FETCH_MS,
} from "@/lib/config/launchPublishFlags";
import {
  getDefaultClientFetchMs,
  getAsyncBlogPollDeadlineMs,
  getCustomerBlogSlaMs,
  getDefaultGenerationBudgetMs,
  getDefaultLlmLoopBudgetMs,
  getDefaultLaunchNaverMaxQueries,
  getDefaultLaunchResearchTimeoutMs,
} from "@/lib/config/briclogDefaults";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";
import { getBlogOrchestratorWriteMaxTokens, getChannelTokenBudget } from "@/lib/config/channelTokenBudget";

/** 고객 약속 — 블로그+플레이스+인스타 전체 (ms) */
export const CUSTOMER_CHANNEL_SLA_MS = 30_000;

/** 고객 약속 2분 — 조사+글 합산 SLA (RESET·Fast 기본) */
export function isCustomerTwoMinuteSlaMode() {
  if (isBriclogMaxQualityEnabled()) return false;
  if (process.env.BRICLOG_TWO_MIN_SLA === "false") return false;
  if (!isBriclogFastPipelineEnabled()) return false;
  return getCustomerBlogSlaMs() <= 120_000;
}

/** 조사 단계 예산 — 2분 SLA에서 글 생성 여유 확보 */
export function getCustomerResearchBudgetMs(input = null) {
  if (isLaunchPublishFirstMode() && !isTriAiResearchMaxMode()) {
    return getLaunchResearchTimeoutMs();
  }
  if (input && isClientResearchPreVerified(input)) {
    return getResearchClientTimeoutMs(input);
  }
  if (isCustomerTwoMinuteSlaMode()) {
    const n = Number(process.env.BRICLOG_RESEARCH_BUDGET_MS);
    if (Number.isFinite(n) && n > 0) return n;
    return 45_000;
  }
  return getResearchClientTimeoutMs(input);
}

export function getColumnistSlaGenerationBudgetMs() {
  if (!isCustomerTwoMinuteSlaMode()) return getGenerationTimeBudgetMs();
  const total = getCustomerBlogSlaMs();
  const research = getCustomerResearchBudgetMs();
  return Math.max(45_000, total - research - 8_000);
}

export function shouldSkipV3PreWriteForSla() {
  return isCustomerTwoMinuteSlaMode();
}

export function shouldSkipResearchDepthCascadeForSla() {
  return isCustomerTwoMinuteSlaMode();
}

export function shouldSkipSupplementalResearchForSla(input = {}) {
  if (!isCustomerTwoMinuteSlaMode()) return false;
  if (isClientResearchPreVerified(input)) return true;
  return researchFactCount(input) >= 3;
}

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
  if (isLaunchPublishFirstMode() && !isTriAiResearchMaxMode()) {
    return getDefaultLaunchNaverMaxQueries();
  }
  if (isCustomerTwoMinuteSlaMode()) {
    const n = Number(process.env.BRICLOG_NAVER_MAX_QUERIES_SLA);
    return Number.isFinite(n) && n > 0 ? n : 2;
  }
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
  if (isLaunchPublishFirstMode()) return getLaunchPublishMaxAttempts();
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_LLM_MAX_REWRITES);
    return Number.isFinite(n) && n >= 1 ? Math.min(4, n) : 3;
  }
  if (!isBriclogFastPipelineEnabled()) return 2;
  const n = Number(process.env.BRICLOG_LLM_MAX_REWRITES);
  const base = Number.isFinite(n) && n >= 1 ? Math.min(2, n) : 1;
  if (isGpt55WriterDominant() && process.env.BRICLOG_WRITER_FIRST !== "false") {
    return 1;
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
  const slaMs = getCustomerBlogSlaMs();
  const customerMargin = isCustomerTwoMinuteSlaMode() ? 10_000 : 45_000;
  if (isLaunchPublishFirstMode()) {
    const forced = Number(process.env.BRICLOG_BLOG_CLIENT_FETCH_MS);
    if (Number.isFinite(forced) && forced > 0) return forced;
    if (isCustomerTwoMinuteSlaMode()) {
      return Math.max(LAUNCH_PUBLISH_CLIENT_FETCH_MS, slaMs + customerMargin);
    }
    return LAUNCH_PUBLISH_CLIENT_FETCH_MS;
  }
  const forced = Number(process.env.BRICLOG_BLOG_CLIENT_FETCH_MS);
  if (Number.isFinite(forced) && forced > 0) return forced;
  if (isGpt55WriterDominant()) {
    return Math.max(
      getGenerationTimeBudgetMs() + 15_000,
      getDefaultClientFetchMs(),
      slaMs + customerMargin
    );
  }
  return Math.max(getAllChannelSlaBudgetMs() + 2_000, getDefaultClientFetchMs(), slaMs);
}

/** 프로브·배치 — 고객 SLA + 소량 여유 */
export function getBlogGenerationProbeTimeoutMs() {
  const n = Number(process.env.BRICLOG_BLOG_PROBE_TIMEOUT_MS);
  if (Number.isFinite(n) && n > 0) return n;
  return getCustomerBlogSlaMs() + 15_000;
}

/** 연속 prod 배치 간격 (rate limit·quota 완화) */
export function getProbeBatchGapMs() {
  const n = Number(process.env.PROBE_BATCH_GAP_MS);
  if (Number.isFinite(n) && n >= 0) return n;
  return 20_000;
}

/** OpenAI 429 rate limit — SLA 재시도 전 대기 */
export function getOpenAiRateLimitRetryDelayMs() {
  const n = Number(process.env.BRICLOG_OPENAI_RATE_LIMIT_DELAY_MS);
  if (Number.isFinite(n) && n >= 0) return n;
  return 2_500;
}

/** 조사+3축 준비됐을 때 orchestrator 생략 → columnist 1회 (~90s) */
export function shouldUseColumnistFirstFastPath(input = {}) {
  if (process.env.BRICLOG_COLUMNIST_FIRST === "false") return false;
  if (isBriclogMaxQualityEnabled()) return false;
  if (!isBriclogFastPipelineEnabled()) return false;
  if (input.regenDeliveryPolish || input.forceColumnistSovereignFresh) return false;
  return Boolean(input.v2ResearchReady || input.v2PreWriteVerified);
}

/** Columnist fast — LLM 1회, 벤치 재시도 생략 (2분 SLA) */
export function isColumnistFastDeliveryEnabled() {
  if (process.env.BRICLOG_COLUMNIST_FAST === "false") return false;
  if (isBriclogMaxQualityEnabled()) return false;
  return isBriclogFastPipelineEnabled();
}

/** 2분 SLA — 칼럼니스트 1회 토큰 상한 (channelTokenBudget SSOT) */
export function getColumnistFastMaxTokens() {
  const legacy = Number(process.env.BRICLOG_COLUMNIST_FAST_MAX_TOKENS);
  if (Number.isFinite(legacy) && legacy > 0) return Math.floor(legacy);
  if (!isColumnistFastDeliveryEnabled()) {
    return getChannelTokenBudget("blog", "columnistSlow");
  }
  return getChannelTokenBudget("blog", "columnistFast");
}

/** 칼럼니스트 1회 generate 호출당 OpenAI 라운드 상한 (비용·SLA) */
export function getColumnistMaxLlmRounds(input = {}) {
  const override = Number(input.columnistMaxLlmRounds);
  if (Number.isFinite(override) && override >= 1) {
    return Math.min(Math.floor(override), 3);
  }
  const env = Number(process.env.BRICLOG_COLUMNIST_MAX_LLM_ROUNDS);
  if (Number.isFinite(env) && env >= 1) return Math.min(Math.floor(env), 3);
  if (isCustomerTwoMinuteSlaMode()) return 2;
  if (isColumnistFastDeliveryEnabled()) return 2;
  return 3;
}

/** 2분 SLA — fast 실패 시 API 재시도 (기본 0 = 1~2분 UX) */
export function getColumnistSlaApiRetries() {
  const n = Number(process.env.BRICLOG_COLUMNIST_SLA_API_RETRIES);
  if (Number.isFinite(n) && n >= 0) return Math.min(Math.floor(n), 2);
  return 0;
}

/** 2min SLA slow columnist — opt-in only (기본 off, 2분 초과 방지) */
export function shouldUseColumnistSlaSlowFallback() {
  if (process.env.BRICLOG_COLUMNIST_SLA_SLOW_FALLBACK !== "true") return false;
  return isCustomerTwoMinuteSlaMode();
}

/** 브라우저에서 서버가 이미 writer/columnist 처리한 팩 — 중복 LLM·지연 방지 */
export function shouldSkipClientWriterEnginePass(partial = {}, pack = null) {
  if (typeof window === "undefined") return false;
  const meta = partial?.meta || {};
  if (
    meta.serverVerifiedSkipClientReverify ||
    meta.fastPipelineDelivery ||
    meta.columnistSovereign ||
    meta.clientPostVerifySkipped
  ) {
    return true;
  }
  const pm = pack?._meta || {};
  return Boolean(pm.columnistSovereignLlm || pm.visitReviewSovereignLlm);
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
  if (isLaunchPublishFirstMode()) return getLaunchPublishTimeBudgetMs();
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_GENERATION_BUDGET_MS);
    return Number.isFinite(n) && n > 0 ? n : getDefaultGenerationBudgetMs();
  }
  if (!isBriclogFastPipelineEnabled()) return 60_000;
  const n = Number(process.env.BRICLOG_GENERATION_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : 26_000;
}

export function getLlmLoopBudgetMs() {
  if (isLaunchPublishFirstMode()) return getLaunchPublishTimeBudgetMs();
  if (isBriclogMaxQualityEnabled()) {
    const n = Number(process.env.BRICLOG_LLM_LOOP_BUDGET_MS);
    return Number.isFinite(n) && n > 0 ? n : getDefaultLlmLoopBudgetMs();
  }
  if (!isBriclogFastPipelineEnabled()) return 50_000;
  const n = Number(process.env.BRICLOG_LLM_LOOP_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : 22_000;
}

/** Launch 모드 서버 축 조사 타임아웃 */
export function getLaunchResearchTimeoutMs() {
  return getDefaultLaunchResearchTimeoutMs();
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
  return getBlogOrchestratorWriteMaxTokens(tier, false);
}

export const BRICLOG_FAST_PIPELINE_BRIEF = `【BRICLOG · Tri-AI】
Naver=재료 | Gemini=조사 | GPT=본문 1회. 조사 부족 시 작성 금지. SEO는 결과.`;
