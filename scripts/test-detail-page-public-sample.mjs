import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";
import { DETAIL_PAGE_PRODUCT } from "../lib/product/detailPageProduct.js";
import {
  DETAIL_PAGE_OPEN_EXAMPLES,
  detailPageSampleSrc,
  resolveDetailPageSampleId,
} from "../lib/product/detailPageCompanyPresets.js";

assert.equal(DETAIL_PAGE_PRODUCT.samplePath, "/detail/sample");
assert.equal(DETAIL_PAGE_PRODUCT.sampleZoneId, "landing-detail-sample");
assert.ok(DETAIL_PAGE_PRODUCT.sampleCaption.includes("컷별 상품 사진"));
assert.ok(DETAIL_PAGE_PRODUCT.loginTitle.includes("내 상품"));
assert.equal(DETAIL_PAGE_OPEN_EXAMPLES.length, 2);
assert.equal(resolveDetailPageSampleId("nope"), "open-rice");
assert.equal(detailPageSampleSrc("open-rice"), "/detail/sample");
assert.equal(detailPageSampleSrc("open-beans"), "/detail/sample?id=open-beans");

const rice = buildDetailPagePublicSample();
assert.equal(rice.id, "open-rice");
assert.ok(rice.html.includes('data-visual="first-glance"'));
assert.ok(rice.html.includes("data-photo-direction"));
assert.ok(rice.documentHtml.includes('data-mall="smartstore"'));
assert.ok(rice.html.includes("포장 앞면"));
assert.ok(rice.html.includes("/detail-sample/open-rice-hero.png"));
assert.ok(rice.html.includes("<img "));
assert.equal(rice.documentHtml.includes("fake_model"), false);
assert.equal(rice.success.ok, true);
assert.ok(rice.success.score >= 99, `rice success ${rice.success.score}`);
assert.equal(rice.compete.ok, true);

const beans = buildDetailPagePublicSample("open-beans");
assert.equal(beans.id, "open-beans");
assert.ok(beans.html.includes("하우스 블렌드"));
assert.ok(beans.html.includes("/detail-sample/open-beans-hero.png"));
assert.ok(beans.html.includes("<img "));
assert.equal(beans.documentHtml.includes("fake_model"), false);
assert.equal(beans.success.ok, true);
assert.ok(beans.success.score >= 99, `beans success ${beans.success.score}`);
assert.equal(beans.compete.ok, true);

const invite = readFileSync("components/landing/PublicDetailPageInvite.jsx", "utf8");
assert.ok(invite.includes("DetailPageSampleZone"));
assert.ok(invite.includes("sampleZoneId"));
const zone = readFileSync("components/DetailPageSampleZone.jsx", "utf8");
assert.ok(existsSync("public/detail-sample/ranking-rice.html"), "missing ranking-rice.html");
assert.ok(existsSync("public/detail-sample/ranking-beans.html"), "missing ranking-beans.html");
assert.ok(zone.includes("DETAIL_PAGE_OPEN_EXAMPLES"));
assert.ok(zone.includes("open-rice") || zone.includes("label"));
assert.ok(zone.includes("컷별 상품 사진"));
assert.equal(zone.includes("AI 이미지는 없습니다"), false);
for (const file of [
  "public/detail-sample/open-rice-hero.png",
  "public/detail-sample/open-rice-observe.png",
  "public/detail-sample/open-rice-feature.png",
  "public/detail-sample/open-beans-hero.png",
  "public/detail-sample/open-beans-observe.png",
  "public/detail-sample/open-beans-feature.png",
]) {
  assert.ok(existsSync(file), `missing ${file}`);
}
const detailClient = readFileSync("components/PublicDetailPageClient.jsx", "utf8");
assert.ok(detailClient.includes("DetailPageSampleZone"));
const landing = readFileSync("components/landing/LandingPage.jsx", "utf8");
assert.ok(landing.includes("landing-detail-sample"));
assert.equal(landing.includes("WhyBriclog"), false);
assert.equal(landing.includes("DemoFlow"), false);
assert.ok(
  landing.indexOf("<PublicDetailPageInvite") <
    landing.indexOf("<PublicBrandTestSection"),
  "detail sample zone comes before public test"
);
const hero = readFileSync("components/landing/HeroSection.jsx", "utf8");
assert.equal(hero.includes("오늘의 한 줄"), false);
assert.equal(hero.includes("radial-gradient"), false);
const copy = readFileSync("lib/brand/copy.js", "utf8");
assert.ok(copy.includes("고르는 화면 보기"));
assert.ok(copy.includes("상품은 고르는 화면"));
const demo = readFileSync("components/landing/DemoPreviewSection.jsx", "utf8");
assert.ok(demo.includes("운영 글은 한 주제"));
assert.ok(demo.includes("landing-detail-sample"));
assert.equal(demo.includes("한 주제, 세 채널"), false);
const route = readFileSync("app/detail/sample/route.js", "utf8");
assert.ok(route.includes("searchParams"));
assert.ok(route.includes("noindex"));

const faq = readFileSync("lib/landing/landingFaq.js", "utf8");
assert.ok(faq.includes("상세 샘플 존"));

console.log(
  `ok detail-page-public-sample rice=${rice.success.score} beans=${beans.success.score} zone=${DETAIL_PAGE_PRODUCT.sampleZoneId}`
);
