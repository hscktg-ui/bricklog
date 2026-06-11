/**
 * 품질 파이프라인 — Fast Pipeline·regen·프롬프트 정합
 * Run: node --import ./scripts/register-alias.mjs scripts/test-quality-pipeline-alignment.mjs
 */

import {
  getCoreMaxRewrites,
  getLlmLoopBudgetMs,
  getGenerationTimeBudgetMs,
  isSlimWriterPromptEnabled,
  shouldSkipOffAxisPrune,
  isBriclogFastPipelineEnabled,
} from "../lib/config/briclogFastPipeline.js";

const prevMax = process.env.BRICLOG_MAX_QUALITY;
process.env.BRICLOG_MAX_QUALITY = "false";
import {
  needsCoreRegen,
  partitionCoreRegenReasons,
  CORE_SOFT_REGEN_REASONS,
} from "../lib/quality/coreQualityEngine.js";
import { getQualityTarget } from "../lib/quality/qualityDefaults.js";
import { buildDeliveryQualityHint } from "../lib/product/customerOutput.js";
import {
  attachDeliveryTelemetry,
  resolveDeliveryPath,
} from "../lib/product/deliveryTelemetry.js";
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(getCoreMaxRewrites() >= 2, "fast pipeline default rewrites >= 2");
assert(getLlmLoopBudgetMs() >= 50_000, "LLM loop budget raised for quality");
assert(getGenerationTimeBudgetMs() >= 70_000, "generation budget raised");
assert(isSlimWriterPromptEnabled(), "slim writer prompt on in fast mode");
assert(shouldSkipOffAxisPrune(), "off-axis prune skipped by default in fast mode");

assert(
  !needsCoreRegen({ total: 93, failReasons: ["topic_dominance_low"] }),
  "soft-only mid score should not regen"
);
assert(
  needsCoreRegen({ total: 90, failReasons: ["topic_dominance_low"] }),
  "soft-only low score should regen"
);
assert(
  needsCoreRegen({ total: 98, failReasons: ["placeholder_detected"] }),
  "critical fail always regens"
);
assert(
  needsCoreRegen({ total: 94, failReasons: [] }),
  "below target with no reasons still regens"
);
assert(
  !needsCoreRegen({ total: 96, failReasons: [] }),
  "at/above target with no reasons should not regen"
);

const parts = partitionCoreRegenReasons([
  "topic_dominance_low",
  "placeholder_detected",
]);
assert(parts.soft.length === 1, "partition soft");
assert(parts.critical.length === 1, "partition critical");
assert(CORE_SOFT_REGEN_REASONS.has("brand_under_reflected"), "soft set");

assert(
  buildDeliveryQualityHint({ draftFallback: true }) ===
    "아래는 자동 보강 편집본이에요. 마음에 들지 않으면 「다시 받기」를 눌러 주세요.",
  "fallback hint"
);
assert(
  buildDeliveryQualityHint({ softPass: true, generationMode: "llm_soft_pass" }),
  "soft pass hint"
);

const tele = attachDeliveryTelemetry(
  { generationMode: "llm_openai", passOutput: true },
  { _meta: { qualityScore: { total: 96 } } }
);
assert(tele.deliveryPath === "llm_hard_pass", "telemetry hard pass");
assert(
  resolveDeliveryPath({ draftFallback: true }, {}) === "template_fallback",
  "telemetry fallback path"
);

assert(getQualityTarget() === 95, "prod quality target 95");

if (prevMax === undefined) delete process.env.BRICLOG_MAX_QUALITY;
else process.env.BRICLOG_MAX_QUALITY = prevMax;

console.log("OK: quality pipeline alignment — budget, slim prompt, soft regen, telemetry");
