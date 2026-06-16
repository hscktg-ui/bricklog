/**
 * Research Stack A — 플래그·CSE 보조 쿼리 회귀
 */
import assert from "node:assert/strict";
import {
  isResearchStackAEnabled,
  isNaverNewsResearchEnabled,
  isGoogleCseSupplementEnabled,
  buildCseSupplementQueries,
  getNaverPerQueryCap,
  resolveNaverLeadFetchOptions,
} from "@/lib/config/researchStackA.js";
import { isOfficialSourceFirstEnabled } from "@/lib/config/brandEngineFlags.js";

const prevNode = process.env.NODE_ENV;
const prevStack = process.env.BRICLOG_RESEARCH_STACK_A;
const prevOfficial = process.env.BRICLOG_OFFICIAL_SOURCE_FIRST;
const prevCse = process.env.BRICLOG_CSE_SUPPLEMENT;

process.env.NODE_ENV = "production";
delete process.env.BRICLOG_RESEARCH_STACK_A;
delete process.env.BRICLOG_OFFICIAL_SOURCE_FIRST;

assert.equal(isResearchStackAEnabled(), true);
assert.equal(isOfficialSourceFirstEnabled(), true);
assert.equal(isNaverNewsResearchEnabled(), true);
assert.ok(getNaverPerQueryCap() >= 6);

const opts = resolveNaverLeadFetchOptions({ maxQueries: 10 });
assert.equal(opts.maxQueries, 10);
assert.equal(opts.includeNews, true);
assert.ok(opts.perQuery >= 6);
assert.ok(opts.maxResults >= 32);

process.env.BRICLOG_RESEARCH_STACK_A = "false";
assert.equal(isResearchStackAEnabled(), false);
assert.equal(isNaverNewsResearchEnabled(), false);

process.env.BRICLOG_CSE_SUPPLEMENT = "true";
process.env.GOOGLE_CSE_API_KEY = "test-key-abcdefghij";
process.env.GOOGLE_CSE_CX = "cx1234";
assert.equal(isGoogleCseSupplementEnabled(), true);

const cseQ = buildCseSupplementQueries(
  ["에이스침대 파주 공식 카탈로그"],
  { brandName: "에이스침대", officialDomain: "www.acebed.com" }
);
assert.ok(cseQ.some((q) => /site:acebed\.com/i.test(q)));

process.env.NODE_ENV = prevNode;
if (prevStack === undefined) delete process.env.BRICLOG_RESEARCH_STACK_A;
else process.env.BRICLOG_RESEARCH_STACK_A = prevStack;
if (prevOfficial === undefined) delete process.env.BRICLOG_OFFICIAL_SOURCE_FIRST;
else process.env.BRICLOG_OFFICIAL_SOURCE_FIRST = prevOfficial;
if (prevCse === undefined) delete process.env.BRICLOG_CSE_SUPPLEMENT;
else process.env.BRICLOG_CSE_SUPPLEMENT = prevCse;
delete process.env.GOOGLE_CSE_API_KEY;
delete process.env.GOOGLE_CSE_CX;

console.log("OK research stack A");
