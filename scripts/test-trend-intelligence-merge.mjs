/**
 * Trend intelligence — platform SSOT fallback when RSS snapshot absent
 */
import assert from "node:assert/strict";
import {
  getTrendHintsForChannel,
  getTrendIntelligenceProfile,
} from "../lib/trends/trendIntelligence.js";

const blogHints = getTrendHintsForChannel("blog", null, "cafe");
assert.ok(blogHints.length >= 1, "platform trends fallback for blog");
assert.match(blogHints[0], /2026/);

const profile = getTrendIntelligenceProfile(null, "flower");
assert.equal(profile.platformTrends2026, true);
assert.ok(
  profile.source === "platform_trends_2026" || profile.source === "collected_snapshot"
);

console.log("test-trend-intelligence-merge: PASS");
