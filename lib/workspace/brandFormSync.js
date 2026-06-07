/** 브랜드·초안 로드 시 모든 지연 폼(draft)을 committed 값으로 맞춤 */

export const BRAND_FORM_SYNC_EVENT = "briclog-brand-form-sync";

export function emitBrandFormSync(form) {
  if (typeof window === "undefined" || !form) return;
  window.dispatchEvent(
    new CustomEvent(BRAND_FORM_SYNC_EVENT, { detail: { form } })
  );
}

/** 사이드바 선택 브랜드 → 폼·파이프라인 축 보강 */
export function mergeWorkspaceBrandIntoInput(input = {}, brandHooks = null) {
  const brand = brandHooks?.activeBrand;
  const brandId = brandHooks?.activeBrandId;
  if (!brand?.brandName?.trim() && !brandId) return input;

  const next = { ...input };
  if (!next.brandName?.trim() && brand?.brandName?.trim()) {
    next.brandName = brand.brandName.trim();
  }
  if (
    (!next.region?.trim() || next.region.trim().length < 2) &&
    brand?.region?.trim()?.length >= 2
  ) {
    next.region = brand.region.trim();
  }
  if (!next.brandId && brandId) next.brandId = brandId;
  if (!next.industry?.trim() && brand?.industry?.trim()) {
    next.industry = brand.industry.trim();
  }
  return next;
}
