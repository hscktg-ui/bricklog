import {
  createEmptyBrandMemory,
  mergeBrandFromForm,
} from "@/lib/brands/brandMemory";

export function findBrandById(brands, id) {
  if (!id) return null;
  return brands.find((b) => b.id === id) || null;
}

/** 네트워크 없이 폼·기존 브랜드 목록에서 브랜드 매칭 (생성 클릭 직후 블로킹 방지) */
export function resolveBrandFromFormSync(formInput, brands, activeBrandId) {
  const name = formInput?.brandName?.trim();
  if (!name) return null;
  if (activeBrandId) {
    const cur = findBrandById(brands, activeBrandId);
    if (cur?.brandName?.trim() === name) return cur;
  }
  return brands.find((b) => b.brandName?.trim() === name) || null;
}

/** 새 브랜드 저장 전에도 파이프라인에 넘길 임시 brandMemory */
export function buildProvisionalBrandFromForm(formInput, fallbackBrand = null) {
  const name = formInput?.brandName?.trim();
  if (!name) return fallbackBrand || null;
  const base =
    fallbackBrand ||
    createEmptyBrandMemory({
      brandName: name,
      brandType: formInput.brandType || "other",
      industry: formInput.industry || "",
      region: formInput.region?.trim() || "",
    });
  return mergeBrandFromForm(base, formInput);
}
