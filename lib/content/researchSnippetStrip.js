/**
 * 네이버 스니펫 제거 후 조사 팩트 재주입 — delivery 순환 import 방지
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { stripSearchSnippetLeakFromPack } from "@/lib/product/brandJournalistDirective";
import {
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack";

function bodyCharCount(pack) {
  const n = countBlogBodyCharsWithSpaces(pack);
  return n > 0 ? n : getBlogFullText(pack).replace(/\s/g, "").length;
}

/**
 * @param {object} pack
 * @param {object} input
 * @param {{ reweaveRatio?: number }} [options]
 */
export function stripSearchSnippetLeakAndPreserveResearch(
  pack,
  input = {},
  options = {}
) {
  if (!pack) return pack;
  const ratio = options.reweaveRatio ?? 0.9;
  const before = bodyCharCount(pack);
  let next = stripSearchSnippetLeakFromPack(pack, input);
  const after = bodyCharCount(next);
  if (hasUsableResearchFacts(input) && before > 80 && after < before * ratio) {
    next = weaveResearchFactsIntoPack(next, input);
  }
  return next;
}
