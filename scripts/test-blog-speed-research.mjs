/**
 * Blog speed — research pre-verify & depth skip
 * Run: npm run test:blog-speed-research
 */
import {
  isClientResearchPreVerified,
  resolveResearchDepthMaxRounds,
  getNaverMaxQueries,
  getResearchClientTimeoutMs,
} from "../lib/config/briclogFastPipeline.js";
import { estimateBlogGenerationMs } from "../lib/loading/estimateGenerationMs.js";
import { isBriclogMaxQualityEnabled } from "../lib/config/briclogMaxQuality.js";
import { isBriclogFastPipelineEnabled, isTriAiResearchMaxMode } from "../lib/config/briclogFastPipeline.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const verified = {
  v2ResearchReady: true,
  v2PreWriteVerified: true,
  v2PipelineStage: "information_research_verified",
  researchFacts: [{ fact: "a" }, { fact: "b" }],
};

assert(isClientResearchPreVerified(verified), "pre-verified detect");
assert(resolveResearchDepthMaxRounds(verified, false) === 0, "depth skip when verified");
assert(resolveResearchDepthMaxRounds({ researchFacts: new Array(8).fill({ fact: "x" }) }, false) === 0, "depth skip at 8 facts");
assert(resolveResearchDepthMaxRounds({}, false) >= 0, "cold depth rounds");

assert(getNaverMaxQueries(verified) <= getNaverMaxQueries(), "verified naver cap");
assert(getResearchClientTimeoutMs(verified) <= getResearchClientTimeoutMs(), "verified timeout cap");

const estCold = estimateBlogGenerationMs({ brandName: "A", topic: "B", researchEnabled: true });
const estHot = estimateBlogGenerationMs({ ...verified, brandName: "A", topic: "B" });
assert(estHot < estCold, "UI estimate lower when research pre-done");
assert(estCold <= 130_000, "cold estimate within 1-2min UX band");

assert(isBriclogFastPipelineEnabled(), "fast pipeline default when max quality off");
assert(!isTriAiResearchMaxMode(), "tri-ai research max off unless explicit env");
assert(!isBriclogMaxQualityEnabled(), "prod UX: max quality off under reset quality");

console.log("OK: blog speed research — depth skip, naver cap, timeout, estimate");
console.log("  cold est:", estCold, "ms · verified est:", estHot, "ms");
