/**
 * BRICLOG Industry Context — 업종 키·flavor SSOT (미션·Human Story·검수 공통)
 */
import { getIndustryFlavor } from "@/lib/prompts/engine/industryFlavor";
import { resolveIndustryCategoryKey } from "@/lib/product/industryCategoryKey";

/** @param {object} input */
export function resolveBriclogIndustryKey(input = {}) {
  return resolveIndustryCategoryKey(input);
}

/** @param {object} input */
export function getIndustryFlavorForInput(input = {}) {
  const key = resolveBriclogIndustryKey(input);
  const mapped =
    key === "salon" || key === "pet"
      ? key
      : [
          "flower",
          "hospital",
          "furniture",
          "cafe",
          "restaurant",
          "tea_cafe",
          "pet_cafe",
          "marketing",
          "snack",
          "salon",
          "pension",
          "education",
          "craft",
          "construction",
          "carwash",
          "saas",
          "lawyer",
          "public",
          "default",
        ].includes(key)
        ? key
        : "default";
  return { key: mapped, flavor: getIndustryFlavor(mapped) };
}

export function isFurnitureIndustry(input = {}) {
  return resolveBriclogIndustryKey(input) === "furniture";
}

export function isExhibitionTopic(input = {}) {
  const raw = String(input.topic || input.mainKeyword || "").toLowerCase();
  return /전시|오픈|런칭|소식|오피모|신제품|프로모/.test(raw);
}
