import assert from "node:assert/strict";
import { enrichMinimalBlogInput } from "@/lib/llm/blogDeliveryFallback.js";
import { prepareBriclogPreWriteContext } from "@/lib/content/briclogPreWriteContext.js";
import { researchGateBlockedForInsufficient } from "@/lib/content/researchSufficiencyGate.js";
import { parseV2AxisResearch } from "@/lib/content/v2AxisResearch.js";
import { runBrandResearchEngine } from "@/lib/research/brandResearchEngine.js";
import { assertPreWriteVerified } from "@/lib/content/v2PipelineGate.js";
import { ensureBlogDelivery } from "@/lib/generation/ensureBlogDelivery.js";
import { mergeWorkspaceBrandIntoInput } from "@/lib/workspace/brandFormSync.js";

const base = enrichMinimalBlogInput({
  brandName: "테스트카페",
  region: "서울 강남",
  topic: "봄 브런치 오픈",
  industry: "카페",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
});

const merged = mergeWorkspaceBrandIntoInput(base, {
  activeBrandId: "brand-1",
  activeBrand: {
    id: "brand-1",
    brandName: "테스트카페",
    region: "서울 강남",
    industry: "카페",
  },
});
assert.equal(merged.brandName, "테스트카페");
assert.equal(merged.brandId, "brand-1");

const brandResearch = runBrandResearchEngine(merged);
const research = {
  summary: "테스트카페 봄 브런치",
  sources: [],
  v2Axis: { researchStatus: "contextual" },
};
const parsed = parseV2AxisResearch(research, merged, brandResearch, {
  facts: [
    { fact: "봄 브런치 오픈", source: "user_input", axis: "topic" },
    { fact: "테스트카페 시그니처 메뉴", source: "brand_engine", axis: "brand" },
  ],
  depth: { tier: "contextual" },
});

const block = researchGateBlockedForInsufficient(merged, parsed, research);
assert.equal(block, null, "thin research must not hard-block");

Object.assign(merged, prepareBriclogPreWriteContext(merged));
merged.v2PreWriteVerified = true;
merged.v2ResearchReady = true;
merged.v2AxisVerified = true;
merged.v2PipelineStage = "information_research_verified";
merged.researchFacts = parsed.facts;

const pre = assertPreWriteVerified(merged);
assert.equal(pre.ok, true, `preWrite blocked: ${pre.userMessage}`);

const delivered = await ensureBlogDelivery(merged, {});
assert.ok(
  delivered.blogContent?.sections?.length,
  `delivery empty: ${delivered.userMessage}`
);

console.log("OK: blog generation gates", delivered.blogContent.sections.length, "sections");
