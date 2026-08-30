import assert from "node:assert/strict";
import { inspectDetailPageFacts } from "../lib/product/detailPageFactDossier.js";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";
import {
  DETAIL_PAGE_MALL_MD_PANEL_20,
  evaluateDetailPageMallMdPanel,
} from "../lib/qa/detailPageMallMdPanel20.js";

assert.equal(DETAIL_PAGE_MALL_MD_PANEL_20.length, 20);
assert.equal(new Set(DETAIL_PAGE_MALL_MD_PANEL_20.map((d) => d.id)).size, 20);
assert.ok(DETAIL_PAGE_MALL_MD_PANEL_20.every((d) => d.years >= 10));

const thin = buildDetailPageFallbackPack({
  productName: "여주 햅쌀 10kg",
  brandName: "우리쌀가게",
  region: "여주",
  industry: "쌀가게",
  target: "집밥 차리는 손님",
  features: "당일 도정\n진공 포장\n여주 수확",
});
const thinPanel = evaluateDetailPageMallMdPanel({
  pack: thin,
  html: "",
  dossier: inspectDetailPageFacts(thin),
});
assert.ok(thinPanel.measured.vetoes.includes("가격 없음"));
assert.ok(thinPanel.summary.mean < 60, `thin should fail MD, got ${thinPanel.summary.mean}`);
assert.equal(thinPanel.summary.hire, false);

const rice = buildDetailPagePublicSample("open-rice");
const ricePanel = evaluateDetailPageMallMdPanel({
  pack: rice.pack,
  html: rice.html,
  dossier: inspectDetailPageFacts({ ...rice.pack, ...(rice.pack._meta?.input || {}) }),
});
assert.equal(ricePanel.votes.length, 20);
assert.equal(ricePanel.measured.vetoes.length, 0, ricePanel.measured.vetoes.join(","));
assert.equal(ricePanel.measured.needCount, 0, "public rice must not leak [자료 필요]");
assert.ok(ricePanel.measured.imgs >= 3, `rice imgs ${ricePanel.measured.imgs}`);
assert.equal(ricePanel.summary.mean, 99);
assert.equal(ricePanel.summary.hire, true);
assert.equal(ricePanel.summary.passCount, 20);

const beans = buildDetailPagePublicSample("open-beans");
const beansPanel = evaluateDetailPageMallMdPanel({
  pack: beans.pack,
  html: beans.html,
  dossier: inspectDetailPageFacts(beans.pack),
});
assert.equal(beansPanel.measured.vetoes.length, 0, beansPanel.measured.vetoes.join(","));
assert.equal(beansPanel.summary.mean, 99);
assert.equal(beansPanel.summary.hire, true);
assert.equal(beansPanel.summary.passCount, 20);

const filledPack = {
  productName: "여주 햅쌀 10kg",
  brandName: "우리쌀가게",
  headline: "여주 햅쌀 10kg",
  subhead: "우리쌀가게 · 집밥 차리는 손님",
  sections: [
    { type: "hero", title: "여주 햅쌀 10kg", body: "집밥 차리는 손님 · 32,900원" },
    { type: "intent", title: "포장만 보고 밥맛까지는 가늠이 안 된다", bullets: ["밥맛", "도정", "산지"] },
    { type: "explain", title: "산지 · 햅쌀 · 도정 · 중량 · 포장", bullets: ["산지 — 여주", "햅쌀 — 2026", "도정 — 당일", "중량 — 10kg", "포장 — 진공"] },
    { type: "usp", title: "포장 안에서 대조하는 항목", bullets: ["도정 — 당일 도정", "포장 — 진공"] },
    { type: "spec", title: "상품 정보표", rows: [["가격", "32,900원"], ["중량", "10kg"], ["원산지", "여주"]] },
    { type: "cta", title: "구매", body: "32,900원 · 배송 3,000원" },
  ],
};
const filledHtml = `<article data-category-flow="grocery" data-section="page">
  <section data-section="hero"><h1>여주 햅쌀 10kg</h1>
  <img src="/a.png" alt="포장"><img src="/b.png" alt="쌀알"><img src="/c.png" alt="라벨"><img src="/d.png" alt="밥">
  <p>32,900원</p><button data-cta="buy">구매하기</button></section>
  <table data-layout="spec-sheet"><tr><th>가격</th><td>32,900원</td></tr><tr><th>배송</th><td>3,000원 · 당일 출고</td></tr></table>
  <dl data-layout="faq"><dt>배송비는 얼마인가</dt><dd>3,000원</dd></dl>
</article>`;
const filledPanel = evaluateDetailPageMallMdPanel({
  pack: filledPack,
  html: filledHtml,
  dossier: inspectDetailPageFacts({
    productName: "여주 햅쌀 10kg",
    brandName: "우리쌀가게",
    region: "여주",
    industry: "쌀가게",
    target: "집밥 차리는 손님",
    price: "32,900원",
    options: "10kg 한 포",
    shipping: "3,000원 · 당일 출고",
    producer: "여주농협",
    storage: "상온",
    features: "당일 도정\n진공 포장\n여주 수확\n추청",
  }),
});
assert.equal(filledPanel.summary.mean, 99);
assert.ok(
  filledPanel.summary.mean > thinPanel.summary.mean + 15,
  `filled ${filledPanel.summary.mean} should beat thin ${thinPanel.summary.mean}`
);

console.log(
  `ok detail-page-md-panel rice=${ricePanel.summary.mean} beans=${beansPanel.summary.mean} thin=${thinPanel.summary.mean} veto=${thinPanel.measured.vetoes.join(",")}`
);
