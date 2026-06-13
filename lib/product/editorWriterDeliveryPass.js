/**
 * 에디터·작가 관점 송출 — 반복 제거 후 분량·서사 보강
 */
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  applyEditorDuplicateSweep,
  detectDuplicateKillerIssues,
} from "@/lib/content/duplicateKillerEngine";
import {
  weaveSectionPlanGaps,
  ensureTierMinConclusion,
} from "@/lib/content/editorQualityEngine";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";
import { finalizeMissionProsePack, deepenDensityFirstPack } from "@/lib/product/missionProseEngine";
import { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";
import {
  buildResearchFactLines,
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import {
  applyHumanColumnProsePass,
  scoreHumanColumnProseContamination,
} from "@/lib/product/humanColumnProseEngine";
import { applyDisplayBodyGuardPack } from "@/lib/content/displayBodyGuards";

/**
 * 중복 제거 후 tier min 미달이면 — 조사·섹션 플랜·칼럼 서사로 분량 보강 (패딩 문장 금지)
 * @param {object} pack
 * @param {object} input
 * @param {object} [ctx]
 */
export function applyEditorWriterLengthPass(pack, input = {}, ctx = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;

  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const target = tier.min;
  let next = pack;
  let chars = countBlogBodyCharsWithSpaces(next);

  if (chars >= target) {
    next = applyEditorDuplicateSweep(next, { input, ...ctx }, "blog");
    next = applyDisplayBodyGuardPack(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
    const dupFinal = detectDuplicateKillerIssues(getBlogFullText(next));
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        editorWriterLengthPass: true,
        editorWriterLengthMet: true,
        editorWriterLengthChars: chars,
        editorWriterLengthTarget: target,
        editorWriterLengthDupOk: dupFinal.ok,
      },
    };
  }

  if (hasUsableResearchFacts(input)) {
    next = weaveResearchFactsIntoPack(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target) {
    next = weaveSectionPlanGaps(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target) {
    next = ensureTierMinConclusion(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  const yieldBefore = scoreInformationYield(getBlogFullText(next), { input }, "blog");
  if (chars < target && (!yieldBefore.ok || chars < target * 0.82)) {
    const researchLines = hasUsableResearchFacts(input)
      ? buildResearchFactLines(input, 10)
      : [];
    next = deepenPackBodiesToMin(
      next,
      target,
      { ...ctx, input, researchLines },
      input
    );
    chars = countBlogBodyCharsWithSpaces(next);
  }

  const proseScore = scoreHumanColumnProseContamination(next, input);
  if (
    chars < target * 0.9 &&
    (!next._meta?.humanColumnProsePass || !proseScore.ok)
  ) {
    next = applyHumanColumnProsePass(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target) {
    next = ensureMissionProseTierLength(next, { input, ...ctx });
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target) {
    next = deepenMissionProseToMin(next, target, input);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target) {
    let round = 0;
    const researchLines = hasUsableResearchFacts(input)
      ? buildResearchFactLines(input, 12)
      : [];
    while (chars < target && round < 8) {
      next = deepenDensityFirstPack(next, target, input, {
        polishAfter: true,
        seedOffset: round + 4,
        researchLines,
      });
      const afterRound = countBlogBodyCharsWithSpaces(next);
      if (afterRound <= chars) break;
      chars = afterRound;
      round += 1;
    }
  }

  if (chars < target) {
    next = finalizeMissionProsePack(next, input, { min: target, target });
    chars = countBlogBodyCharsWithSpaces(next);
  }

  next = applyEditorDuplicateSweep(next, { input, ...ctx }, "blog");
  chars = countBlogBodyCharsWithSpaces(next);

  if (chars < target) {
    next = deepenMissionProseToMin(next, target, input);
    chars = countBlogBodyCharsWithSpaces(next);
    next = applyEditorDuplicateSweep(next, { input, ...ctx }, "blog");
  }

  next = applyDisplayBodyGuardPack(next, input);
  chars = countBlogBodyCharsWithSpaces(next);
  const dupFinal = detectDuplicateKillerIssues(getBlogFullText(next));

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      editorWriterLengthPass: true,
      editorWriterLengthMet: chars >= target,
      editorWriterLengthChars: chars,
      editorWriterLengthTarget: target,
      editorWriterLengthDupOk: dupFinal.ok,
    },
  };
}

/**
 * 반복 제거 + (필요 시) 작가 관점 분량 보강 — 송출 직전 SSOT
 */
export function applyEditorWriterDeliveryPass(pack, input = {}, ctx = {}) {
  if (!pack?.sections?.length) return pack;
  return applyEditorWriterLengthPass(pack, input, ctx);
}
