import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";
import { renderDetailPageBodyHtml } from "../lib/product/detailPageHtml.js";
import { buildDetailPagePlan } from "../lib/product/detailPagePlan.js";
import { inspectDetailPageWebUi } from "../lib/qa/detailPageWebUiGuard.js";
import { DETAIL_PAGE_ECOM_PRINCIPLES } from "../lib/product/detailPageEcommerceOs.js";

assert.ok(DETAIL_PAGE_ECOM_PRINCIPLES.includes("NO UI FEEL"));

const products = [
  {
    id: "beauty",
    productName: "나이아신 세럼 30ml",
    brandName: "결피부",
    industry: "화장품",
    target: "건조한 피부 손님",
    searchIntent: "제형이 무거운지 바르기 전에 알고 싶다",
    features: "세럼\n산뜻한 흡수\n나이아신아마이드",
    price: "28,000원",
    shipping: "3,000원",
    dispatch: "당일 출고",
  },
  {
    id: "appliance",
    productName: "탁상 공기청정기",
    brandName: "숨결",
    industry: "소형가전",
    target: "원룸에서 자는 손님",
    searchIntent: "소음과 필터 관리가 부담이다",
    features: "탁상 청정\n세척 가능한 필터\n잠자리 소음",
    price: "89,000원",
    shipping: "무료",
    dispatch: "2일 출고",
  },
  {
    id: "food",
    productName: "여주 햅쌀 10kg",
    brandName: "우리쌀가게",
    industry: "쌀가게",
    region: "여주",
    target: "집밥 차리는 손님",
    searchIntent: "포장만 보고 밥맛까지는 가늠이 안 된다",
    features: "당일 도정\n진공 포장\n여주 수확",
    price: "32,900원",
    shipping: "3,000원 · 당일 출고",
    dispatch: "당일 출고",
  },
];

const shots = [
  { src: "/pack.png", slot: "hero" },
  { src: "/grain.png", slot: "observe" },
  { src: "/label.png", slot: "feature" },
];

const reports = products.map((input) => {
  const plan = buildDetailPagePlan(input, shots);
  const pack = buildDetailPageFallbackPack({ ...input, photos: shots });
  const html = renderDetailPageBodyHtml(pack, shots);
  const web = inspectDetailPageWebUi(html);
  return {
    id: input.id,
    strategy: plan.strategy,
    compositions: plan.sections.map((s) => s.composition),
    order: plan.sections.map((s) => s.id).join(">"),
    type: pack._meta?.typePairing?.id,
    webUiFeel: web.webUiFeel,
    webOk: web.ok,
    hits: web.hits,
    button: html.includes("<button") || html.includes('role="button"'),
    nav: /<nav\b/i.test(html),
    cards: html.includes("usp-cards") || html.includes("choose-steps"),
    mallImage: html.includes('data-deliverable="mall-image"'),
    html,
  };
});

assert.equal(new Set(reports.map((r) => r.strategy)).size, 3, "strategies must differ");
assert.equal(new Set(reports.map((r) => r.order)).size, 3, "storyboards must differ");
assert.equal(new Set(reports.map((r) => r.compositions[0])).size >= 1, true);

for (const row of reports) {
  assert.equal(row.button, false, `${row.id} has website button`);
  assert.equal(row.nav, false, `${row.id} has nav`);
  assert.equal(row.cards, false, `${row.id} has website cards`);
  assert.equal(row.mallImage, true, `${row.id} is not mall-image`);
  assert.equal(row.webOk, true, `${row.id} web ui ${row.hits.join(",")}`);
  assert.ok(row.webUiFeel < 20, `${row.id} web_ui_feel ${row.webUiFeel}`);
}

const outDir = join(process.cwd(), "artifacts", "detail-page-ecommerce-os");
mkdirSync(outDir, { recursive: true });
for (const row of reports) {
  writeFileSync(join(outDir, `${row.id}.html`), row.html);
}
writeFileSync(
  join(outDir, "latest-summary.json"),
  JSON.stringify(
    reports.map(({ html, ...rest }) => rest),
    null,
    2
  )
);

console.log(
  `ok detail-page-ecommerce-os ${reports
    .map((r) => `${r.id}:${r.strategy}:${r.webUiFeel}`)
    .join(" ")}`
);
