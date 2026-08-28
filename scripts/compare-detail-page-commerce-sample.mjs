/**
 * 여주 햅쌀 샘플: HTML 출고 vs 구 이미지스택, DOM·자료 게이트 점검.
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildDetailPagePublicSample } from "../lib/product/detailPagePublicSample.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "artifacts", "detail-page-commerce-compare");
mkdirSync(outDir, { recursive: true });

const rice = buildDetailPagePublicSample("open-rice");
const html = rice.documentHtml;
const pack = rice.pack;
const facts = pack._meta?.facts || {};
const commerce = pack._meta?.commerce || {};
const critique = pack._meta?.critique || {};

function count(re) {
  return (html.match(re) || []).length;
}

const checks = {
  h1: count(/<h1[\s>]/g),
  h2: count(/<h2[\s>]/g),
  table: count(/<table[\s>]/g),
  dl: count(/<dl[\s>]/g),
  button: count(/<(button|a)[^>]*(구매하기|#detail-buy)/g),
  ctaBuy: html.includes("구매하기"),
  missingMarker: html.includes("[자료 필요"),
  abstractScream: /크게 외치지 않습니다|기준만 챙기면 됩니다/.test(html),
  deliverableHtml: html.includes('data-deliverable="html"'),
  imageStackDeliverable: rice.mallStackHtml?.includes('data-deliverable="image-stack"'),
  heroPngOnly: (rice.shots || []).length === 1 && rice.shots[0]?.slot === "hero",
  viewport: html.includes("width=device-width"),
};

const summary = {
  generatedAt: new Date().toISOString(),
  sampleId: rice.id,
  productName: rice.productName,
  success: rice.success,
  compete: rice.compete,
  grade: pack._meta?.grade,
  critique,
  facts: {
    missingRequired: facts.missingRequired,
    missingRecommended: facts.missingRecommended,
    usableFacts: facts.usableFacts || [],
    prohibitedClaims: facts.prohibitedClaims,
  },
  commerceKeys: Object.keys(commerce),
  htmlBytes: Buffer.byteLength(html, "utf8"),
  mallStackBytes: Buffer.byteLength(rice.mallStackHtml || "", "utf8"),
  checks,
  pass:
    checks.h1 === 1 &&
    checks.table >= 1 &&
    checks.dl >= 1 &&
    checks.ctaBuy &&
    checks.missingMarker &&
    !checks.abstractScream &&
    checks.deliverableHtml &&
    checks.heroPngOnly &&
    (critique.total == null || critique.total >= 75),
};

writeFileSync(join(outDir, "rice.html"), html);
writeFileSync(join(outDir, "rice-commerce.json"), JSON.stringify(commerce, null, 2));
writeFileSync(join(outDir, "latest-summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ pass: summary.pass, checks, critiqueScore: critique.total, missingRequired: facts.missingRequired }, null, 2));
if (!summary.pass) process.exitCode = 1;
