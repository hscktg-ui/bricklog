/**
 * 조사 준비 — 고객 메시지·신제품 완화
 */
import assert from "node:assert/strict";
import {
  detectThinResearchContext,
  evaluateResearchWriteGate,
  formatCustomerResearchBlockMessage,
  formatCustomerResearchProgressMessage,
  hasAnyOnlineResearchSignal,
  resolveMinResearchFactsForWrite,
  sanitizeCustomerResearchMessage,
} from "../lib/product/researchReadiness.js";
import { assessResearchSufficiencyForWrite } from "../lib/content/researchSufficiencyGate.js";
import { buildSupplementalResearchPlan } from "../lib/product/contentQualityEngine.js";

const thinNew = {
  brandName: "라온커피",
  region: "판교",
  topic: "신제품 콜드브루 런칭",
};
assert.ok(detectThinResearchContext(thinNew).thin);

const minFacts = resolveMinResearchFactsForWrite(thinNew, { facts: [{ fact: "a" }] }, {});
assert.ok(minFacts <= 6);

const progress = formatCustomerResearchProgressMessage();
assert.ok(!/gemini|20개|단위/i.test(progress));

const plan = buildSupplementalResearchPlan(thinNew, ["research_facts_thin"]);
assert.ok(plan.plans.length >= 1);
assert.ok(!/gemini/i.test(plan.message || ""));
assert.ok(plan.internalMessage?.includes("supplemental"));

const leaked =
  "정보가 20개 단위에 닿기 전까지 작성하지 않습니다. gemini · naver · official 조사를 추가합니다.";
const clean = sanitizeCustomerResearchMessage(leaked, thinNew, ["research_facts_thin"]);
assert.ok(!/gemini|20개/i.test(clean));

const block = formatCustomerResearchBlockMessage(thinNew, ["research_facts_thin"]);
assert.ok(!/조사가 아직 충분하지 않아요/.test(block));

const fiveBrandFacts = Array.from({ length: 3 }, (_, i) => ({
  axis: "brand",
  fact: `판교 라온커피 콜드브루 확인 사실 ${i + 1}`,
  source: "naver",
}));
const oneOnline = evaluateResearchWriteGate(
  thinNew,
  { facts: fiveBrandFacts },
  { summary: "콜드브루 신메뉴 출시" }
);
assert.ok(oneOnline.ok && oneOnline.mode === "online_clue");

const newBrand = assessResearchSufficiencyForWrite(
  {
    brandName: "신규카페",
    region: "성남",
    topic: "오픈",
    publicTestMode: true,
  },
  { facts: [{ axis: "topic", fact: "오픈 — 사용자가 입력한 핵심 주제", source: "user_input" }] },
  {}
);
assert.ok(newBrand.ok, "public test bypass keeps thin-context path open");

console.log("OK: research readiness — customer copy, thin context");
