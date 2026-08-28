/**
 * 브릭로그 상세 카테고리 글꼴 — 한글+영문 페어가 분위기별로 갈린다
 */
import assert from "node:assert/strict";
import {
  DETAIL_PAGE_TYPE_PAIRINGS,
  resolveDetailPageTypePairing,
  makeDetailPageTypeBox,
} from "../lib/product/detailPageTypePairing.js";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";
import { renderDetailPageBodyHtml, wrapSmartstoreHtml } from "../lib/product/detailPageHtml.js";
import { formatDetailPageDesignBrief } from "../lib/product/detailPageContext.js";

const pairs = Object.values(DETAIL_PAGE_TYPE_PAIRINGS);
assert.ok(pairs.length >= 16);
for (const p of pairs) {
  assert.ok(p.displayKo && p.displayEn && p.bodyKo && p.bodyEn, p.id);
  assert.notEqual(p.displayKo, p.displayEn, `${p.id} display KR/EN must mix`);
  assert.notEqual(p.bodyKo, p.bodyEn, `${p.id} body KR/EN must mix`);
  assert.ok(p.hrefs.some((h) => h.includes("fonts.googleapis.com")), p.id);
  assert.ok(p.familyDisplay.includes(p.displayEn), p.id);
  assert.ok(p.familyDisplay.includes(p.displayKo), p.id);
  assert.ok(p.familyBody.includes(p.bodyKo), p.id);
  assert.ok(p.familyBody.includes(p.bodyEn), p.id);
  const box = makeDetailPageTypeBox(p);
  assert.ok(box.familyBody && !box.familyBody.includes("undefined"), p.id);
}

const grocery = resolveDetailPageTypePairing({
  industry: "쌀가게",
  productName: "여주 햅쌀 10kg",
});
const cafe = resolveDetailPageTypePairing({
  industry: "카페",
  productName: "에티오피아 원두 200g",
});
const salon = resolveDetailPageTypePairing({ industry: "미용실" });
const furniture = resolveDetailPageTypePairing({ industry: "가구" });
const restaurant = resolveDetailPageTypePairing({ industry: "한정식" });

assert.equal(grocery.id, "grocery");
assert.equal(grocery.displayKo, "Nanum Myeongjo");
assert.equal(grocery.displayEn, "Fraunces");
assert.equal(cafe.id, "cafe");
assert.equal(cafe.displayKo, "Gowun Batang");
assert.equal(cafe.displayEn, "Fraunces");
assert.equal(salon.displayEn, "Cormorant Garamond");
assert.equal(furniture.displayEn, "Libre Baskerville");
assert.equal(restaurant.displayKo, "Hahmlet");
assert.notEqual(grocery.label, cafe.label);

const signatures = pairs.map((p) => `${p.displayKo}|${p.displayEn}|${p.bodyKo}|${p.bodyEn}`);
assert.ok(new Set(signatures).size >= 12, "enough distinct KR+EN stacks");

const ricePack = buildDetailPageFallbackPack({
  productName: "여주 햅쌀 10kg",
  brandName: "여주미곡",
  industry: "쌀가게",
  features: "당일 도정\n진공 포장",
});
const cafePack = buildDetailPageFallbackPack({
  productName: "에티오피아 원두 200g",
  brandName: "로스터리",
  industry: "카페",
  features: "라이트 로스팅\n핸드드립",
});
assert.equal(ricePack._meta.typePairing.id, "grocery");
assert.equal(cafePack._meta.typePairing.id, "cafe");

const riceHtml = renderDetailPageBodyHtml(ricePack, []);
const cafeHtml = renderDetailPageBodyHtml(cafePack, []);
assert.ok(riceHtml.includes("Nanum Myeongjo"));
assert.ok(riceHtml.includes("Fraunces"));
assert.ok(riceHtml.includes("IBM Plex Sans KR"));
assert.ok(cafeHtml.includes("Gowun Batang"));
assert.ok(cafeHtml.includes("Fraunces"));
assert.ok(cafeHtml.includes("IBM Plex Sans KR"));
assert.ok(cafeHtml.includes("Outfit"));
assert.equal(riceHtml.includes("Gowun Batang"), false);
assert.ok(formatDetailPageDesignBrief(ricePack).includes("나눔명조"));
assert.ok(formatDetailPageDesignBrief(cafePack).includes("고운바탕"));

const riceDoc = wrapSmartstoreHtml(riceHtml, ricePack);
const cafeDoc = wrapSmartstoreHtml(cafeHtml, cafePack);
assert.ok(riceDoc.includes("Nanum+Myeongjo"));
assert.ok(cafeDoc.includes("Gowun+Batang"));
assert.ok(cafeDoc.includes("Outfit"));

console.log(
  `ok detail-page-type-pairing grocery=${grocery.label} cafe=${cafe.label} stacks=${new Set(signatures).size}`
);
