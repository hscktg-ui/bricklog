/**
 * 브랜드명 기반 특성 추론 (검색 API 전)
 * 가상 예시 브랜드에만 매칭 — 실제 거래처명 패턴 금지
 */
import { FICTIONAL_BRAND_NAME_PROFILES } from "@/lib/examples/fictionalBrands";

export const BRAND_NAME_PROFILES = FICTIONAL_BRAND_NAME_PROFILES;

export function inferBrandProfile(brandName) {
  if (!brandName?.trim()) return null;
  const name = brandName.trim();
  for (const p of BRAND_NAME_PROFILES) {
    if (p.match.test(name)) {
      return { ...p, matchedName: name };
    }
  }
  return null;
}
