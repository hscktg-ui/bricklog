/**
 * Max Quality mode — Writer ON · full prompt · Gemini pro · slow pipeline
 */
import assert from "node:assert/strict";
import {
  isBriclogMaxQualityEnabled,
  resolveGeminiModel,
  getGeminiResearchTimeoutMs,
  getMaxQualityCqReviewRevisions,
} from "@/lib/config/briclogMaxQuality.js";
import {
  isBriclogFastPipelineEnabled,
  isWriterEngineExpansionEnabled,
  isSlimWriterPromptEnabled,
  isChannelStandaloneFastEnabled,
  isChannelPackDeferred,
  getCoreMaxRewrites,
  getGenerationTimeBudgetMs,
  getLlmLoopBudgetMs,
  getNaverMaxQueries,
} from "@/lib/config/briclogFastPipeline.js";
import {
  shouldUseGpt55LightDelivery,
  shouldSkipWriterEngineForGpt55,
} from "@/lib/product/gpt55LightDelivery.js";
import {
  isBriclogAGradeFloorEnabled,
} from "@/lib/product/aGradeDeliveryEngine.js";
import {
  isBriclogBGradeFloorEnabled,
} from "@/lib/product/bGradeDeliveryEngine.js";
import { isBriclogAlwaysDeliverEnabled } from "@/lib/config/masterRebuildFlags.js";
import { getQualityTarget } from "@/lib/quality/qualityDefaults.js";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider.js";

const prevMission = process.env.BRICLOG_MISSION;
const prevMax = process.env.BRICLOG_MAX_QUALITY;
const prevKey = process.env.OPENAI_API_KEY;
const prevDominant = process.env.BRICLOG_GPT55_DOMINANT;

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_MAX_QUALITY = "true";
process.env.OPENAI_API_KEY = "sk-test-key-for-max-quality-0123456789";
process.env.BRICLOG_GPT55_DOMINANT = "true";

assert.ok(isBriclogMaxQualityEnabled());
assert.ok(isGpt55WriterDominant());
assert.ok(!isBriclogFastPipelineEnabled(), "fast pipeline off");
assert.ok(isWriterEngineExpansionEnabled(), "writer engine on");
assert.ok(!isSlimWriterPromptEnabled(), "full writer prompt");
assert.ok(!isChannelStandaloneFastEnabled(), "channel full depth");
assert.ok(!isChannelPackDeferred(), "channel pack inline");
assert.ok(getCoreMaxRewrites() >= 5);
assert.ok(getGenerationTimeBudgetMs() >= 120_000);
assert.ok(getLlmLoopBudgetMs() >= 120_000);
assert.ok(getNaverMaxQueries() >= 16);
assert.equal(getQualityTarget(), 100);
assert.ok(!isBriclogAGradeFloorEnabled(), "honest A grade");
assert.ok(!isBriclogBGradeFloorEnabled(), "honest B grade");
assert.ok(!isBriclogAlwaysDeliverEnabled(), "strict deliver gate");
assert.equal(resolveGeminiModel(), "gemini-2.5-pro");
assert.ok(getGeminiResearchTimeoutMs() >= 45_000);
assert.equal(getMaxQualityCqReviewRevisions(), 3);

const llmPack = {
  title: "테스트",
  sections: [
    { heading: "a", body: "본문1" },
    { heading: "b", body: "본문2" },
    { heading: "c", body: "본문3" },
  ],
  _meta: { llmGenerated: true, generationMode: "llm_gpt55" },
};
const input = { brandName: "브랜드", region: "서울", topic: "주제" };

assert.ok(!shouldUseGpt55LightDelivery(llmPack, input), "no gpt55 light");
assert.ok(!shouldSkipWriterEngineForGpt55(llmPack, input), "never skip writer");

if (prevMission === undefined) delete process.env.BRICLOG_MISSION;
else process.env.BRICLOG_MISSION = prevMission;
if (prevMax === undefined) delete process.env.BRICLOG_MAX_QUALITY;
else process.env.BRICLOG_MAX_QUALITY = prevMax;
if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
else process.env.OPENAI_API_KEY = prevKey;
if (prevDominant === undefined) delete process.env.BRICLOG_GPT55_DOMINANT;
else process.env.BRICLOG_GPT55_DOMINANT = prevDominant;

console.log("OK: max-quality mode — writer, full prompt, gemini pro, slow pipeline");
