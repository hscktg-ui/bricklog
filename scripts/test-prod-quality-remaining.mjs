/**
 * Remaining prod-quality fixes — legal CRLF, trend honesty, snapshot SSOT, sample→auth draft
 * Run: node --import ./scripts/register-alias.mjs scripts/test-prod-quality-remaining.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  peekPublicTestSignupDraft,
  consumePublicTestSignupDraft,
} from "../lib/publicTest/restorePublicTestSignupDraft.js";

const loadLegalSrc = readFileSync("lib/legal/loadLegalDocument.js", "utf8");
assert.ok(
  loadLegalSrc.includes("/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n/"),
  "loadLegalDocument must use CRLF-safe FRONTMATTER_RE"
);

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
for (const slug of ["terms", "privacy", "refund"]) {
  const raw = readFileSync(`content/legal/${slug}.md`, "utf8");
  const match = FRONTMATTER_RE.exec(raw);
  assert.ok(match, `${slug} frontmatter must match CRLF-safe regex`);
  assert.ok(match[1].includes("effective:"), `${slug} meta body missing`);
  const stripped = raw.replace(FRONTMATTER_RE, "");
  assert.ok(!stripped.startsWith("---"), `${slug} strip failed`);
  assert.ok(!stripped.includes("effective:"), `${slug} meta leaked into body`);
  assert.ok(stripped.trimStart().length > 40, `${slug} body too short after strip`);
}

const termsBytes = readFileSync("content/legal/terms.md");
assert.ok(
  termsBytes.includes(Buffer.from([13, 10])),
  "terms.md should remain CRLF fixture for Windows"
);

const trendDetail = readFileSync("app/trend/[slug]/page.js", "utf8");
assert.ok(trendDetail.includes("trend.isLive && !trend.isSample && trend.hourlyChange"));
assert.ok(!/1시간 \{formatScoreDelta/.test(trendDetail));
assert.ok(trendDetail.includes("최근 수집 대비"));
assert.ok(trendDetail.includes("수집 상태"));

const snapshotRoute = readFileSync("app/api/trends/snapshot/route.js", "utf8");
assert.ok(snapshotRoute.includes("getTrendCatalog"));
assert.ok(snapshotRoute.includes('source: "catalog"'));
assert.ok(snapshotRoute.includes("file_snapshot_missing_using_catalog"));

const landing = readFileSync("components/home/TrendLandingPage.jsx", "utf8");
assert.ok(landing.includes("수집 성공"));
assert.ok(landing.includes("수집 실패·대기"));
assert.ok(landing.includes("data-trend-collect"));
assert.ok(landing.includes("freshnessBadgeClass"));

const empty = readFileSync("components/PipelineEmptyState.jsx", "utf8");
assert.ok(empty.includes("min-h-[48px]"));
assert.ok(empty.includes("rounded-full"));

const loading = readFileSync("components/ui/PageLoadingState.jsx", "utf8");
assert.ok(loading.includes("aria-busy"));
assert.ok(loading.includes("briclog-spinner"));

const resultTabs = readFileSync("components/ResultTabs.jsx", "utf8");
assert.ok(resultTabs.includes("이야기·플레이스·인스타"));

const draftSrc = readFileSync("lib/publicTest/restorePublicTestSignupDraft.js", "utf8");
assert.ok(draftSrc.includes("briclog-public-test-signup-draft"));
assert.equal(typeof peekPublicTestSignupDraft, "function");
assert.equal(typeof consumePublicTestSignupDraft, "function");

const quotaClient = readFileSync("lib/publicTest/publicTestQuotaClient.js", "utf8");
assert.ok(quotaClient.includes("stashPublicTestDraftForSignup"));
assert.ok(quotaClient.includes("briclog-public-test-signup-draft"));

const authForm = readFileSync("components/AuthForm.jsx", "utf8");
assert.ok(authForm.includes("peekPublicTestSignupDraft"));

const publicTest = readFileSync(
  "components/landing/public-test/PublicBrandTestSection.jsx",
  "utf8"
);
assert.ok(publicTest.includes("onSignup"));
assert.ok(publicTest.includes("signup("));
assert.ok(
  publicTest.includes("stashPublicTestDraftForSignup") ||
    quotaClient.includes("stashPublicTestDraftForSignup")
);

console.log("PASS: prod-quality-remaining");
