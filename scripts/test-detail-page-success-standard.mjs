import assert from "node:assert/strict";
import { buildDetailPageFallbackPack } from "../lib/product/detailPageEngine.js";
import { renderDetailPageBodyHtml } from "../lib/product/detailPageHtml.js";
import {
  DETAIL_PAGE_SUCCESS_PHASES,
  DETAIL_PAGE_SUCCESS_HARD_GATES,
  DETAIL_PAGE_SUCCESS_DOCTRINE,
  DETAIL_PAGE_SUCCESS_PASS_SCORE,
  DETAIL_PAGE_KOREA_FIRST,
  assessDetailPageSuccess,
} from "../lib/product/detailPageSuccessStandard.js";
import { DETAIL_PAGE_PRODUCT } from "../lib/product/detailPageProduct.js";

assert.equal(
  DETAIL_PAGE_SUCCESS_PHASES.reduce((s, p) => s + p.weight, 0),
  100
);
assert.equal(DETAIL_PAGE_SUCCESS_PHASES.length, 5);
assert.equal(DETAIL_PAGE_SUCCESS_HARD_GATES.length, 4);
assert.equal(DETAIL_PAGE_SUCCESS_PASS_SCORE, 80);
assert.equal(DETAIL_PAGE_SUCCESS_DOCTRINE.pass, "고르는 화면이 생겼다");
assert.equal(DETAIL_PAGE_KOREA_FIRST.not, "슬로건");
assert.ok(DETAIL_PAGE_KOREA_FIRST.beats.includes("챗봇 상세 글"));
assert.ok(DETAIL_PAGE_KOREA_FIRST.ship.includes("올린 사진 우선"));
assert.ok(DETAIL_PAGE_KOREA_FIRST.ship.includes("컷별 상품 사진 생성"));
assert.ok(DETAIL_PAGE_KOREA_FIRST.ship.includes("스마트스토어·쿠팡 복사"));
assert.ok(DETAIL_PAGE_KOREA_FIRST.ship.includes("카테고리 상세 나열"));
assert.ok(DETAIL_PAGE_KOREA_FIRST.ship.includes("가입 전 860 맛보기"));
assert.ok(DETAIL_PAGE_KOREA_FIRST.notHow.includes("가짜 모델컷"));
assert.ok(DETAIL_PAGE_KOREA_FIRST.notHow.includes("9몰 API"));
assert.equal(DETAIL_PAGE_PRODUCT.versusGpt.includes("글"), true);

const pack = buildDetailPageFallbackPack({
  productName: "여주 햅쌀 10kg",
  brandName: "우리쌀가게",
  region: "여주",
  target: "집밥 차리는 손님",
  searchIntent: "포장만 보고 밥맛까지는 가늠이 안 된다",
  features: "당일 도정\n진공 포장\n여주 수확",
  highlights: ["당일 도정", "진공 포장", "여주 수확"],
  pageLength: "standard",
  imageCount: 3,
});
assert.equal(pack._meta.sqv.score >= 95, true);
assert.equal(pack._meta.standard.ok, true);
assert.equal(pack._meta.success.ok, true, "1위 출고: 폴백도 고르는 화면이어야 한다");
assert.equal(pack._meta.success.doctrine, DETAIL_PAGE_SUCCESS_DOCTRINE.pass);
assert.ok(pack._meta.success.measured.padHits <= 2);

const TINY =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const shots = [
  { src: TINY, slot: "hero", caption: "포장 앞면" },
  { src: TINY, slot: "observe", caption: "손에 쥐거나 가까이" },
  { src: TINY, slot: "feature", caption: "디테일 한 점" },
];
const html = renderDetailPageBodyHtml(pack, shots);
const live = assessDetailPageSuccess({
  pack,
  html,
  photoCount: shots.length,
  input: { brandName: "우리쌀가게" },
});
assert.equal(live.ok, true);
assert.equal(live.engineScore >= 95, true);
assert.ok(live.measured.padHits <= 2);
assert.ok(live.score >= 99, `success ${live.score} — 완성 화면은 99`);
assert.ok(live.panel.mean >= 97, `panel ${live.panel.mean}`);

const padded = {
  ...pack,
  sections: (pack.sections || []).map((s) => ({
    ...s,
    body: `${s.body || ""} 고르는 순서가 보이면 다음 설명은 짧아집니다. 고르는 순서가 보이면 다음 설명은 짧아집니다. 고르는 순서가 보이면 다음 설명은 짧아집니다.`,
  })),
};
const paddedLive = assessDetailPageSuccess({
  pack: padded,
  html,
  photoCount: 3,
  input: { brandName: "우리쌀가게" },
});
assert.equal(paddedLive.ok, false, "패딩 초안은 출고 금지");
assert.ok(paddedLive.hard.includes("pad") || paddedLive.hard.includes("uniqueness"));

console.log(
  `ok detail-page-success-standard engine=${pack._meta.sqv.score} success=${live.score} panel=${live.panel.mean} pad=${live.measured.padHits}`
);
