/**
 * Research sanitize + axis align + client delivery gate tests
 */
import assert from "node:assert/strict";
import {
  isPollutedResearchFactText,
  sanitizeResearchFactsList,
} from "../lib/content/researchFactSanitize.js";
import { assessGenerationAxisAlignment } from "../lib/product/generationAxisAlignGate.js";
import { assertColumnistDeliveryLaw } from "../lib/product/columnistDeliveryLaw.js";
import { shouldBlockClientBlogPromotion } from "../lib/product/columnistClientDeliveryGate.js";

const SPAM_FACT =
  "여주에서국수나무돈까스소개를찾다여주목마다녀왔어요";

assert.equal(
  isPollutedResearchFactText(SPAM_FACT, { brandName: "여주목마", region: "여주" }),
  true
);

const clean = sanitizeResearchFactsList(
  [
    { fact: SPAM_FACT, source: "naver" },
    { fact: "여주목마 쇼룸에서 침실 가구 라인업을 확인할 수 있음", source: "naver" },
  ],
  { brandName: "여주목마", region: "여주" }
);
assert.equal(clean.length, 1);
assert.ok(!clean[0].fact.includes("국수나무"));

const axis = assessGenerationAxisAlignment({
  brandName: "여주목마",
  region: "여주",
  topic: "국수나무 돈까스 소개",
  industry: "가구",
});
assert.equal(axis.ok, false);

const spamPack = {
  title: "테스트",
  sections: [
    {
      heading: "a",
      body: "여주 여주목마 현장 매장 현장 쇼룸 근처 쇼룸 이 지역 브랜드",
    },
  ],
};
const law = assertColumnistDeliveryLaw(spamPack, {
  brandName: "여주목마",
  region: "여주",
  topic: "가구 소개",
  researchFacts: [{ fact: "침실 라인업", source: "naver" }],
});
assert.equal(law.shouldWithhold, true);

assert.equal(
  shouldBlockClientBlogPromotion(
    { withheld: true, blogContent: spamPack },
    { brandName: "여주목마", region: "여주", topic: "가구" }
  ),
  true
);

console.log("OK test-research-fact-sanitize");
