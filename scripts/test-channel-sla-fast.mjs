/**
 * Channel standalone fast path — SLA helpers
 * Run: node --import ./scripts/register-alias.mjs scripts/test-channel-sla-fast.mjs
 */

import {
  isChannelStandaloneFastEnabled,
  isChannelStandaloneFastInput,
  getChannelLlmLoopBudgetMs,
  shouldSkipChannelSupplementalResearch,
} from "../lib/config/briclogFastPipeline.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isChannelStandaloneFastEnabled(), "channel standalone fast on");
assert(shouldSkipChannelSupplementalResearch(), "skip supplemental");
assert(getChannelLlmLoopBudgetMs() <= 35_000, "channel LLM loop capped");

assert(
  isChannelStandaloneFastInput({
    contentChannel: "place",
    sourceChannel: "form",
  }),
  "place standalone"
);
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
