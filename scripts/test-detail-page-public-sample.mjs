import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";
import { DETAIL_PAGE_PRODUCT } from "../lib/product/detailPageProduct.js";

assert.equal(DETAIL_PAGE_PRODUCT.samplePath, "/detail/sample");
assert.ok(DETAIL_PAGE_PRODUCT.sampleCaption.includes("사진 칸"));
assert.ok(DETAIL_PAGE_PRODUCT.loginTitle.includes("내 상품"));

const sample = buildDetailPagePublicSample();
assert.equal(sample.id, "open-rice");
assert.ok(sample.html.includes('data-visual="first-glance"'));
assert.ok(sample.html.includes("data-photo-direction"));
assert.ok(sample.documentHtml.includes('data-mall="smartstore"'));
assert.equal(sample.documentHtml.includes("image_generation"), false);
assert.equal(sample.success.ok, true);
assert.ok(sample.success.score >= 99, `sample success ${sample.success.score}`);
assert.equal(sample.compete.ok, true);
assert.equal(sample.compete.noImageGen, true);

const invite = readFileSync("components/landing/PublicDetailPageInvite.jsx", "utf8");
assert.ok(invite.includes("DetailPageSampleFrame"));
const detailClient = readFileSync("components/PublicDetailPageClient.jsx", "utf8");
assert.ok(detailClient.includes("DetailPageSampleFrame"));
const demo = readFileSync("components/landing/DemoPreviewSection.jsx", "utf8");
assert.ok(demo.includes("운영 글은 한 주제"));
assert.equal(demo.includes("한 주제, 세 채널"), false);
const route = readFileSync("app/detail/sample/route.js", "utf8");
assert.ok(route.includes("buildDetailPagePublicSample"));
assert.ok(route.includes("noindex"));

const faq = readFileSync("lib/landing/landingFaq.js", "utf8");
assert.ok(faq.includes("로그인 없이 포장 쌀 맛보기"));

console.log(
  `ok detail-page-public-sample score=${sample.success.score} panel=${sample.success.panel.mean} compete=${sample.compete.ok}`
);
