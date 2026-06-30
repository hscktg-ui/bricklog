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
  isDefaultAsyncBlogGeneration,
} from "../lib/config/briclogDefaults.js";
import {
  isLaunchPublishFirstMode,
  getLaunchPublishTimeBudgetMs,
} from "../lib/config/launchPublishFlags.js";
import { getBlogClientFetchTimeoutMs } from "../lib/config/briclogFastPipeline.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(BRICLOG_DEFAULTS_VERSION, "version set");
assert(BRICLOG_PRODUCT.identity === "Brand Content OS", "identity");
assert(BRICLOG_PIPELINE_DEFAULTS.launchPublishFirst === true, "launch on");
assert(BRICLOG_TIMING_DEFAULTS.clientFetchMs === 120_000, "client 120s");
assert(BRICLOG_TIMING_DEFAULTS.launchPublishBudgetMs === 75_000, "launch 75s");
assert(BRICLOG_QUALITY_DEFAULTS.applyGpt55VoiceFinal === true, "human voice");
assert(isLaunchPublishFirstMode(), "launch mode active");
assert(getLaunchPublishTimeBudgetMs() === 75_000, "launch budget wired");
assert(getBlogClientFetchTimeoutMs() === 130_000, "client fetch 130s (2min UX)");
assert(getAsyncBlogPollDeadlineMs() === 120_000, "async poll 120s customer SLA");
assert(isDefaultAsyncBlogGeneration(), "async default on");

console.log("PASS: briclog-defaults", BRICLOG_DEFAULTS_VERSION);
