import { getBrandTypeOption } from "@/lib/brand/brandType";
import { resolveIndustryFromFreeText } from "@/lib/simpleIndustry";
import { resolveSensitiveCompliance } from "@/lib/compliance/sensitiveCategories";
import {
  getDefaultIndustry,
  resolveBusinessProfile,
} from "@/lib/prompts/businessTypes";

/**
 * 브랜드 유형 + (선택) 업종 텍스트 → 파이프라인 컨텍스트
 * 업종 미입력 시에도 생성 가능 — 꽃집/가구 전용으로 보이지 않게 함
 */
export function resolveBrandIndustryContext(input = {}) {
  const brandType = input.brandType || "other";
  const industryText = String(
    input.industryText ?? input.industry ?? ""
  ).trim();

  const typeOpt = getBrandTypeOption(brandType);
  let businessType = typeOpt.businessType;
  let industryValue = getDefaultIndustry(businessType);
  let industryLabel = industryText || typeOpt.label;

  const matched = industryText ? resolveIndustryFromFreeText(industryText) : null;
  if (matched) {
    businessType = matched.businessType;
    industryValue = matched.industry;
    industryLabel = industryText;
  }

  const flavor = resolveBusinessProfile(businessType, industryValue);
  const displayLabel = industryText || typeOpt.label;
  const sensitiveCompliance = resolveSensitiveCompliance({
    brandType,
    industryText,
    industryLabel: displayLabel,
    businessType,
  });

  return {
    brandType,
    businessType,
    industryKey: flavor.industryKey,
    industryValue,
    industryLabel: displayLabel,
    flavor: {
      ...flavor,
      label: displayLabel,
      matrixHint: industryText ? industryText : typeOpt.hint,
    },
    industryText,
    sensitiveCompliance,
  };
}
