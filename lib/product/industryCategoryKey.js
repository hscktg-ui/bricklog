/**
 * 업종·조사 카테고리 키 SSOT — resolveBriclogIndustryKey · resolveResearchCategoryKey 단일 소스
 */
import { mapIndustryEmojiKey } from "@/lib/emoji/emojiEngine";

const PET_CAFE_RE =
  /애견\s*카페|반려견\s*카페|펫\s*카페|도그\s*카페|dog\s*cafe|댕댕이\s*카페/;

const FURNITURE_RE =
  /가구|소파|쇼파|침대|매트리스|스트레스리스|stressless|리클라이너|모션\s*베드|모션베드|붙박이|거실\s*가구|침실\s*가구|가구\s*매장|가구\s*전시|인테리어\s*쇼룸|체어|다이닝\s*체어|소파\s*배송/;

/** @param {object} input */
export function resolveIndustryCategoryKey(input = {}) {
  const industryField = String(input.industry || input.industryLabel || "").trim();
  const blob = `${industryField} ${input.topic || ""} ${input.mainKeyword || ""} ${input.brandName || ""} ${input.storeFeatures || ""}`.toLowerCase();

  if (/^(가구|furniture|침대|소파|매트리스|침대·매트리스|스트레스리스)/i.test(industryField)) {
    return "furniture";
  }
  if (FURNITURE_RE.test(blob)) return "furniture";
  if (/^(쌀|쌀가게|미곡|양곡|잡곡|grocery)/i.test(industryField)) return "grocery";
  if (/^(카페|cafe|커피\s*숍|커피숍|coffee\s*shop)/i.test(industryField)) return "cafe";
  if (/^(꽃|플라워|flower)/i.test(industryField)) return "flower";
  if (/^(치과|병원|의원|한의|hospital|clinic)/i.test(industryField)) return "hospital";
  if (/미용|헤어|염색|펌|두피|네일|살롱|barber/.test(blob)) return "salon";
  if (/학원|교육|과외|어학|특강|academy/.test(blob)) return "education";
  if (/공방|원데이|체험\s*클래스|도자기|핸드메이드|공예|workshop/.test(blob)) {
    return "craft";
  }
  if (/펜션|숙박|게스트하우스|민박|호텔/.test(blob)) return "pension";
  if (/세차|카워시|디테일링|세차장|carwash/.test(blob)) return "carwash";
  if (/saas|software|플랫폼|솔루션|b2b/.test(blob)) return "saas";
  if (/변호|법률|법무|로펌/.test(blob)) return "lawyer";
  if (/공공|관공|시청|구청|주민센터/.test(blob)) return "public";
  if (
    /인테리어|리모델|시공|건설|construction/.test(blob) &&
    !/카페|커피|cafe|브런치|디저트|베이커리/.test(blob)
  ) {
    return "construction";
  }
  if (/카페|커피|브런치|디저트|원두|베이커리|f&b/.test(blob)) {
    return "cafe";
  }
  if (/마케팅|광고|홍보|에이전시|대행|브랜딩|바이럴|콘텐츠\s*마케팅|블로그\s*마케팅|디지털\s*마케팅|sns|인스타그램\s*마케팅/.test(blob)) {
    return "marketing";
  }
  if (PET_CAFE_RE.test(blob)) return "pet_cafe";
  if (/티\s*카페|tea\s*cafe|티하우스|다실|차\s*전문|보이차|우롱차/.test(blob)) return "tea_cafe";
  if (/음식점|레스토랑|식당|해물|고깃|한정식|코스요리/.test(blob)) {
    return "restaurant";
  }
  if (/쌀|햅쌀|미곡|잡곡|양곡|농산물/.test(blob)) return "grocery";
  const emojiKey = mapIndustryEmojiKey(input);
  if (emojiKey && emojiKey !== "default") return emojiKey;
  if (/수제\s*간식|건조\s*간식|펫푸드|영양\s*성분|급여\s*방법/.test(blob)) return "snack";
  if (/애견|반려|펫|간식|pet|snack/.test(blob)) return "pet";
  return "default";
}

/** @deprecated alias — 조사·coverage·검색 확장 공통 */
export function resolveResearchCategoryKey(input = {}) {
  return resolveIndustryCategoryKey(input);
}
