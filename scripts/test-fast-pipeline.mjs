/**
 * Tri-AI Fast Pipeline — 플래그
 */
import { isBriclogFastPipelineEnabled, useGeminiResearchProvider } from "../lib/config/briclogFastPipeline.js";
import { getNaverMaxQueries, getResearchDepthMaxRounds, getCoreMaxRewrites } from "../lib/config/briclogFastPipeline.js";
import { finishBlogPackLocal } from "../lib/generation/briclogLocalFinish.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";

if (!isBriclogFastPipelineEnabled()) {
  console.error("FAIL: fast pipeline should default ON");
  process.exit(1);
}
if (getNaverMaxQueries() !== 4) {
  console.error("FAIL: naver max queries", getNaverMaxQueries());
  process.exit(1);
}
if (getResearchDepthMaxRounds(true) !== 0) {
  console.error("FAIL: depth rounds");
  process.exit(1);
}
if (getCoreMaxRewrites() !== 1) {
  console.error("FAIL: core rewrites", getCoreMaxRewrites());
  process.exit(1);
}

const shortPack = {
  title: "테스트",
  sections: [{ heading: "왜", body: "할인 전 비교." }],
};
const finished = finishBlogPackLocal(shortPack, {}, { blogLengthTier: "medium", brandName: "A", region: "B", topic: "C" });
if (countBlogBodyCharsWithSpaces(finished) > 500) {
  console.error("FAIL: unexpected padding in fast finish");
  process.exit(1);
}

console.log("OK: tri-ai fast pipeline flags", {
  geminiResearch: useGeminiResearchProvider(),
  naverQ: getNaverMaxQueries(),
  rewrites: getCoreMaxRewrites(),
});
