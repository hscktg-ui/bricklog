/**
 * publicTestAdminStats — 데모·직접입력 분류 회귀
 * Run: npm run test:public-test-admin-stats
 */
import assert from "node:assert/strict";
import {
  isLandingDemoPublicTestRun,
  isCatalogDemoPublicTestRun,
  isCustomPublicTestRun,
} from "../lib/publicTest/publicTestAdminStats.js";

assert.equal(
  isLandingDemoPublicTestRun({ brand_name: "모카하우스", topic: "아무 주제" }),
  true
);
assert.equal(
  isLandingDemoPublicTestRun({ brand_name: "꽃담", topic: "커스텀" }),
  true
);
assert.equal(isLandingDemoPublicTestRun({ brand_name: "마음편한 내과" }), false);

assert.equal(
  isCatalogDemoPublicTestRun({
    brand_name: "모카하우스",
    topic: "봄 시즌 수제 브런치 메뉴",
  }),
  true
);
assert.equal(
  isCatalogDemoPublicTestRun({
    brand_name: "모카하우스",
    topic: "완전 다른 주제",
  }),
  false
);

assert.equal(
  isCustomPublicTestRun({
    brand_name: "우리카페",
    topic: "신메뉴 홍보",
  }),
  true
);
assert.equal(
  isCustomPublicTestRun({
    brand_name: "꽃담",
    topic: "어버이날 꽃다발 예약·픽업",
  }),
  false
);

console.log("OK public-test-admin-stats (7 cases)");
