/**
 * 전 채널 60초 SLA — Fast Pipeline 예산·로컬 파생
 * Run: npm run test:all-channel-sla
 */
import {
  getAllChannelSlaBudgetMs,
  getGenerationTimeBudgetMs,
  getLlmLoopBudgetMs,
  getBlogClientFetchTimeoutMs,
  getChannelClientFetchTimeoutMs,
  getChannelPackDeadlineMs,
  shouldUseDerivedChannelLocalOnly,
  shouldSkipHeavyPostLlmExpansion,
  isChannelPackDeferred,
  shouldSkipClientAxisResearch,
} from "../lib/config/briclogFastPipeline.js";
import { estimateBlogGenerationMs } from "../lib/loading/estimateGenerationMs.js";
import { ensureChannelDelivery } from "../lib/generation/ensureChannelDelivery.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

process.env.BRICLOG_FAST_PIPELINE = "true";
delete process.env.BRICLOG_MAX_QUALITY;

const SLA = getAllChannelSlaBudgetMs();
assert(SLA <= 30_000, `SLA budget ${SLA} <= 30s`);
assert(getGenerationTimeBudgetMs() <= SLA, "generation budget within SLA");
assert(getLlmLoopBudgetMs() < getGenerationTimeBudgetMs(), "LLM loop < total");
assert(getBlogClientFetchTimeoutMs() <= SLA + 6_000, "blog fetch cap");
assert(getChannelClientFetchTimeoutMs({ channelStandaloneFast: true, contentChannel: "place" }) <= 20_000, "channel fast fetch cap");

const estPack = estimateBlogGenerationMs(
  { brandName: "A", topic: "B", researchEnabled: true },
  { blogOnly: false }
);
assert(estPack <= 30_000, `UI estimate pack ${estPack} <= 30s`);

assert(
  shouldUseDerivedChannelLocalOnly({ sourceChannel: "blog" }, "place", {
    sections: [{ body: "x" }],
  }),
  "derived local only when blog present"
);
assert(
  !shouldUseDerivedChannelLocalOnly({}, "place", null),
  "no local-only without blog"
);
assert(shouldSkipHeavyPostLlmExpansion(), "heavy post-LLM skipped in fast mission");
assert(
  shouldSkipClientAxisResearch({ brandName: "A", topic: "B", region: "C" }),
  "skip duplicate client axis research in fast mode"
);
assert(
  !shouldSkipClientAxisResearch({
    brandName: "A",
    topic: "B",
    region: "C",
    v2ResearchReady: true,
    v2PreWriteVerified: true,
    v2AxisVerified: true,
  }),
  "keep client path when research already complete"
);

const blog = {
  sections: [
    { heading: "h", body: "여주목마 실내수영장은 가족과 함께 물놀이하기 좋은 공간입니다." },
    { heading: "h2", body: "실내 온수와 안전 요원이 상주해 아이들도 편하게 이용할 수 있어요." },
  ],
  title: "여주목마 실내수영장",
  _meta: { llmGenerated: true, writerFirstDelivery: true },
};
const input = {
  brandName: "여주목마",
  region: "여주",
  topic: "실내수영장",
  v2ResearchReady: true,
  v2PreWriteVerified: true,
  sourceChannel: "blog",
};

const t0 = Date.now();
const place = await ensureChannelDelivery("place", input, { sourceBlog: blog });
const insta = await ensureChannelDelivery("instagram", input, { sourceBlog: blog });
const elapsed = Date.now() - t0;

assert(place.ok && place.placeContent, "place local derive ok");
assert(insta.ok && insta.instagramContent, "insta local derive ok");
assert(elapsed < 3_000, `local derive ${elapsed}ms < 3s`);
assert(
  place.meta?.derivedLocalOnly ||
    place.placeContent?._meta?.derivedFromVerifiedBlog ||
    place.placeContent?._meta?.channelNorthStarPack,
  "place derive meta"
);

console.log("OK: all-channel SLA budgets");
console.log(`  SLA=${SLA}ms · gen=${getGenerationTimeBudgetMs()}ms · llm=${getLlmLoopBudgetMs()}ms`);
console.log(`  deferred=${isChannelPackDeferred()} · packDeadline=${getChannelPackDeadlineMs()}`);
console.log(`  local derive ${elapsed}ms`);
console.log("\nPASS: all-channel-sla");
