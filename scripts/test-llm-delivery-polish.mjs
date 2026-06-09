/**
 * LLM 송출 마감 — 말투·길이·점수 회귀 (human tier SSOT)
 */
import assert from "node:assert/strict";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { GOLDEN_PASS_SCORE } from "../lib/golden/goldenQualityGate.js";
import { stripLlmPackSurfaceNoise } from "../lib/golden/llmDeliveryPolish.js";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "../lib/constants.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const teaInput = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴와 다실 분위기",
  industry: "티카페",
  blogLengthTier: DEFAULT_BLOG_LENGTH_TIER,
  v4Speaker: "brand_intro",
  researchFacts: [
    { fact: "가을 시즌 밤차·사과차·보이차·허브티", source: "research" },
    { fact: "창가 단독석·2~4인 테이블·조용한 다실", source: "research" },
    { fact: "티 세트·스콘·마들렌 디저트", source: "research" },
  ],
};

const tier = resolveBlogLengthTier(teaInput.blogLengthTier);

let pack;
try {
  pack = JSON.parse(readFileSync(join(root, "artifacts/probe-tea-cafe/llm-parsed.json"), "utf8"));
} catch {
  console.log("SKIP: no llm-parsed.json — run probe-tea-cafe-raw-llm.mjs first");
  process.exit(0);
}

pack._meta = { llmGenerated: true, generationMode: "llm_openai" };
const stripped = stripLlmPackSurfaceNoise(pack);
const before = getBlogFullText(stripped).replace(/\s/g, "").length;
const out = finalizeContentQualityForDelivery(pack, teaInput, "blog");
const full = getBlogFullText(out);
const after = full.replace(/\s/g, "").length;
const gate = out._meta?.goldenGate;
const blogChars = out._meta?.blogCharCount || 0;

assert.ok(out._meta?.llmDeliveryPolish === true, "llm polish path");
assert.ok(after >= before * 0.9, `chars preserved ${before} -> ${after}`);
assert.ok(blogChars >= Math.min(tier.min, before + 400), `expanded toward tier ${blogChars}`);
assert.ok(!/해요|이에요|랍니다|되죠/.test(full), "haeyo voice removed");
assert.ok(!/카페는 메뉴보다/.test(full), "no cafe template");
assert.ok(gate?.haeshin?.score >= 86, `haeshin ${gate?.haeshin?.score}`);
assert.ok(gate?.score >= 80, `golden ${gate?.score}`);
assert.ok(out._meta?.deliveryGrade, "deliveryGrade stamped");

if (out._meta?.lengthTierMet) {
  assert.ok(gate?.score >= GOLDEN_PASS_SCORE - 2, `golden publish bar ${gate?.score}`);
} else {
  assert.ok(out._meta?.publishReady !== true, "draft not publish-ready");
}

console.log("OK: llm-delivery-polish", {
  chars: after,
  blogCharCount: blogChars,
  tierMin: tier.min,
  lengthTierMet: out._meta?.lengthTierMet,
  deliveryGrade: out._meta?.deliveryGrade,
  golden: gate?.score,
  haeshin: gate?.haeshin?.score,
  publishReady: out._meta?.publishReady,
  passBar: GOLDEN_PASS_SCORE,
});
