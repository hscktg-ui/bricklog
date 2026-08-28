/**
 * 카테고리 상세 나열 — 범용 5포인트가 아니라 그 카테고리 상위 상세 순서
 */
import assert from "node:assert/strict";
import {
  buildDetailPageCategoryListing,
  formatCategoryFlowForPrompt,
  resolveDetailPageCategoryFlow,
} from "../lib/product/detailPageCategoryFlow.js";
import {
  buildDetailPageFallbackPack,
  normalizeDetailPageInput,
} from "../lib/product/detailPageEngine.js";
import { renderDetailPageBodyHtml } from "../lib/product/detailPageHtml.js";
import { gptDetailPageSystemPrompt } from "../lib/product/detailPageStandard.js";
import { DETAIL_PAGE_LENGTHS } from "../lib/product/detailPageCatalog.js";

const riceInput = normalizeDetailPageInput({
  productName: "여주 햅쌀 10kg",
  brandName: "우리쌀가게",
  region: "여주",
  industry: "쌀가게",
  target: "집밥 차리는 손님",
  searchIntent: "포장만 보고 밥맛까지는 가늠이 안 된다",
  features: "당일 도정\n진공 포장\n여주 수확",
  highlights: "당일 도정\n진공 포장\n여주 수확",
  pageLength: "standard",
});

assert.equal(resolveDetailPageCategoryFlow(riceInput).id, "grocery");
const riceList = buildDetailPageCategoryListing(riceInput);
assert.deepEqual(
  riceList.filled.map((s) => s.label),
  ["산지", "햅쌀", "도정", "중량", "포장", "원재료"]
);
assert.equal(riceList.filled.some((s) => s.label === "품종"), false);
assert.equal(riceList.filled.some((s) => s.label === "등급"), false);
const harvest = riceList.filled.find((s) => s.label === "햅쌀");
assert.ok(harvest?.value && harvest.value !== "햅쌀");
assert.ok(riceList.stepLines.some((l) => l.includes("햅쌀") && l.includes("—")));
assert.equal(riceList.specRows.some((r) => r[0] === r[1]), false);
assert.ok(riceList.specRows.some((r) => r[0] === "햅쌀" && r[1] !== "햅쌀"));
assert.ok(formatCategoryFlowForPrompt(riceInput).includes("산지 →"));
assert.ok(formatCategoryFlowForPrompt(riceInput).includes("없는 항목은 만들지 말 것"));

const rice = buildDetailPageFallbackPack(riceInput);
const riceText = JSON.stringify(rice);
assert.equal(rice._meta.categoryFlow.id, "grocery");
assert.ok(rice.sections.find((s) => s.type === "intent").bullets[0].includes("산지"));
assert.ok(rice.sections.find((s) => s.type === "intent").title.includes("이 칸부터"));
assert.equal(
  rice.sections.find((s) => s.type === "intent").title.includes("가늠이 안 된다"),
  false
);
assert.ok(rice.sections.find((s) => s.type === "hero").body.includes("가늠이 안 된다"));
assert.ok(rice.sections.find((s) => s.type === "explain").kicker.includes("핵심 소구점"));
assert.ok(rice.sections.find((s) => s.type === "explain").bullets.some((b) => String(b).includes("산지")));
assert.equal(
  JSON.stringify(rice.sections.find((s) => s.type === "explain")).includes("가늠이 안 된다"),
  false
);
assert.ok(rice.sections.find((s) => s.type === "usp").kicker.includes("소재"));
assert.ok(rice.sections.find((s) => s.type === "spec").rows.some((r) => r[0] === "원재료"));
assert.ok(rice.sections.find((s) => s.type === "spec").rows.some((r) => r[0] === "도정"));
assert.equal(
  rice.sections.find((s) => s.type === "spec").rows.some((r) => String(r[0]).startsWith("기준")),
  false
);
assert.equal(riceText.includes("추청"), false);
assert.equal(riceText.includes("1등급"), false);
assert.ok(rice.sections.find((s) => s.type === "scene").title.includes("밥을 짓는"));

const riceHtml = renderDetailPageBodyHtml(rice, []);
assert.ok(riceHtml.includes('data-category-flow="grocery"'));
assert.ok(riceHtml.includes("산지"));
assert.ok(riceHtml.includes("원재료"));
assert.ok(riceHtml.includes("햅쌀로 표기"));
assert.ok(riceHtml.includes('data-layout="usp-rows"'));
assert.ok(riceHtml.includes('data-layout="points-5"'));
assert.ok(riceHtml.includes("핵심 소구점"));

const beansInput = normalizeDetailPageInput({
  productName: "하우스 블렌드 원두 200g",
  brandName: "골목카페",
  industry: "카페",
  features: "중배전 블렌드\n주문 후 분쇄 가능\n당일 로스팅 안내",
  highlights: "중배전\n주문 후 분쇄\n당일 로스팅",
  pageLength: "standard",
});
assert.equal(resolveDetailPageCategoryFlow(beansInput).id, "cafe");
const beansList = buildDetailPageCategoryListing(beansInput);
assert.ok(beansList.filled.some((s) => s.label === "원두" && s.value !== "원두"));
assert.ok(beansList.filled.some((s) => s.label === "로스팅"));
assert.ok(beansList.filled.some((s) => s.label === "분쇄"));
assert.ok(beansList.filled.some((s) => s.label === "중량"));
const beans = buildDetailPageFallbackPack(beansInput);
assert.equal(beans._meta.categoryFlow.id, "cafe");
assert.ok(beans.sections.find((s) => s.type === "spec").rows.some((r) => r[0] === "로스팅"));
assert.ok(beans.sections.find((s) => s.type === "scene").title.includes("내려"));
const beansHtml = renderDetailPageBodyHtml(beans, []);
assert.ok(beansHtml.includes('data-category-flow="cafe"'));
assert.ok(beansHtml.includes("분쇄") || beansHtml.includes("로스팅"));

assert.ok(
  gptDetailPageSystemPrompt({
    brandName: "여주미곡",
    sectionIds: DETAIL_PAGE_LENGTHS.standard.sectionIds,
    input: riceInput,
  }).includes("카테고리 상위 상세")
);

console.log(
  `ok detail-page-category-flow rice=${riceList.filled.map((s) => s.label).join("→")} beans=${beansList.filled.map((s) => s.label).join("→")}`
);
