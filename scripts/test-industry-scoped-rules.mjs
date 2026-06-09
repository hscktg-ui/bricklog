/**
 * 업종 격리 — 가구 진화 힌트가 꽃집 프롬프트에 새지 않음
 */
import assert from "node:assert/strict";
import {
  filterEvolutionHintsForIndustry,
  resolveIndustryScopedStructureHint,
} from "../lib/product/industryScopedRulesEngine.js";
import { getEvolutionPromptAddon } from "../lib/evolution-lab/rulesStore.js";

const furnitureHints = [
  "쇼룸에서 매트리스 체험 후 프레임 비교",
  "침실 동선을 먼저 재세요",
  "반복 문장 줄이기",
];

const flowerInput = { industry: "꽃집", topic: "여름 꽃 추천", brandName: "그랩앤고플라워" };
const filtered = filterEvolutionHintsForIndustry(furnitureHints, flowerInput);

assert.equal(filtered.length, 1, "only neutral hint should remain");
assert.ok(filtered[0].includes("반복"));

const flowerAddon = getEvolutionPromptAddon(flowerInput);
assert.ok(!/매트리스|쇼룸|프레임/.test(flowerAddon), "flower prompt must not include furniture evolution");
assert.ok(/구조\(업종\)/.test(flowerAddon), "flower prompt must include industry structure");

const furnitureAddon = getEvolutionPromptAddon({ industry: "가구/침대", topic: "매트리스" });
assert.ok(!/꽃다발|무인\s*꽃/.test(furnitureAddon));

assert.ok(resolveIndustryScopedStructureHint(flowerInput).includes("꽃"));
assert.ok(resolveIndustryScopedStructureHint({ industry: "가구" }).includes("쇼룸"));

console.log("OK: industry-scoped rules isolation");
