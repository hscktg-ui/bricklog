/**
 * 채널별 토큰 예산 SSOT
 * Run: npm run test:channel-token-budget
 */
import assert from "node:assert/strict";
import {
  getChannelTokenBudget,
  resolveColumnistCompletionTokens,
  hasColumnistDossierReady,
  getBlogOrchestratorWriteMaxTokens,
  getPlaceChannelMaxTokens,
  getInstagramChannelMaxTokens,
  summarizeChannelTokenBudgets,
} from "../lib/config/channelTokenBudget.js";

const summary = summarizeChannelTokenBudgets();
assert.equal(summary.version, "channel-token-v1");

assert.equal(getChannelTokenBudget("blog", "columnistFast"), 2400);
assert.equal(getChannelTokenBudget("blog", "columnistSlow"), 5200);
assert.ok(getPlaceChannelMaxTokens() <= getChannelTokenBudget("blog", "columnistFast"));
assert.ok(getInstagramChannelMaxTokens() <= getPlaceChannelMaxTokens());

assert.equal(getChannelTokenBudget("blog", "columnistFastDossier"), 2000);
assert.equal(
  resolveColumnistCompletionTokens(
    { columnistFastDelivery: true, researchFirstDossier: { writable: true, organized: { lines: ["a", "b"] } } },
    { fast: true }
  ),
  2000
);
assert.equal(hasColumnistDossierReady({ v2ResearchReady: true, v2PreWriteVerified: true, researchFacts: [{}, {}] }), true);

assert.ok(getBlogOrchestratorWriteMaxTokens("medium") >= 2800);

console.log("OK channel-token-budget", summary.version);
