/**
 * 보강 조사 패스 — 계획·병합·충분성 (API 호출 없음)
 */
import assert from "node:assert/strict";
import { buildSupplementalResearchPlan } from "../lib/product/contentQualityEngine.js";
import { mergeUniqueFacts } from "../lib/content/supplementalResearchPass.js";
import { assessResearchSufficiencyForWrite } from "../lib/content/researchSufficiencyGate.js";

const input = {
  brandName: "더건강하개",
  region: "용인",
  topic: "수제 간식",
};

const thinParsed = {
  facts: [{ axis: "topic", fact: "수제 간식 — 사용자가 입력한 핵심 주제", source: "user_input" }],
  factCount: 1,
};

const thin = assessResearchSufficiencyForWrite(input, thinParsed, {});
assert.ok(!thin.ok);
assert.ok(thin.reasons.includes("research_facts_thin"));

const plan = buildSupplementalResearchPlan(input, thin.reasons);
assert.ok(plan.plans.length >= 3);
assert.ok(plan.plans.some((p) => p.source === "gemini"));
assert.ok(plan.plans.some((p) => p.source === "reviews"));

const merged = mergeUniqueFacts(
  thinParsed.facts,
  [
    { axis: "brand", fact: "더건강하개 — 반려동물 간식 전문 매장", source: "test" },
    { axis: "region", fact: "용인 지역 매장 방문 맥락", source: "test" },
    { axis: "topic", fact: "수제 간식 — 사용자가 입력한 핵심 주제", source: "dup" },
  ]
);
assert.equal(merged.length, 3);

console.log("OK: supplemental research pass");
