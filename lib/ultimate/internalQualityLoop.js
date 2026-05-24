/**
 * STEP 19 — Internal Quality Loop (5회 검수)
 */
import { analyzeUserInput } from "./inputUnderstanding";
import { generateBrandProfile, shouldRunBrandResearch } from "./brandProfile";
import { detectNoCopyViolations } from "./noCopyPolicy";
import { runHardValidation } from "@/lib/pipeline/v2/hardValidation";
import { evaluateWritingConstitution } from "@/lib/constitution/writingConstitution";
import { computeFinalQualityScore } from "@/lib/pipeline/v2/finalQualityScore";
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { BLOG_MIN_BODY_CHARS } from "@/lib/constants";

export function runInternalQualityLoop(pack, ctx = {}, input = {}) {
  const passes = [];

  const understanding = analyzeUserInput(input);
  passes.push({
    id: "pass1_input",
    label: "1차 · 입력 해석",
    ok: understanding.ready,
  });

  const researchOk = !shouldRunBrandResearch(understanding.understood) || !!ctx.brandResearch;
  passes.push({
    id: "pass2_research",
    label: "2차 · 브랜드 조사",
    ok: researchOk,
  });

  const contextOk =
    !!ctx.contentIntent?.ok &&
    !!ctx.contentPersona &&
    (ctx.brandContextItems?.length >= 2 || !ctx.brandName);
  passes.push({
    id: "pass3_context",
    label: "3차 · 맥락·화자·브랜드",
    ok: contextOk,
  });

  const hard = runHardValidation(pack, ctx);
  const noCopy = detectNoCopyViolations(pack, ctx.brandResearch);
  passes.push({
    id: "pass4_errors",
    label: "4차 · 오류·반복·조사",
    ok: hard.ok && noCopy.ok,
    detail: [...hard.failures, ...noCopy.violations.map((v) => v.type)],
  });

  const constitution = evaluateWritingConstitution(pack, ctx, "blog");
  const score = computeFinalQualityScore(pack, ctx);
  passes.push({
    id: "pass5_human",
    label: "5차 · 사람스러움·브랜드·감정",
    ok: constitution.ok && score.dimensions?.emotionTemp >= 50,
    score: score.total,
  });

  const charCount = countBlogBodyChars(pack);
  const lengthOk = charCount >= BLOG_MIN_BODY_CHARS;

  return {
    ok: passes.every((p) => p.ok) && lengthOk,
    passes,
    charCount,
    lengthOk,
    hard,
    noCopy,
    constitution,
    qualityScore: score,
  };
}
