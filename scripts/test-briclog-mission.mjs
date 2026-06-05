/**
 * BRICLOG Mission — 조사 충분성 · 글자수 패딩 금지
 */
import assert from "node:assert/strict";
import { assessResearchSufficiencyForWrite } from "../lib/content/researchSufficiencyGate.js";
import { finishBlogPackLocal } from "../lib/generation/briclogLocalFinish.js";
import {
  isLengthPaddingForbidden,
  BRICLOG_EVOLUTION_LADDER,
  buildAiRoleSummaryKo,
} from "../lib/product/briclogMission.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드",
  industry: "가구",
};

const thin = assessResearchSufficiencyForWrite(input, { facts: [], factCount: 0, ok: true }, {});
if (!thin.ok) {
  console.error("FAIL: brand·region·topic only should allow input-grounded write");
  process.exit(1);
}
assert.equal(thin.mode, "input_grounded");

const facts = [
  { axis: "topic", fact: "평택 템퍼 모션베드 행사 — 매장 체험 가능" },
  { axis: "brand", fact: "템퍼 매트리스·모션베드 라인업" },
  { axis: "region", fact: "평택 지역 방문·예약 문의" },
  { axis: "topic", fact: "할인 기간·대상 모델 매장 확인 필요" },
];

const ok = assessResearchSufficiencyForWrite(
  input,
  { facts, factCount: facts.length, ok: true },
  { summary: "평택 템퍼 모션베드", mode: "llm_synthesis" }
);
if (!ok.ok) {
  console.error("FAIL: sufficient research should pass", ok.reasons);
  process.exit(1);
}

if (!isLengthPaddingForbidden()) {
  console.error("FAIL: mission should forbid length padding");
  process.exit(1);
}

const shortPack = {
  title: "테스트",
  sections: [{ heading: "왜", body: "짧은 본문." }],
};
const before = countBlogBodyCharsWithSpaces(shortPack);
const after = finishBlogPackLocal(shortPack, {}, { ...input, blogLengthTier: "medium" });
const afterChars = countBlogBodyCharsWithSpaces(after);
if (afterChars > before + 200) {
  console.error("FAIL: local finish padded length", before, afterChars);
  process.exit(1);
}

console.log("OK: briclog mission — research gate & no length padding");
console.log("  evolution:", BRICLOG_EVOLUTION_LADDER.join(" → "));
console.log("  roles:", buildAiRoleSummaryKo());
