/**
 * 브릭로그 상세 — AI Ecommerce Art Director.
 * 웹사이트·랜딩·SaaS UI를 만들지 않는다.
 * 만드는 것은 860~1200px 세로형 상품 상세 이미지 시퀀스다.
 */
import { buildDetailPageCategoryListing } from "@/lib/product/detailPageCategoryFlow";
import { resolveDetailPageLength } from "@/lib/product/detailPageCatalog";
import {
  DETAIL_PAGE_MALL_SEQUENCE,
  DETAIL_PAGE_RANKING_SEQUENCE,
} from "@/lib/product/detailPageRankingPlaybook";
import { pickDetailPageAsset } from "@/lib/product/detailPageAssets";
import { resolveDetailPageStylePreset } from "@/lib/product/detailPageStylePreset";

export const DETAIL_PAGE_ECOMMERCE_OS_VERSION = "detail-ecom-os-v1";

export const DETAIL_PAGE_DIRECTOR_ROLE = Object.freeze({
  is: "Senior Ecommerce Art Director · Commercial Advertising Designer",
  isNot: ["웹디자이너", "랜딩 빌더", "SaaS UI"],
  makes: "상품을 판매하기 위한 세로형 광고 이미지 시퀀스",
  notMakes: ["웹사이트", "랜딩페이지", "앱 UI", "대시보드"],
});

export const DETAIL_PAGE_ECOM_PRINCIPLES = Object.freeze([
  "PRODUCT FIRST",
  "IMAGE DOMINANT",
  "EDITORIAL COMPOSITION",
  "COMMERCIAL PHOTOGRAPHY",
  "VISUAL RHYTHM",
  "KOREAN ECOMMERCE",
  "NO UI FEEL",
  "ONE MESSAGE PER SECTION",
]);

export const DETAIL_PAGE_FORBIDDEN_WEB_UI = Object.freeze([
  "navigation",
  "header",
  "footer",
  "menu",
  "cta_button",
  "browser_mockup",
  "app_interface",
  "dashboard",
  "saas_landing",
  "three_column_cards",
  "icon_grid",
  "pricing_table",
  "floating_cards",
  "website_hero",
  "testimonial_cards",
  "navbar",
]);

export const DETAIL_PAGE_EXPORT_WIDTHS = Object.freeze([860, 900, 1000, 1200]);
export const DETAIL_PAGE_EXPORT_FORMATS = Object.freeze(["png", "jpg", "webp"]);

export const DETAIL_PAGE_SALES_STRATEGIES = Object.freeze([
  "problem_solution",
  "premium_brand",
  "performance_sales",
  "lifestyle",
  "technical",
  "comparison",
  "storytelling",
  "ingredient_trust",
]);

export const DETAIL_PAGE_COMPOSITION_BANK = Object.freeze([
  "full_bleed",
  "centered_product",
  "product_left_text_right",
  "product_right_text_left",
  "macro_detail",
  "editorial_layout",
  "asymmetric_layout",
  "lifestyle_scene",
  "split_screen",
  "typography_focus",
  "comparison_layout",
  "specification_layout",
  "product_stack",
  "close_up_crop",
  "negative_space",
  "dramatic_hero",
]);

const STRATEGY_BY_CATEGORY = Object.freeze({
  grocery: "ingredient_trust",
  cafe: "ingredient_trust",
  restaurant: "ingredient_trust",
  beauty: "premium_brand",
  appliance: "performance_sales",
  furniture: "technical",
  salon: "problem_solution",
  default: "problem_solution",
});

function imageRequirement(sectionType, assets = []) {
  if (sectionType === "hero") {
    const original = pickDetailPageAsset(assets, ["packshot", "front", "package"]);
    return {
      type: original ? "original" : "generated_packshot",
      preserveProduct: true,
      negativeSpace: "bottom",
      subjectPosition: "center",
    };
  }
  if (sectionType === "observe" || sectionType === "feature") {
    const original = pickDetailPageAsset(assets, ["detail", "packshot", "front"]);
    return {
      type: original ? "original" : "generated_packshot",
      preserveProduct: true,
      negativeSpace: "none",
      subjectPosition: "center",
    };
  }
  if (sectionType === "scene") {
    const original = pickDetailPageAsset(assets, ["usage"]);
    return {
      type: original ? "original" : "none",
      preserveProduct: true,
      negativeSpace: "none",
    };
  }
  return { type: "none", preserveProduct: true, negativeSpace: "none" };
}

function pickComposition(purpose, used) {
  const prefer = {
    attention: ["dramatic_hero", "full_bleed", "centered_product"],
    hook: ["dramatic_hero", "full_bleed", "centered_product"],
    info: ["typography_focus", "editorial_layout"],
    listing: ["specification_layout", "typography_focus"],
    ingredient: ["macro_detail", "close_up_crop"],
    material: ["full_bleed", "editorial_layout"],
    package: ["centered_product", "product_stack"],
    shipping: ["specification_layout", "typography_focus"],
    notice: ["split_screen", "typography_focus"],
    desire: ["lifestyle_scene", "editorial_layout", "negative_space"],
    problem: ["typography_focus", "asymmetric_layout"],
    solution: ["product_left_text_right", "editorial_layout"],
    primary_usp: ["product_right_text_left", "split_screen"],
    secondary_usp: ["close_up_crop", "macro_detail"],
    detail: ["macro_detail", "close_up_crop"],
    proof: ["negative_space", "typography_focus"],
    experience: ["lifestyle_scene", "full_bleed"],
    comparison: ["comparison_layout", "split_screen"],
    specification: ["specification_layout"],
    spec: ["specification_layout"],
    closing: ["centered_product", "typography_focus"],
  };
  const bank = prefer[purpose] || ["editorial_layout"];
  const pick = bank.find((c) => !used.has(c)) || bank[0];
  used.add(pick);
  return pick;
}

function heightFor(purpose) {
  if (purpose === "attention" || purpose === "hook" || purpose === "closing" || purpose === "notice") return 1200;
  if (purpose === "desire" || purpose === "experience" || purpose === "package") return 1400;
  if (purpose === "detail" || purpose === "ingredient") return 1000;
  if (purpose === "comparison" || purpose === "listing") return 900;
  if (purpose === "specification" || purpose === "spec" || purpose === "shipping") return 1100;
  if (purpose === "problem" || purpose === "info") return 860;
  return 1000;
}

function storyboardFor(strategy, listing) {
  if (strategy === "ingredient_trust") {
    return DETAIL_PAGE_MALL_SEQUENCE.map((s) => ({
      id: s.slot,
      purpose: s.beat,
      they: s.they,
      we: s.we,
    }));
  }
  if (strategy === "premium_brand") {
    return [
      { id: "hero", purpose: "attention" },
      { id: "observe", purpose: "desire" },
      { id: "feature", purpose: "detail" },
      { id: "scene", purpose: "experience" },
      { id: "usp", purpose: "primary_usp" },
      { id: "explain", purpose: "solution" },
      { id: "spec", purpose: "specification" },
      { id: "brand", purpose: "proof" },
      { id: "cta", purpose: "closing" },
    ];
  }
  if (strategy === "performance_sales" || strategy === "technical") {
    return [
      { id: "hero", purpose: "attention" },
      { id: "intent", purpose: "problem" },
      { id: "usp", purpose: "primary_usp" },
      { id: "feature", purpose: "detail" },
      { id: "explain", purpose: "solution" },
      { id: "spec", purpose: "specification" },
      { id: "scene", purpose: "experience" },
      { id: "brand", purpose: "proof" },
      { id: "cta", purpose: "closing" },
    ];
  }
  const length = resolveDetailPageLength("standard");
  return length.sectionIds.map((id) => {
    const rank = DETAIL_PAGE_RANKING_SEQUENCE.find((s) => s.slot === id);
    const purpose =
      id === "hero"
        ? "attention"
        : id === "intent"
          ? "problem"
          : id === "explain"
            ? "solution"
            : id === "usp"
              ? "primary_usp"
              : id === "observe"
                ? "detail"
                : id === "feature"
                  ? "secondary_usp"
                  : id === "scene"
                    ? "experience"
                    : id === "spec"
                      ? "specification"
                      : id === "cta"
                        ? "closing"
                        : "proof";
    return { id, purpose, they: rank?.they, we: rank?.we };
  });
}

export function buildDetailPageIntelligence(input = {}) {
  const listing = buildDetailPageCategoryListing(input);
  const features = String(input.features || "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    product_name: input.productName || "",
    category: listing.key,
    target_customer: input.target || "",
    price_position: input.price || "",
    core_problem: String(input.searchIntent || "").slice(0, 80),
    primary_usp: features[0] || listing.filled[0]?.value || "",
    secondary_usp: features[1] || listing.filled[1]?.value || "",
    customer_pain_points: input.searchIntent ? [input.searchIntent] : [],
    purchase_motivations: listing.filled.slice(0, 3).map((s) => s.label),
    functional_benefits: listing.filled.map((s) => `${s.label} ${s.value}`.trim()),
    emotional_benefits: input.target || "",
    visual_strength: "uploaded_pack_first",
    trust_elements: [input.producer, input.shipping, input.dispatch].filter(Boolean),
    product_material: listing.materialLines[0] || "",
    required_information: listing.filled.map((s) => s.label),
    prohibitedClaims: listing.doNotInvent || [],
    archetype: STRATEGY_BY_CATEGORY[listing.key] || STRATEGY_BY_CATEGORY.default,
    sellingPoints: listing.filled.slice(0, 5).map((s, i) => ({
      title: s.label,
      evidence: s.value,
      priority: i + 1,
    })),
  };
}

export function pickDetailPageSalesStrategy(input = {}, intelligence) {
  const preset = resolveDetailPageStylePreset(input);
  if (preset.strategy) return preset.strategy;
  const category = intelligence?.category || buildDetailPageCategoryListing(input).key;
  return STRATEGY_BY_CATEGORY[category] || STRATEGY_BY_CATEGORY.default;
}

export function buildDetailPageArtDirection(section, input = {}, used = new Set()) {
  const preset = resolveDetailPageStylePreset(input);
  const composition = pickComposition(section.purpose, used);
  return {
    section: section.id,
    purpose: section.purpose,
    message: section.we || section.purpose,
    visual_type: "studio_product_photography",
    composition,
    product_scale: section.purpose === "detail" ? 0.88 : 0.72,
    background_style: preset.background,
    camera_style: "85mm commercial photography",
    lighting_style: "soft directional light",
    headline_size: section.purpose === "attention" ? "large" : "medium",
    body_text: section.purpose === "specification" || section.purpose === "problem",
    text_alignment: "left",
    image_ratio: section.purpose === "problem" || section.purpose === "specification" ? 0.35 : 0.78,
    visual_density: section.purpose === "detail" ? "high" : "low",
    ui_elements: false,
    height: heightFor(section.purpose),
    palette: preset.palette,
  };
}

export function buildDetailPageStoryboard(input = {}, assets = []) {
  const listing = buildDetailPageCategoryListing(input);
  const intelligence = buildDetailPageIntelligence(input);
  const strategy = pickDetailPageSalesStrategy(input, intelligence);
  const preset = resolveDetailPageStylePreset(input);
  const used = new Set();
  const frames = storyboardFor(strategy, listing).map((frame, i) => {
    const art = buildDetailPageArtDirection(frame, input, used);
    return {
      id: frame.id,
      role: frame.id,
      purpose: frame.purpose,
      they: frame.they || frame.purpose,
      we: frame.we || frame.purpose,
      composition: art.composition,
      art,
      imageRequirement: imageRequirement(frame.id, assets),
      n: i + 1,
    };
  });
  return {
    version: DETAIL_PAGE_ECOMMERCE_OS_VERSION,
    ok: frames[0]?.id === "hero" && frames[frames.length - 1]?.id === "cta",
    customOrder: strategy !== "ingredient_trust" && strategy !== "problem_solution",
    archetype: strategy,
    strategy,
    category: listing.key,
    preset: preset.id,
    palette: preset.palette,
    order: listing.textFlow,
    intelligence,
    sections: frames,
    principles: DETAIL_PAGE_ECOM_PRINCIPLES,
    forbidden: DETAIL_PAGE_FORBIDDEN_WEB_UI,
  };
}
