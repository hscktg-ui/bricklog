/**
 * BRICLOG Immutable Defaults — 제품·파이프라인·타이밍 SSOT
 *
 * 운영 기본값은 이 파일이 단일 진실 공급원입니다.
 * prod에서 env로 덮어쓰려면 BRICLOG_ALLOW_DEFAULT_OVERRIDE=1 필요.
 */
export const BRICLOG_DEFAULTS_VERSION = "briclog-defaults-v1";

/** @deprecated 직접 수정 금지 — PR에 defaults 버전 bump + test:briclog-defaults */
export const BRICLOG_PRODUCT = Object.freeze({
  identity: "Brand Content OS",
  tagline: "브랜드 블로그 운영 AI",
  northStarKpi: "이 글, 그대로 네이버에 붙여넣을 수 있나?",
  writerModel: "gpt-5.5",
  triAiStack: "Naver=재료 · Gemini=조사 · GPT=본문",
});

export const BRICLOG_PIPELINE_DEFAULTS = Object.freeze({
  launchPublishFirst: true,
  fastPipeline: true,
  gpt55WriterDominant: true,
  humanLikeDelivery: true,
  researchFirst: true,
  writerFirst: true,
  maxQuality: false,
  asyncBlogGeneration: true,
});

export const BRICLOG_TIMING_DEFAULTS = Object.freeze({
  /** 서버 LLM 루프 상한 */
  generationBudgetMs: 90_000,
  llmLoopBudgetMs: 85_000,
  /** 클라이언트 fetch — 서버 완료까지 여유 */
  clientFetchMs: 120_000,
  /** Launch publish-first */
  launchPublishBudgetMs: 75_000,
  launchClientFetchMs: 120_000,
  launchMaxAttempts: 1,
  launchNaverMaxQueries: 2,
  launchResearchTimeoutMs: 10_000,
  /** Async job — 고객 SLA 2분 */
  asyncPollIntervalMs: 2_000,
  asyncJobTtlMs: 120_000,
  asyncStartTimeoutMs: 15_000,
  /** 블로그 생성 고객 체감 SLA */
  customerBlogSlaMs: 120_000,
});

export const BRICLOG_QUALITY_DEFAULTS = Object.freeze({
  humanMinSections: 6,
  applyHumanVoiceOnLaunch: true,
  applyGpt55VoiceFinal: true,
  publishReadyTargetRate: 0.5,
});

export function isBriclogDefaultOverrideAllowed() {
  return process.env.BRICLOG_ALLOW_DEFAULT_OVERRIDE === "1";
}

function readEnvNumber(name, fallback) {
  if (!isBriclogDefaultOverrideAllowed()) return fallback;
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getDefaultGenerationBudgetMs() {
  return readEnvNumber(
    "BRICLOG_GENERATION_BUDGET_MS",
    BRICLOG_TIMING_DEFAULTS.generationBudgetMs
  );
}

export function getDefaultLlmLoopBudgetMs() {
  return readEnvNumber(
    "BRICLOG_LLM_LOOP_BUDGET_MS",
    BRICLOG_TIMING_DEFAULTS.llmLoopBudgetMs
  );
}

export function getDefaultClientFetchMs() {
  return readEnvNumber(
    "BRICLOG_BLOG_CLIENT_FETCH_MS",
    BRICLOG_TIMING_DEFAULTS.clientFetchMs
  );
}

export function getDefaultLaunchPublishBudgetMs() {
  return readEnvNumber(
    "BRICLOG_LAUNCH_PUBLISH_BUDGET_MS",
    BRICLOG_TIMING_DEFAULTS.launchPublishBudgetMs
  );
}

export function getDefaultLaunchClientFetchMs() {
  return readEnvNumber(
    "BRICLOG_LAUNCH_PUBLISH_CLIENT_FETCH_MS",
    BRICLOG_TIMING_DEFAULTS.launchClientFetchMs
  );
}

export function getDefaultLaunchMaxAttempts() {
  if (!isBriclogDefaultOverrideAllowed()) {
    return BRICLOG_TIMING_DEFAULTS.launchMaxAttempts;
  }
  const n = Number(process.env.BRICLOG_LAUNCH_PUBLISH_MAX_ATTEMPTS);
  return Number.isFinite(n) && n >= 1 ? Math.min(2, n) : BRICLOG_TIMING_DEFAULTS.launchMaxAttempts;
}

export function getDefaultLaunchNaverMaxQueries() {
  return readEnvNumber(
    "BRICLOG_LAUNCH_NAVER_MAX_QUERIES",
    BRICLOG_TIMING_DEFAULTS.launchNaverMaxQueries
  );
}

export function getDefaultLaunchResearchTimeoutMs() {
  return readEnvNumber(
    "BRICLOG_LAUNCH_RESEARCH_TIMEOUT_MS",
    BRICLOG_TIMING_DEFAULTS.launchResearchTimeoutMs
  );
}

export function isDefaultAsyncBlogGeneration() {
  if (process.env.BRICLOG_ASYNC_BLOG === "false") return false;
  if (process.env.BRICLOG_ASYNC_BLOG === "true") return true;
  return BRICLOG_PIPELINE_DEFAULTS.asyncBlogGeneration;
}

export function getDefaultAsyncPollIntervalMs() {
  return BRICLOG_TIMING_DEFAULTS.asyncPollIntervalMs;
}

/** Async poll 상한 — 고객 SLA 2분 */
export function getAsyncBlogPollDeadlineMs() {
  return readEnvNumber(
    "BRICLOG_ASYNC_POLL_DEADLINE_MS",
    BRICLOG_TIMING_DEFAULTS.asyncJobTtlMs
  );
}

export function getCustomerBlogSlaMs() {
  return readEnvNumber(
    "BRICLOG_CUSTOMER_BLOG_SLA_MS",
    BRICLOG_TIMING_DEFAULTS.customerBlogSlaMs
  );
}
