/**
 * Editor & Length Control Engine — 3 tiers + meta leak + editor gate
 */
import { enforceStrictBlogLength } from "../lib/content/editorLengthControlEngine.js";
import {
  assertEditorPreOutput,
  applyEditorPreOutputCorrection,
} from "../lib/content/editorPreOutputGate.js";
import {
  sanitizeEditorLeakPack,
  stripEditorAuditSentences,
} from "../lib/content/editorQualityEngine.js";
import { applyBrandContentEngine } from "../lib/content/brandContentEngine.js";
import { expandPackByInformation } from "../lib/content/informationExpansionEngine.js";
import { assertBlogLengthTier } from "../lib/content/blogLengthDelivery.js";
import { normalizeBlogLengthAndStructure } from "../lib/content/blogLengthControl.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const ctx = { brandName: "템퍼", region: "평택" };

const leakBody =
  "이 글은 모션베드에 답하려고 썼어요. 확인된 정보만 남기고 과장 표현은 모두 덜어냈습니다. 방문 전 확인하면 도움이 되는 항목부터 간단히 짚어봅니다.";
const cleaned = stripEditorAuditSentences(leakBody);
if (cleaned.includes("답하려고") || cleaned.includes("짚어봅니다")) {
  console.error("FAIL: audit sentences not stripped", cleaned);
  process.exit(1);
}

for (const tierKey of ["short", "medium", "long"]) {
  const input = {
    brandName: "템퍼",
    region: "평택",
    topic: "모션베드 특별할인",
    industry: "가구/침대",
    blogLengthTier: tierKey,
  };
  const tier = resolveBlogLengthTier(tierKey);

  let pack = expandPackByInformation(
    {
      title: "평택 · 템퍼 · 모션베드",
      representativeTitle: "평택 · 템퍼 · 모션베드",
      sections: [{ heading: "소개", body: "짧은 본문." }],
      conclusion: "정리합니다.",
    },
    ctx,
    input,
    { minChars: tier.min, channel: "blog" }
  );

  pack = applyBrandContentEngine(sanitizeEditorLeakPack(pack), ctx, input);
  const corrected = applyEditorPreOutputCorrection(pack, ctx, input);
  pack = corrected.pack;

  if (!corrected.lengthOk) {
    console.error(
      "FAIL: editor correction length",
      tierKey,
      countBlogBodyCharsWithSpaces(pack),
      "expected",
      tier.min,
      "-",
      tier.max
    );
    process.exit(1);
  }

  const enforced = enforceStrictBlogLength(pack, ctx, input, { maxAttempts: 24 });
  if (!enforced.ok) {
    console.error(
      "FAIL: strict length",
      tierKey,
      enforced.chars,
      "expected",
      tier.min,
      "-",
      tier.max
    );
    process.exit(1);
  }

  const normalized = normalizeBlogLengthAndStructure(enforced.pack, ctx, input);
  if (!normalized.lengthOk) {
    console.error(
      "FAIL: normalize lengthOk",
      tierKey,
      normalized.charCount,
      tier.min,
      "-",
      tier.max
    );
    process.exit(1);
  }

  const assertTier = assertBlogLengthTier(input, normalized.pack);
  if (!assertTier.ok) {
    console.error("FAIL: assertBlogLengthTier", tierKey, assertTier);
    process.exit(1);
  }

  const full = getBlogFullText(normalized.pack);
  if (/답하려고|내부\s*검수|홍보\s*문구\s*금지/.test(full)) {
    console.error("FAIL: meta leak in output", tierKey);
    process.exit(1);
  }

  const gate = assertEditorPreOutput(normalized.pack, ctx, input);
  if (!gate.checklist.length_tier) {
    console.error("FAIL: editor length checklist", tierKey);
    process.exit(1);
  }

  console.log(
    "OK:",
    tierKey,
    "chars=",
    countBlogBodyCharsWithSpaces(normalized.pack),
    "range=",
    tier.min,
    "-",
    tier.max,
    "editorGate=",
    gate.ok,
    "reasons=",
    gate.reasons?.length ? gate.reasons.join(",") : "-"
  );
}
