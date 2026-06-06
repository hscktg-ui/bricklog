/**
 * 애견카페 방문 후기 — 정보형·카공 템플릿 오염 회귀
 */
import { resolveBriclogIndustryKey } from "../lib/product/industryContextEngine.js";
import {
  isInformationalTopicInput,
  isVisitReviewTopicInput,
  topicWritingFacet,
} from "../lib/content/topicFacetEngine.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { applyCoreContentEngineGate } from "../lib/product/coreContentEngine.js";
import { detectVisitReviewTemplateContamination } from "../lib/content/visitReviewTopicGate.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const input = {
  brandName: "플레르퍼피",
  region: "파주",
  topic: "애견카페 플레르퍼피 다녀왔어요",
  mainKeyword: "애견카페 플레르퍼피 다녀왔어요",
  purposeType: "visit",
  blogLengthTier: "short",
};

if (resolveBriclogIndustryKey(input) !== "pet_cafe") {
  console.error("FAIL: industry should be pet_cafe, got", resolveBriclogIndustryKey(input));
  process.exit(1);
}

if (isInformationalTopicInput(input)) {
  console.error("FAIL: visit topic must not be informational");
  process.exit(1);
}

if (!isVisitReviewTopicInput(input)) {
  console.error("FAIL: visit topic not detected");
  process.exit(1);
}

const facet = topicWritingFacet(input);
if (/다녀왔어요/.test(facet)) {
  console.error("FAIL: facet should strip visit suffix, got", facet);
  process.exit(1);
}

let pack = buildMissionProseFallbackPack(input);
pack = applyCoreContentEngineGate(pack, input);

const full = getBlogFullText(pack);
const bad = [
  /성분·보관·선물/,
  /첨가물·알레르기\s*표기/,
  /카공·모임\s*자리/,
  /브런치\s*메뉴를\s*찾다/,
  /알아보게\s*된\s*이유/,
  /왜\s+애견카페\s+플레르퍼피\s+다녀왔어요를\s+찾게\s*되는가/,
];

for (const re of bad) {
  if (re.test(full)) {
    console.error("FAIL: contaminated output matched", re.source);
    console.error(full.slice(0, 800));
    process.exit(1);
  }
}

const contamination = detectVisitReviewTemplateContamination(pack, input);
if (!contamination.ok) {
  console.error("FAIL: contamination detector", contamination.violations);
  process.exit(1);
}

console.log("OK: pet cafe visit — no informational/cafe-guide contamination");
console.log("  industry:", resolveBriclogIndustryKey(input));
console.log("  facet:", facet);
console.log("  title:", pack.title);
