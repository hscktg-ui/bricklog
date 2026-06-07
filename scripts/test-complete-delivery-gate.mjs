/**
 * Complete delivery gate — stub·thin·core fail 차단
 */
import assert from "node:assert/strict";
import {
  assessContentExplainabilityForPublish,
} from "../lib/product/briclogContentDoctrine.js";
import { assertCompleteBlogPackForDelivery } from "../lib/product/completeDeliveryGate.js";
import { enrichInputForGeneration } from "../lib/content/enrichGenerationInput.js";

const ACE = {
  brandName: "에이스침대",
  region: "파주",
  topic: "루체3 전시소식",
  mainKeyword: "루체3 전시소식",
  industry: "가구/침대",
  blogLengthTier: "medium",
  researchFacts: [
    { fact: "파주 매장 루체3 전시 라인업 체험 가능", source: "research" },
    { fact: "전시 기간·대상 모델은 매장 안내 기준", source: "research" },
    { fact: "프레임·매트리스 조합별 체험 동선이 다름", source: "research" },
  ],
};

const enriched = enrichInputForGeneration(ACE);
assert.ok(enriched.brandWikiBrief, "pre-write should attach brandWikiBrief");
assert.ok(enriched.topicMapBrief, "pre-write should attach topicMapBrief");

const explain = assessContentExplainabilityForPublish(enriched);
assert.ok(explain.ok, explain.reasons);

const thin = assertCompleteBlogPackForDelivery(
  {
    title: "x",
    sections: [{ heading: "주제", body: "짧은 stub" }],
    _meta: { generationMode: "form_proxy" },
  },
  ACE
);
assert.equal(thin.ok, false);
assert.ok(thin.reasons.includes("form_proxy_stub"));
assert.ok(thin.reasons.includes("length_tier_under"));

console.log("OK: complete delivery gate");
console.log("  wiki brief len:", enriched.brandWikiBrief.length);
console.log("  topic map len:", enriched.topicMapBrief.length);
