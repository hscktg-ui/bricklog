/**
 * Briclog Writer Engine — local shape/judge (no API)
 */
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { stampDeliveryGradeMeta } from "../lib/product/deliveryGrade.js";
import { polishLlmPackForDelivery } from "../lib/golden/llmDeliveryPolish.js";
import { guardPackAgainstShrink } from "../lib/product/packShrinkGuard.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { WRITER_ENGINE_VERSION } from "../lib/product/briclogWriterEngine.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const teaInput = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴",
  industry: "티카페",
  blogLengthTier: "short",
  researchFacts: [
    { fact: "가을 밤차·사과차", source: "research" },
    { fact: "창가 단독석", source: "research" },
  ],
};

let pack;
try {
  pack = JSON.parse(readFileSync(join(root, "artifacts/probe-tea-cafe/llm-parsed.json"), "utf8"));
} catch {
  console.log("SKIP: no llm-parsed.json");
  process.exit(0);
}

pack._meta = { llmGenerated: true, generationMode: "llm_openai" };
const inbound = countBlogBodyCharsWithSpaces(pack);
let next = polishLlmPackForDelivery(pack, teaInput);
next = guardPackAgainstShrink(pack, next, { stage: "test" });
next = stampDeliveryGradeMeta(next, teaInput);
const out = countBlogBodyCharsWithSpaces(next);

assert.ok(out >= inbound * 0.9, `shrink guard ${inbound} -> ${out}`);
assert.ok(next._meta?.deliveryGrade, "grade stamped");
assert.ok(next._meta?.llmDeliveryPolish, "polish path");
assert.equal(WRITER_ENGINE_VERSION, "briclog-writer-v2");

console.log("OK: briclog-writer-engine-local", {
  inbound,
  out,
  grade: next._meta?.deliveryGrade,
  tierMet: next._meta?.lengthTierMet,
});
