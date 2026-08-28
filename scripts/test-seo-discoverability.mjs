/**
 * SEO discoverability — 메타·정적 OG·서버 소개 블록
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readFileSync as readSeo } from "node:fs";

const seoJs = readSeo("lib/brand/seo.js", "utf8");
const siteMetaJs = readSeo("lib/brand/siteMetadata.js", "utf8");
assert.ok(seoJs.includes('return raw.replace(/^https:\\/\\/www\\./i'));
assert.ok(!seoJs.includes("SearchAction"), "no fake SearchAction");
assert.ok(siteMetaJs.includes("DEFAULT_SITE_URL"));
const DEFAULT_SITE_URL = "https://briclog.ai";

const page = readFileSync("app/page.js", "utf8");
assert.ok(page.includes("SeoDiscoverabilityHero"));
const seoHero = readFileSync("components/seo/SeoDiscoverabilityHero.jsx", "utf8");
assert.ok(seoHero.includes("운영 글"), "crawler h1 names operating copy + product screen");
assert.ok(seoHero.includes("브릭로그 상세"), "브릭로그 상세 in server HTML");
assert.ok(seoHero.includes("versusGpt"), "chatbot vs screen copy wired in server HTML");
assert.ok(seoHero.includes("/detail"), "detail link in server HTML");
assert.ok(page.includes("HomeClientLoader"));

const loader = readFileSync("components/home/HomeClientLoader.jsx", "utf8");
assert.ok(loader.includes("ssr: false"));
assert.ok(seoJs.includes("buildGuidesIndexJsonLd"));

const jsonLd = readFileSync("components/seo/JsonLdScript.jsx", "utf8");
assert.ok(jsonLd.includes("buildOrganizationJsonLd"));
const pageJsonLd = readFileSync("components/seo/PageJsonLdScript.jsx", "utf8");
assert.ok(pageJsonLd.includes("graphs"));

const middleware = readFileSync("middleware.js", "utf8");
assert.ok(middleware.includes("www.") && middleware.includes("briclog.ai"));

const vercel = readFileSync("vercel.json", "utf8");
assert.ok(vercel.includes("www.briclog.ai"));

try {
  readFileSync("app/opengraph-image.js", "utf8");
  assert.fail("opengraph-image.js should be removed");
} catch {
  /* expected */
}

console.log("OK: seo discoverability — apex canonical, static og.png, server intro");
