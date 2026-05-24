import { INDUSTRY_BY_TYPE } from "@/lib/prompts/businessTypes/matrix";
import { inferMatrixFromLegacy } from "@/lib/prompts/businessTypes";

/**
 * @deprecated UI 드롭다운용 — 신규 UI는 brandType + 업종 자유 입력
 */
export const SIMPLE_INDUSTRY_OPTIONS = [];

/** 자유 입력 업종 → Matrix (키워드·라벨 매칭) */
export function resolveIndustryFromFreeText(text) {
  const raw = (text || "").trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  for (const [businessType, list] of Object.entries(INDUSTRY_BY_TYPE)) {
    for (const entry of list) {
      if (
        entry.value === lower ||
        entry.label === raw ||
        entry.keywords?.some(
          (k) => lower.includes(k.toLowerCase()) || raw.includes(k)
        )
      ) {
        return {
          businessType,
          industry: entry.value,
          industryLabel: raw,
        };
      }
    }
  }
  return null;
}

/** 레거시 value 키 (flower 등) — 마이그레이션·저장 데이터 호환 */
export function resolveSimpleIndustry(value) {
  const key = (value || "").trim();
  if (!key) return null;
  const fromText = resolveIndustryFromFreeText(key);
  if (fromText) return fromText;
  if (/^[a-z_]+$/.test(key)) return inferMatrixFromLegacy(key);
  return null;
}
