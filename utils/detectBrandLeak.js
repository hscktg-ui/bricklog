import { findForeignBrand } from "@/lib/integrity/templateIntegrity";

export function detectBrandLeak(text, brandName) {
  const leaks = findForeignBrand(text, brandName);
  return {
    hasLeak: leaks.length > 0,
    brands: leaks,
    score: leaks.length ? 40 : 95,
  };
}
