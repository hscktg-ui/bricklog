/**
 * Sovereign Always Deliver — columnist 실패 시 조사 기반 quality leap (2분 SLA)
 * 대원칙: 무조건 결과 · OpenAI throttle만 withhold
 */
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import { hasFilledBlogAxes } from "@/lib/product/deliverySoftPass";
import { isCustomerTwoMinuteSlaMode } from "@/lib/config/briclogFastPipeline";
import { buildDeliverableBlogFallback } from "@/lib/llm/blogDeliveryFallback";
import { finalizeQualityLeapPack } from "@/lib/product/qualityLeapFinish";
import { assessUnifiedBlogDelivery } from "@/lib/product/unifiedDeliveryGate";
import { finalizeGpt55BlogPackForUi } from "@/lib/product/gpt55LightDelivery";
import { QUALITY_NORTH_STAR_VERSION } from "@/lib/product/qualityNorthStar";

export const SOVEREIGN_ALWAYS_DELIVER_VERSION = "sovereign-always-v1";

function isThrottleCode(code = "") {
  return code === "openai_quota" || code === "openai_rate_limit";
}

export function shouldAttemptSovereignAlwaysDeliver(input = {}, diagnostic = null) {
  if (!isCustomerTwoMinuteSlaMode()) return false;
  if (isThrottleCode(diagnostic?.code)) return false;
  if (!hasFilledBlogAxes(input)) return false;
  return hasUsableResearchFacts(input) || String(input.storeFeatures || "").trim().length >= 8;
}

/**
 * @returns {{ pack: object, mode: string, unified: object, source: string } | null}
 */
export function attemptSovereignQualityLeapDeliver(input = {}, diagnostic = null) {
  if (!shouldAttemptSovereignAlwaysDeliver(input, diagnostic)) return null;

  const failures = [diagnostic?.code || "columnist_sovereign_failed"].filter(Boolean);
  const { pack: raw, source } = buildDeliverableBlogFallback({
    input,
    failures,
  });
  if (!raw?.sections?.length) return null;

  let pack = finalizeQualityLeapPack(raw, input, { salvage: true, source });
  let unified = assessUnifiedBlogDelivery(pack, input);

  if (!unified.pass && pack._meta?.qualityLeapSalvage) {
    pack = finalizeQualityLeapPack(pack, input, { salvage: true, source, forceSalvageBench: true });
    unified = assessUnifiedBlogDelivery(pack, input);
  }

  if (!unified.pass && !pack._meta?.visitReviewBenchmarkOk) return null;

  pack = finalizeGpt55BlogPackForUi(pack, input);
  unified = assessUnifiedBlogDelivery(pack, input);
  return {
    pack,
    mode: "sovereign_quality_leap",
    source,
    unified,
    northStar: QUALITY_NORTH_STAR_VERSION,
  };
}
