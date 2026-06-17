/**
 * brandScopeGuard + industry key smoke
 */
import assert from "node:assert/strict";
import {
  brandNamesMatch,
  shouldMergeWorkspaceBrand,
  resolveFallbackBrandForForm,
  resolveBrandIdForGeneration,
} from "../lib/workspace/brandScopeGuard.js";
import { resolveBriclogIndustryKey } from "../lib/product/industryContextEngine.js";
import { buildProvisionalBrandFromForm } from "../lib/brands/resolveBrandForForm.js";

assert.equal(brandNamesMatch("스트레스리스 파주", "스트레스리스"), true);
assert.equal(brandNamesMatch("꽃집 A", "스트레스리스"), false);

const flowerBrand = { id: "b1", brandName: "여름꽃집", industry: "꽃" };
assert.equal(
  shouldMergeWorkspaceBrand({ brandName: "스트레스리스" }, flowerBrand, "b1"),
  false
);
assert.equal(
  resolveFallbackBrandForForm({ brandName: "스트레스리스" }, flowerBrand),
  null
);

const provisional = buildProvisionalBrandFromForm(
  { brandName: "스트레스리스", topic: "전시" },
  flowerBrand
);
assert.equal(provisional.brandName, "스트레스리스");
assert.notEqual(provisional.industry, "꽃");

assert.equal(
  resolveBrandIdForGeneration(
    { brandName: "스트레스리스" },
    { activeBrand: flowerBrand, activeBrandId: "b1" }
  ),
  null
);

const stresslessKey = resolveBriclogIndustryKey({
  brandName: "스트레스리스",
  topic: "파주 스트레스리스 라인업 3종 전시",
  mainKeyword: "스트레스리스",
});
assert.equal(stresslessKey, "furniture");

console.log("[brand-scope-industry] ok");
