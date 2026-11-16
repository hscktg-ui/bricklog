/**
 * Prod quality P0 — 홈 포지셔닝 · 트렌드 신선도 · 요금 카피
 * Run: node --import ./scripts/register-alias.mjs scripts/test-prod-quality-positioning.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BRAND_LATEST_UPDATE,
  BRAND_META_DESCRIPTION,
  BRAND_META_TITLE,
  BRICLOG_SLOGAN,
  LANDING_PRIMARY_CTA,
  LANDING_SECONDARY_CTA,
} from "../lib/brand/copy.js";
import { formatUpdatedLabel, resolveFreshnessMeta } from "../lib/trends/liveEngine.js";

assert.equal(BRICLOG_SLOGAN, "브랜드의 생각을, 콘텐츠로.");
assert.ok(BRAND_META_TITLE.includes("브랜드 콘텐츠"));
assert.ok(!BRAND_META_TITLE.startsWith("브릭로그 | AI 순위"));
assert.ok(BRAND_META_DESCRIPTION.includes("브랜드명·지역·주제"));
assert.equal(LANDING_PRIMARY_CTA, "무료로 콘텐츠 만들기");
assert.equal(LANDING_SECONDARY_CTA, "AI 트렌드 살펴보기");
assert.ok(BRAND_LATEST_UPDATE.label.includes("2026년 11월"));

const landing = readFileSync("components/home/TrendLandingPage.jsx", "utf8");
assert.ok(landing.includes('id="landing-hero"'));
assert.ok(landing.indexOf("PublicBrandTestSection") < landing.indexOf('id="trend-list"'));
assert.ok(landing.includes("SAMPLE"));
assert.ok(!landing.includes("최근 1시간 가장 빠르게 오른 AI"));

const terms = readFileSync("content/legal/terms.md", "utf8");
assert.ok(terms.includes("무료 런치"));
assert.ok(terms.includes("실제 결제가 발생하지 않습니다"));
assert.ok(terms.includes("19,900원/월"));

const refund = readFileSync("content/legal/refund.md", "utf8");
assert.ok(refund.includes("무료 런치"));
assert.ok(refund.includes("예정"));

const utc = "2026-11-16T02:00:00.000Z";
const label = formatUpdatedLabel(utc);
assert.ok(label.includes("11"), `expected Seoul month in ${label}`);
assert.ok(label.includes("11:00") || label.includes("11. 00") || /11:\d{2}/.test(label), `expected KST hour in ${label}`);

const delayed = resolveFreshnessMeta("2026-09-17T10:40:00.000Z", new Date("2026-11-16T03:00:00.000Z"));
assert.equal(delayed.isLive, false);
assert.ok(delayed.liveLabel.includes("지연") || delayed.freshnessState === "delayed");

console.log("PASS: prod-quality-positioning");
