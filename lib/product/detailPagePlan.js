/**
 * 상세 기획안 SSOT. 이미지 생성 전에 먼저 만든다.
 * Ecommerce Art Director 스토리보드. 통이미지 one-shot이 아니다.
 */
import { buildDetailPageStoryboard, buildDetailPageIntelligence } from "@/lib/product/detailPageEcommerceOs";

export const DETAIL_PAGE_PLAN_VERSION = "detail-plan-v2";

export const DETAIL_PAGE_SALES_ARCHETYPES = Object.freeze({
  grocery: "ingredient_trust",
  restaurant: "ingredient_trust",
  cafe: "ingredient_trust",
  beauty: "premium_brand",
  appliance: "performance_sales",
  furniture: "technical",
  salon: "problem_solution",
  default: "problem_solution",
});

/** 레거시 키. 렌더러는 섹션 art.composition을 우선한다. */
export const DETAIL_PAGE_COMPOSITIONS = Object.freeze({
  hero: "dramatic_hero",
  intent: "typography_focus",
  explain: "editorial_layout",
  usp: "product_right_text_left",
  observe: "macro_detail",
  feature: "close_up_crop",
  scene: "lifestyle_scene",
  spec: "specification_layout",
  brand: "negative_space",
  cta: "centered_product",
  notice: "typography_focus",
});

export function analyzeDetailPageProduct(input = {}) {
  return buildDetailPageIntelligence(input);
}

export function buildDetailPagePlan(input = {}, assets = []) {
  const board = buildDetailPageStoryboard(input, assets);
  return {
    ...board,
    version: DETAIL_PAGE_PLAN_VERSION,
  };
}

export function detailPageGenerateSlots(plan) {
  return (plan?.sections || [])
    .filter((s) => s.imageRequirement?.type === "generated_packshot")
    .map((s) => s.id);
}
