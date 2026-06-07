/**
 * INDUSTRY CONTAMINATION ENGINE — 업종 외 문장 유입 차단
 */
import { detectIndustryCrossContamination } from "@/lib/pipeline/v2/industryLock";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { getBlogFullText } from "@/utils/qualityCheck";
export const INDUSTRY_CONTAMINATION_VERSION = "v1";

export function resolveLockedIndustryKey(input = {}) {
  const { flavor } = getIndustryFlavorForInput(input);
  return flavor?.industryKey || input.industryKey || input.industry || "default";
}

/**
 * @returns {{ ok: boolean, violations: object[], foreignHits: string[] }}
 */
export function detectIndustryContamination(textOrPack, input = {}) {
  const text =
    typeof textOrPack === "string"
      ? textOrPack
      : getBlogFullText(textOrPack);
  const lockedKey = resolveLockedIndustryKey(input);
  const cross = detectIndustryCrossContamination(text, lockedKey);

  const violations = (cross.violations || []).map((v) => ({
    type: "cross_industry",
    industry: v.foreignIndustry,
    pattern: v.pattern,
  }));

  return {
    version: INDUSTRY_CONTAMINATION_VERSION,
    ok: violations.length === 0,
    lockedKey,
    violations,
    foreignHits: violations.map((v) => v.pattern || v.sentence).filter(Boolean),
  };
}

export function assertNoIndustryContamination(pack, input = {}) {
  const result = detectIndustryContamination(pack, input);
  return {
    ok: result.ok,
    stage: "industry_contamination",
    reasons: result.ok ? [] : ["industry_contamination"],
    ...result,
    userMessage: result.ok
      ? null
      : "업종과 맞지 않는 표현이 섞였어요. 조사·업종 맥락을 확인한 뒤 다시 작성합니다.",
  };
}
