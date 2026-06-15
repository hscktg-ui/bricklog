/**
 * Channel standalone fast path — SLA helpers
 * Run: node --import ./scripts/register-alias.mjs scripts/test-channel-sla-fast.mjs
 */

import {
  isChannelStandaloneFastEnabled,
  isChannelStandaloneFastInput,
  getChannelClientFetchTimeoutMs,
  getChannelLlmLoopBudgetMs,
  shouldSkipChannelSupplementalResearch,
} from "../lib/config/briclogFastPipeline.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isChannelStandaloneFastEnabled(), "channel standalone fast on");
assert(
  shouldSkipChannelSupplementalResearch({ channelStandaloneFast: true }),
  "skip supplemental for explicit standalone"
);
assert(getChannelLlmLoopBudgetMs() <= 35_000, "channel LLM loop capped");
assert(
  getChannelClientFetchTimeoutMs({
    contentChannel: "place",
    sourceChannel: "form",
  }) <= 120_000,
  "standalone client fetch capped"
);
assert(
  getChannelClientFetchTimeoutMs({ contentChannel: "place", sourceChannel: "blog" }) >=
    200_000,
  "derived channel keeps long fetch"
);

assert(
  isChannelStandaloneFastInput({
    contentChannel: "place",
    channelStandaloneFast: true,
  }),
  "explicit standalone fast even when max quality"
);
process.env.BRICLOG_MAX_QUALITY = "true";
assert(
  isChannelStandaloneFastInput({
    contentChannel: "place",
    channelStandaloneFast: true,
  }),
  "explicit standalone under max quality env"
);
delete process.env.BRICLOG_MAX_QUALITY;
assert(
  !isChannelStandaloneFastInput({
    contentChannel: "place",
    sourceChannel: "blog",
  }),
  "blog-derived not fast"
);
assert(
  !isChannelStandaloneFastInput({ contentChannel: "blog" }),
  "blog channel not fast"
);

console.log("OK: channel SLA fast path — supplemental skip, loop budget, input detect");
