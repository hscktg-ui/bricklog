import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";
import { DETAIL_PAGE_PRODUCT } from "../lib/product/detailPageProduct.js";
import {
  DETAIL_PAGE_OPEN_EXAMPLES,
  detailPageSampleSrc,
  resolveDetailPageSampleId,
} from "../lib/product/detailPageCompanyPresets.js";

assert.equal(DETAIL_PAGE_PRODUCT.samplePath, "/detail/sample");
assert.equal(DETAIL_PAGE_PRODUCT.sampleZoneId, "landing-detail-sample");
assert.ok(DETAIL_PAGE_PRODUCT.sampleCaption.includes("사진 칸"));
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
assert.equal(rice.documentHtml.includes("image_generation"), false);
assert.equal(rice.success.ok, true);
assert.ok(rice.success.score >= 99, `rice success ${rice.success.score}`);
assert.equal(rice.compete.ok, true);

const beans = buildDetailPagePublicSample("open-beans");
assert.equal(beans.id, "open-beans");
assert.ok(beans.html.includes("하우스 블렌드"));
assert.equal(beans.documentHtml.includes("image_generation"), false);
assert.equal(beans.success.ok, true);
assert.ok(beans.success.score >= 99, `beans success ${beans.success.score}`);
assert.equal(beans.compete.ok, true);

const invite = readFileSync("components/landing/PublicDetailPageInvite.jsx", "utf8");
assert.ok(invite.includes("DetailPageSampleZone"));
assert.ok(invite.includes("sampleZoneId"));
const zone = readFileSync("components/DetailPageSampleZone.jsx", "utf8");
assert.ok(zone.includes("DETAIL_PAGE_OPEN_EXAMPLES"));
assert.ok(zone.includes("open-rice") || zone.includes("label"));
const detailClient = readFileSync("components/PublicDetailPageClient.jsx", "utf8");
assert.ok(detailClient.includes("DetailPageSampleZone"));
const landing = readFileSync("components/landing/LandingPage.jsx", "utf8");
assert.ok(landing.includes("landing-detail-sample"));
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
