/**
 * BRICLOG defaults SSOT — 변경 시 lib/config/briclogDefaults.js 와 함께 갱신
 * Run: npm run test:briclog-defaults
 */
import {
  BRICLOG_DEFAULTS_VERSION,
  BRICLOG_PRODUCT,
  BRICLOG_PIPELINE_DEFAULTS,
  BRICLOG_TIMING_DEFAULTS,
  BRICLOG_QUALITY_DEFAULTS,
  getDefaultAsyncPollIntervalMs,
  getAsyncBlogPollDeadlineMs,
  getAsyncRunAwaitTimeoutMs,
  isDefaultAsyncBlogGeneration,
} from "../lib/config/briclogDefaults.js";
import {
  DEFAULT_OPENAI_MODEL,
  OPENAI_WRITER_MODEL,
  resolveWriterModel,
  isLockedWriterModelId,
  usesMaxCompletionTokens,
  supportsCustomTemperature,
} from "../lib/llm/openaiCompletionParams.js";
import {
  isLaunchPublishFirstMode,
  getLaunchPublishTimeBudgetMs,
} from "../lib/config/launchPublishFlags.js";
import { getBlogClientFetchTimeoutMs } from "../lib/config/briclogFastPipeline.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(BRICLOG_DEFAULTS_VERSION === "briclog-defaults-v2", "defaults v2");
assert(BRICLOG_PRODUCT.identity === "Brand Content OS", "identity");
assert(BRICLOG_PRODUCT.writerModel === "gpt-5.6", "writer gpt-5.6");
assert(DEFAULT_OPENAI_MODEL === "gpt-5.6", "openai default gpt-5.6");
assert(OPENAI_WRITER_MODEL === "gpt-5.6", "writer lock gpt-5.6");
assert(isLockedWriterModelId(resolveWriterModel()), "resolve locked");
assert(resolveWriterModel("gpt-5.5") === OPENAI_WRITER_MODEL, "ignore stale 5.5");
assert(resolveWriterModel("gpt-5.6-terra") === OPENAI_WRITER_MODEL, "reject terra");
assert(resolveWriterModel("gpt-5.6-luna") === OPENAI_WRITER_MODEL, "reject luna");
assert(resolveWriterModel("gpt-5.6-sol") === "gpt-5.6-sol", "allow sol");
assert(isLockedWriterModelId("gpt-5.6"), "alias locked");
assert(usesMaxCompletionTokens("gpt-5.6"), "max_completion_tokens");
assert(supportsCustomTemperature("gpt-5.6") === false, "no custom temperature");
assert(BRICLOG_PIPELINE_DEFAULTS.launchPublishFirst === true, "launch on");
assert(BRICLOG_TIMING_DEFAULTS.clientFetchMs === 120_000, "client 120s");
assert(BRICLOG_TIMING_DEFAULTS.launchPublishBudgetMs === 75_000, "launch 75s");
assert(BRICLOG_QUALITY_DEFAULTS.applyGpt55VoiceFinal === true, "human voice");
assert(isLaunchPublishFirstMode(), "launch mode active");
assert(getLaunchPublishTimeBudgetMs() === 75_000, "launch budget wired");
assert(getBlogClientFetchTimeoutMs() === 150_000, "client fetch 150s (2min UX margin)");
assert(getAsyncBlogPollDeadlineMs() === 240_000, "async poll 240s (200s gen + margin)");
assert(getAsyncRunAwaitTimeoutMs() === 310_000, "async run await 310s (no abort)");
assert(isDefaultAsyncBlogGeneration(), "async default on");

console.log("PASS: briclog-defaults", BRICLOG_DEFAULTS_VERSION);
