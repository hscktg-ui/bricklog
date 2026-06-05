/**
 * BRICLOG Industry Context — 업종 키·flavor SSOT (미션·Human Story·검수 공통)
 */
import { getIndustryFlavor } from "@/lib/prompts/engine/industryFlavor";
import { mapIndustryEmojiKey } from "@/lib/emoji/emojiEngine";
import { resolveResearchCategoryKey } from "@/lib/research/searchExpansionEngine";

/** @param {object} input */
export function resolveBriclogIndustryKey(input = {}) {
  const blob = `${input.industry || ""} ${input.industryLabel || ""} ${input.topic || ""} ${input.mainKeyword || ""} ${input.brandName || ""}`.toLowerCase();
  if (/미용|헤어|염색|펌|두피|네일|살롱|barber/.test(blob)) return "salon";
  if (/마케팅|광고|홍보|에이전시|대행|브랜딩|바이럴|콘텐츠\s*마케팅|블로그\s*마케팅|디지털\s*마케팅|sns|인스타그램\s*마케팅/.test(blob)) {
    return "marketing";
  }
  if (mapIndustryEmojiKey(input)) return mapIndustryEmojiKey(input);
  const research = resolveResearchCategoryKey(input);
  if (research && research !== "default") return research;
  if (/애견|반려|펫|간식|pet|snack|펫푸드/.test(blob)) return "pet";
  return "default";
}

/** @param {object} input */
export function getIndustryFlavorForInput(input = {}) {
  const key = resolveBriclogIndustryKey(input);
  const mapped =
    key === "salon" || key === "pet"
      ? key
      : ["flower", "hospital", "furniture", "cafe", "marketing", "default"].includes(key)
        ? key
        : "default";
  return { key: mapped, flavor: getIndustryFlavor(mapped) };
}

export function isFurnitureIndustry(input = {}) {
  return resolveBriclogIndustryKey(input) === "furniture";
}

export function isExhibitionTopic(input = {}) {
  const raw = String(input.topic || input.mainKeyword || "").toLowerCase();
  return /전시|오픈|런칭|소식|오피모|신제품|프로모/.test(raw);
}
