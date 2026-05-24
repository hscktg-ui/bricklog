import { getIndustryFlavor as getLegacyFlavor } from "@/lib/prompts/engine/industryFlavor";
import {
  BUSINESS_TYPE_OPTIONS,
  findIndustryEntry,
  getBusinessTypeBase,
  getDefaultIndustry,
  getIndustriesForType,
  INDUSTRY_BY_TYPE,
} from "./matrix";

export {
  BUSINESS_TYPE_OPTIONS,
  INDUSTRY_BY_TYPE,
  getIndustriesForType,
  getDefaultIndustry,
  findIndustryEntry,
};

/**
 * 1차×2차 매트릭스 → 엔진용 flavor 프로필
 */
export function resolveBusinessProfile(businessType, industryValue) {
  const entry = findIndustryEntry(businessType, industryValue);
  const base = getBusinessTypeBase(businessType);
  const legacy = entry?.legacyKey ? getLegacyFlavor(entry.legacyKey) : null;

  const label = entry?.label || legacy?.label || "로컬 매장";
  const titlePatterns =
    legacy?.titlePatterns ||
    [
      "{region} {main}, {brand}에서 알아볼 기준",
      "{main} 찾을 때 {region} 체크 포인트",
      "{region} {sub} — 방문 전 정리",
      "{brand} {main} 이야기",
      "{region} 근처 {main} 가이드",
    ];

  return {
    businessType,
    industryKey: entry?.value || industryValue,
    legacyKey: entry?.legacyKey || null,
    label,
    spaceWord: legacy?.spaceWord || base.spaceWord,
    moodWords: legacy?.moodWords || base.moodWords,
    productWord: legacy?.productWord || base.productWord,
    visitReason: legacy?.visitReason || base.visitReason,
    forbidden: legacy?.forbidden || [],
    titlePatterns,
    naverStyle: base.naverStyle,
    matrixHint: entry?.label,
  };
}

/** 레거시 industry 단일값 → matrix */
export function inferMatrixFromLegacy(legacyKey) {
  for (const [bt, list] of Object.entries(INDUSTRY_BY_TYPE)) {
    const hit = list.find((i) => i.legacyKey === legacyKey || i.value === legacyKey);
    if (hit) return { businessType: bt, industry: hit.value };
  }
  return { businessType: "localVisit", industry: "restaurant" };
}

export function resolveIndustryKey(input) {
  if (input?.businessType && input?.industry) {
    return findIndustryEntry(input.businessType, input.industry).value;
  }
  const raw = (
    typeof input === "string" ? input : input?.industry || ""
  ).trim();
  if (!raw) return "restaurant";

  for (const list of Object.values(INDUSTRY_BY_TYPE)) {
    const hit = list.find(
      (i) =>
        i.value === raw ||
        i.legacyKey === raw ||
        i.keywords?.some((k) => raw.includes(k))
    );
    if (hit) return hit.value;
  }
  return raw;
}
