/**
 * 2분 SLA SSOT 회귀
 */
import assert from "node:assert/strict";
import {
  isCustomerTwoMinuteSlaMode,
  getCustomerResearchBudgetMs,
  getColumnistSlaGenerationBudgetMs,
  getColumnistFastMaxTokens,
  getNaverMaxQueries,
  shouldSkipV3PreWriteForSla,
  shouldSkipResearchDepthCascadeForSla,
  shouldSkipSupplementalResearchForSla,
} from "../lib/config/briclogFastPipeline.js";
import { getCustomerBlogSlaMs } from "../lib/config/briclogDefaults.js";
import { estimateBlogGenerationMs } from "../lib/loading/estimateGenerationMs.js";
import { resolveUneditedPublishMinChars } from "../lib/product/uneditedPublishGradeGate.js";

process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_FAST_PIPELINE = "true";
process.env.BRICLOG_MAX_QUALITY = "false";

assert.equal(isCustomerTwoMinuteSlaMode(), true, "2min SLA mode on");
assert.equal(getCustomerBlogSlaMs(), 120_000, "customer blog SLA 120s");
assert.ok(getCustomerResearchBudgetMs() <= 48_000, "research budget capped");
assert.ok(
  getCustomerResearchBudgetMs() + getColumnistSlaGenerationBudgetMs() <= 125_000,
  "research + gen budgets fit 2min"
);
assert.equal(getNaverMaxQueries({}), 2, "SLA naver queries capped at 2");
assert.equal(getColumnistFastMaxTokens(), 2800, "columnist fast tokens capped");
assert.equal(shouldSkipV3PreWriteForSla(), true, "skip v3 in SLA");
assert.equal(shouldSkipResearchDepthCascadeForSla(), true, "skip depth cascade in SLA");
assert.equal(
  shouldSkipSupplementalResearchForSla({ researchFacts: [{ fact: "a" }, { fact: "b" }, { fact: "c" }] }),
  true,
  "skip supplemental at 3 facts"
);

const totalEst = estimateBlogGenerationMs(
  { brandName: "A", topic: "B", researchEnabled: true },
  { blogOnly: false }
);
assert.equal(totalEst, 120_000, "UI total estimate uses 2min SLA");

const blogOnlyEst = estimateBlogGenerationMs(
  {
    v2ResearchReady: true,
    v2PreWriteVerified: true,
    v2PipelineStage: "information_research_verified",
    brandName: "A",
    topic: "B",
  },
  { blogOnly: true }
);
assert.ok(blogOnlyEst <= 55_000, "blog-only estimate after research");

assert.ok(resolveUneditedPublishMinChars({}) >= 1200, "unedited min chars floor");

console.log("OK two-minute-sla");
