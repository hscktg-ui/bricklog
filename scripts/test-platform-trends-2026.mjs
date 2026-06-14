import assert from "node:assert/strict";
import {
  PLATFORM_TRENDS_VERSION,
  buildPlatformTrendPromptBlock,
  getOperatingPlanPlatformStrategy,
  getPlatformTrendBrief,
  isPlatformTrendsActive,
} from "../lib/trends/platformTrends2026.js";
import { formatContentOperatingPlanBrief, buildContentOperatingPlan } from "../lib/product/briclogBrandContentOS.js";
import { buildNaverEnginePromptAddon } from "../lib/channel/naverBlogEngineRules.js";
import { NAVER_PLATFORM_2026 } from "../lib/evolution-lab/naverTrendBaselines.js";

assert.equal(PLATFORM_TRENDS_VERSION, "2026-2027");
assert.ok(isPlatformTrendsActive(new Date("2027-06-01")));

const brief = getPlatformTrendBrief("blog");
assert.match(brief, /2026-2027/);
assert.match(brief, /권위|AI Briefing|AuthGR/i);

const block = buildPlatformTrendPromptBlock("blog", { contentDate: "2026-06-15" });
assert.match(block, /AuthGR|AI Briefing/);
assert.match(block, /트렌드 키워드/);

const placeBlock = buildPlatformTrendPromptBlock("smartplace");
assert.match(placeBlock, /Place/);

const plan = buildContentOperatingPlan({
  brandName: "모닝브루",
  region: "강남",
  topic: "브런치 추천",
  industryLabel: "카페",
});
const planBrief = formatContentOperatingPlanBrief(plan);
assert.match(planBrief, /2026–2027 플랫폼 전략/);
assert.ok(plan.platformStrategy?.length >= 2);

const naverAddon = buildNaverEnginePromptAddon({ industryLabel: "카페" });
assert.match(naverAddon, /AuthGR/);

assert.ok(NAVER_PLATFORM_2026.contentSignals.length >= 4);

const strategy = getOperatingPlanPlatformStrategy({ brandName: "테스트", industryLabel: "꽃집" });
assert.match(strategy[0], /AI Briefing/);

console.log("test-platform-trends-2026: OK");
