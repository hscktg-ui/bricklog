/**
 * 스트레스리스·가구 전시 — 꽃집/간식 오염 제거 회귀
 */
import assert from "node:assert/strict";
import {
  applyBriclogEngineV4DeliveryPass,
  assessBriclogEngineV4,
} from "../lib/product/briclogEngineV4.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBriclogIndustryKey } from "../lib/product/industryContextEngine.js";
import { buildProvisionalBrandFromForm } from "../lib/brands/resolveBrandForForm.js";
import { isFlowerRecommendationTopic } from "../lib/product/flowerRecommendationProseEngine.js";

const INPUT = {
  brandName: "스트레스리스",
  region: "파주",
  topic: "파주 스트레스리스 라인업 3종 전시",
  mainKeyword: "스트레스리스",
  industry: "꽃/플로리스트",
  blogLengthTier: "short",
  researchFacts: [
    { fact: "파주 매장에서 스트레스리스 3종 라인업 전시", source: "research" },
    { fact: "소파·매트리스·리클라이너 체험 동선", source: "research" },
    { fact: "전시 기간·모델 구성은 매장 안내 기준", source: "research" },
  ],
};

assert.equal(resolveBriclogIndustryKey(INPUT), "furniture");
assert.equal(isFlowerRecommendationTopic(INPUT), false);

const flowerBrand = { id: "b1", brandName: "여름꽃집", industry: "꽃" };
const provisional = buildProvisionalBrandFromForm(
  { brandName: "스트레스리스", topic: INPUT.topic, region: "파주" },
  flowerBrand
);
assert.notEqual(provisional.industry, "꽃");

const contaminated = {
  title: "파주 스트레스리스 라인업 3종 전시",
  sections: [
    {
      heading: "마무리",
      body: "리본·카드 문구 샘플을 같이 보며 향기와 컬러에 맞춰 골랐어요. 여름철에는 어떤 꽃을 고르면 좋을지 정리해 두면 편하다.",
    },
    {
      heading: "전시 안내",
      body: "스트레스리스 스트레스리스 안내를 비교해 보니 스트레스리스에서 안내하는 신규 라인업 3종 전시 관련 조건은 제품·시즌에 따라 달라질 수 있습니다. 알레르기·원재료 표기는 먼저 확인하는 편이 좋았어요.",
    },
    {
      heading: "마무리",
      body: "현장에서 가구 매장에는 다양한 형태의 붙박이장 라인업이 전시된다 이야기를 들으며 메모해 뒀어요.",
    },
  ],
  conclusion: "스트레스리스 안내를 비교해 보니 고를 때 기준이 보였더라구요.",
};

let cleaned = applyBriclogEngineV4DeliveryPass(contaminated, INPUT);
const v4Full = getBlogFullText(cleaned);

for (const forbidden of [
  /향기(?:와|와\s*컬)/,
  /여름\s*꽃|여름철\s*꽃/,
  /리본(?:·|과)?\s*카드/,
  /알레르기\s*·\s*원재료/,
  /붙박이\s*장|붙박이장/,
  /어떤\s*꽃을\s*고/,
]) {
  assert.ok(!forbidden.test(v4Full), `V4 left forbidden: ${forbidden}`);
}

const closingHeadings = (cleaned.sections || [])
  .map((s) => s.heading)
  .filter((h) => /^마무리/.test(String(h || "").trim()));
assert.ok(closingHeadings.length <= 1, "duplicate closing headings");

cleaned = finalizeContentQualityForDelivery(cleaned, INPUT, "blog");
const finalFull = getBlogFullText(cleaned);

assert.ok(
  !/향기(?:와|와\s*컬)|여름\s*꽃|리본(?:·|과)?\s*카드|알레르기\s*·\s*원재료|붙박이\s*장/.test(
    finalFull
  ),
  "delivery still has flower/snack leak"
);
assert.ok(
  countBlogBodyCharsWithSpaces(cleaned) >= 120,
  "expected non-trivial body after delivery"
);

const assessment = assessBriclogEngineV4(cleaned, INPUT);
assert.ok(!assessment.issues.some((i) => i.type === "furniture_flower_leak"));

console.log("OK: stressless furniture contamination scrub");
console.log("  v4 score:", assessment.score);
console.log("  chars:", countBlogBodyCharsWithSpaces(cleaned));
