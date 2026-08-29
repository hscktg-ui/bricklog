/**
 * 상세는 Planned Generation. 이미지 모델에 한글 페이지를 시키지 않는다.
 */
import assert from "node:assert/strict";
import {
  DETAIL_PAGE_ASSET_ROLES,
  assignDetailPageAssetRoles,
  classifyDetailPageAssetRole,
} from "../lib/product/detailPageAssets.js";
import {
  DETAIL_PAGE_SALES_ARCHETYPES,
  DETAIL_PAGE_COMPOSITIONS,
  analyzeDetailPageProduct,
  buildDetailPagePlan,
} from "../lib/product/detailPagePlan.js";
import {
  DETAIL_PAGE_PIPELINE_STAGES,
  assessDetailPageSmell,
  buildDetailPagePipeline,
} from "../lib/product/detailPagePipeline.js";
import { buildDetailPageShotPrompt } from "../lib/product/detailPageShotGen.js";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";
import { renderDetailPageBodyHtml } from "../lib/product/detailPageHtml.js";

assert.equal(DETAIL_PAGE_ASSET_ROLES.some((r) => r.id === "model"), false);
assert.equal(classifyDetailPageAssetRole({ slot: "hero" }), "packshot");
assert.equal(classifyDetailPageAssetRole({ slot: "observe" }), "detail");
assert.equal(assignDetailPageAssetRoles([{ src: "a" }])[0].role, "packshot");

const rice = {
  productName: "여주 햅쌀 10kg",
  brandName: "여주미곡",
  region: "여주",
  industry: "쌀",
  target: "집밥 차리는 손님",
  searchIntent: "포장만 보고 밥맛까지는 가늠이 안 된다",
  features: "당일 도정\n진공 포장\n여주 수확",
  pageLength: "standard",
};
const riceIntel = analyzeDetailPageProduct(rice);
assert.equal(riceIntel.category, "grocery");
assert.equal(riceIntel.archetype, DETAIL_PAGE_SALES_ARCHETYPES.grocery);
assert.equal(riceIntel.archetype, "ingredient_trust");
assert.ok(riceIntel.sellingPoints.length >= 3);

const ricePlan = buildDetailPagePlan(rice, []);
assert.equal(ricePlan.ok, true);
assert.equal(ricePlan.sections[0].id, "hero");
assert.equal(ricePlan.sections[ricePlan.sections.length - 1].id, "cta");
assert.equal(ricePlan.sections[0].composition, DETAIL_PAGE_COMPOSITIONS.hero);
assert.equal(ricePlan.sections[0].imageRequirement.type, "generated_packshot");
assert.ok(ricePlan.order.includes("산지"));
assert.equal(
  ricePlan.sections.some((s) => s.imageRequirement.type === "generated_model"),
  false
);

const riceWithPhoto = buildDetailPagePlan(rice, [
  { src: "https://example.com/bag.jpg", role: "packshot" },
]);
assert.equal(riceWithPhoto.sections[0].imageRequirement.type, "original");

const furniture = buildDetailPagePlan({
  productName: "원목 식탁",
  industry: "가구",
  features: "참나무\n1800mm",
  pageLength: "standard",
});
assert.equal(furniture.archetype, "technical_authority");
assert.ok(furniture.order.includes("소재"));

const salon = buildDetailPagePlan({
  productName: "두피 케어 샴푸",
  industry: "미용실",
  features: "저자극",
  pageLength: "standard",
});
assert.equal(salon.archetype, "problem_solution");

assert.deepEqual(
  [...DETAIL_PAGE_PIPELINE_STAGES],
  [
    "intelligence",
    "plan",
    "art",
    "imageDirector",
    "productPhoto",
    "copy",
    "layout",
    "render",
    "critic",
  ]
);

const pack = buildDetailPageFallbackPack(rice);
const html = renderDetailPageBodyHtml(pack, []);
assert.ok(html.includes('data-pipeline="planned"'));
assert.ok(html.includes('data-korean-in-image="0"'));
assert.ok(html.includes('data-image-gen="product-only"'));
assert.ok(html.includes('data-composition="H02-image-then-nameplate"'));
assert.ok(html.includes('data-composition="P02-question-stack"'));
assert.ok(html.includes('data-composition="E02-quiet-board"'));
assert.equal(pack._meta.pipeline.oneShot, false);
assert.equal(pack._meta.pipeline.koreanOnPageNotInPhoto, true);
assert.equal(pack._meta.pipeline.imageGenStage, 5);
assert.equal(pack._meta.plan.archetype, "ingredient_trust");
assert.equal(pack._meta.success.hard.includes("planned_generation"), false);

const pipe = buildDetailPagePipeline(rice, pack, html);
assert.equal(pipe.ok, true);
assert.equal(pipe.smell.aiGeneratedFeel <= 20, true);

const smellOneshot = assessDetailPageSmell({ html, plan: ricePlan, oneShot: true });
assert.equal(smellOneshot.ok, false);
assert.ok(smellOneshot.problems.includes("one_shot_page_image"));

const prompt = buildDetailPageShotPrompt("hero", rice);
assert.ok(prompt.includes("Not a webpage"));
assert.ok(prompt.includes("Not a Korean detail page"));
assert.equal(/smartstore detail page/i.test(prompt), false);
assert.ok(prompt.includes("No Korean copy"));
assert.ok(prompt.includes("Preserve product identity"));
assert.ok(prompt.includes("bottom 40% empty negative space"));

console.log(
  `ok detail-page-pipeline rice=${ricePlan.archetype} furniture=${furniture.archetype} salon=${salon.archetype}`
);
