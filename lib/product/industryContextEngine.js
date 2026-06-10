/**
 * BRICLOG Industry Context — 업종 키·flavor SSOT (미션·Human Story·검수 공통)
 */
import { getIndustryFlavor } from "@/lib/prompts/engine/industryFlavor";
import { mapIndustryEmojiKey } from "@/lib/emoji/emojiEngine";
import { resolveResearchCategoryKey } from "@/lib/research/searchExpansionEngine";

const PET_CAFE_RE =
  /애견\s*카페|반려견\s*카페|펫\s*카페|도그\s*카페|dog\s*cafe|댕댕이\s*카페/;

/** @param {object} input */
export function resolveBriclogIndustryKey(input = {}) {
  const blob = `${input.industry || ""} ${input.industryLabel || ""} ${input.topic || ""} ${input.mainKeyword || ""} ${input.brandName || ""}`.toLowerCase();
  if (/미용|헤어|염색|펌|두피|네일|살롱|barber/.test(blob)) return "salon";
  if (/학원|교육|과외|어학|특강|academy/.test(blob)) return "education";
  if (/공방|원데이|체험\s*클래스|도자기|핸드메이드|공예|workshop/.test(blob)) {
    return "craft";
  }
  if (/펜션|숙박|게스트하우스|민박|호텔/.test(blob)) return "pension";
  if (/인테리어|리모델|시공|건설|construction/.test(blob)) return "construction";
  if (/마케팅|광고|홍보|에이전시|대행|브랜딩|바이럴|콘텐츠\s*마케팅|블로그\s*마케팅|디지털\s*마케팅|sns|인스타그램\s*마케팅/.test(blob)) {
    return "marketing";
  }
  if (PET_CAFE_RE.test(blob)) return "pet_cafe";
  if (/티\s*카페|tea\s*cafe|티하우스|다실|차\s*전문|보이차|우롱차/.test(blob)) return "tea_cafe";
  if (mapIndustryEmojiKey(input)) return mapIndustryEmojiKey(input);
  const research = resolveResearchCategoryKey(input);
  if (research && research !== "default") return research;
  if (/수제\s*간식|건조\s*간식|펫푸드|영양\s*성분|급여\s*방법/.test(blob)) return "snack";
  if (/애견|반려|펫|간식|pet|snack/.test(blob)) return "pet";
  if (/카페|커피|브런치|디저트|원두|베이커리|f&b|음식점|레스토랑/.test(blob)) {
    return "cafe";
  }
  return "default";
}

/** @param {object} input */
export function getIndustryFlavorForInput(input = {}) {
  const key = resolveBriclogIndustryKey(input);
  const mapped =
    key === "salon" || key === "pet"
      ? key
      : ["flower", "hospital", "furniture", "cafe", "tea_cafe", "pet_cafe", "marketing", "snack", "default"].includes(
          key
        )
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
