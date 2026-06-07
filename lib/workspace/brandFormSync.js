/** 브랜드·초안 로드 시 모든 지연 폼(draft)을 committed 값으로 맞춤 */

export const BRAND_FORM_SYNC_EVENT = "briclog-brand-form-sync";

export function emitBrandFormSync(form) {
  if (typeof window === "undefined" || !form) return;
  window.dispatchEvent(
    new CustomEvent(BRAND_FORM_SYNC_EVENT, { detail: { form } })
  );
}

const GENERATION_AXIS_KEYS = ["brandName", "region", "topic", "mainKeyword"];

/** 빈 문자열이 committed 값을 덮어쓰지 않게 병합 (지연 폼 flush 전 생성 클릭) */
export function coalesceBlogGenerationInput(base = {}, override = {}) {
  const next = { ...base, ...override };
  for (const key of GENERATION_AXIS_KEYS) {
    const over = String(override[key] ?? "").trim();
    const kept = String(base[key] ?? "").trim();
    if (!over && kept) next[key] = base[key];
  }
  return next;
}

function brandHooksFromPipelineInput(input = {}) {
  const brand = input.brandMemory;
  const brandId = input.brandId;
  if (!brand?.brandName?.trim() && !brandId) return null;
  return { activeBrand: brand, activeBrandId: brandId };
}

/** 사이드바 선택 브랜드 → 폼·파이프라인 축 보강 */
export function mergeWorkspaceBrandIntoInput(input = {}, brandHooks = null) {
  const hooks =
    brandHooks ||
    brandHooksFromPipelineInput(input) ||
    null;
  const brand = hooks?.activeBrand;
  const brandId = hooks?.activeBrandId;
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
  if (!next.topic?.trim() && brand?.topic?.trim()) {
    next.topic = brand.topic.trim();
  }
  if (!next.mainKeyword?.trim() && brand?.mainKeyword?.trim()) {
    next.mainKeyword = brand.mainKeyword.trim();
  }
  if (!next.topic?.trim() && !next.mainKeyword?.trim() && next.brandName?.trim()) {
    const seed = next.brandName.trim();
    next.topic = `${seed} 소식`;
    next.mainKeyword = seed.replace(/\s+/g, "").slice(0, 24) || seed;
  }
  return next;
}
