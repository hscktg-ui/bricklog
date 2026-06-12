/**
 * LLM 원고 보존 — researchGroundedHumanPack 전체 교체 대신 팩트·서사 보강
 */
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  weaveResearchFactsIntoPack,
  hasUsableResearchFacts,
} from "@/lib/content/researchGroundedHumanPack";
import { isLlmOriginatedPack } from "@/lib/product/contentQualityDelivery";
import { applyHumanColumnProsePass } from "@/lib/product/humanColumnProseEngine";

/**
 * LLM 본문이 있으면 전체 교체 대신 팩트·서사 pass만 적용 (분량은 별도 tier pass)
 * @returns {object|null} 보강된 pack 또는 null(교체 경로 유지)
 */
export function expandLlmPackPreservingBody(pack, input = {}) {
  if (!pack?.sections?.length || !isLlmOriginatedPack(pack, input)) return null;

  const sectionCount = pack.sections?.length || 0;
  if (sectionCount < 2) return null;

  const before = countBlogBodyCharsWithSpaces(pack);

  let next = pack;
  if (hasUsableResearchFacts(input)) {
    next = weaveResearchFactsIntoPack(next, input);
  }
  next = applyHumanColumnProsePass(next, input, { force: true });

  const after = countBlogBodyCharsWithSpaces(next);
  if (after < before * 0.85) return null;

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      llmBodyPreserveRescue: true,
      llmBodyPreserveBefore: before,
      llmBodyPreserveAfter: after,
    },
  };
}
