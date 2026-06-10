/**
 * 검수 미통과·게이트 실패 시에도 mission fallback + human-grade display로 송출
 */
import { enrichMinimalBlogInput } from "@/lib/llm/blogDeliveryFallback";
import { buildDeliverableBlogFallback } from "@/lib/llm/blogDeliveryFallback";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack";
import { hasFilledBlogAxes } from "@/lib/product/deliverySoftPass";
import { attachContentQualityToApiMeta } from "@/lib/product/contentQualityDelivery";
import { LLM_USER_MESSAGES } from "@/lib/llm/messages";

function stampRescueMeta(pack) {
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      draftFallback: true,
      deliveryRescue: true,
      missionProseFallback: true,
    },
  };
}

/**
 * @param {object} input
 * @param {object} [gate]
 * @param {object} [partial]
 */
export function buildMissionRescueApiDelivery(input = {}, gate = {}, partial = {}) {
  if (!hasFilledBlogAxes(input)) return null;
  const enriched = enrichMinimalBlogInput(input);
  let fallback = buildMissionProseFallbackPack(enriched);
  if (!fallback?.sections?.length) {
    ({ pack: fallback } = buildDeliverableBlogFallback({
      input: enriched,
      failures: gate.reasons || gate.failReasons || ["rescue"],
    }));
  }
  if (!fallback?.sections?.length) return null;

  const displayed = ensureBlogDisplayPack(stampRescueMeta(fallback), enriched);
  if (!displayed?.sections?.length || displayed._meta?.placeholderWithheld) {
    return null;
  }

  return {
    ok: true,
    blogContent: displayed,
    withheld: false,
    softPass: false,
    userMessage: null,
    userDetail: partial.userDetail ?? LLM_USER_MESSAGES.draftFallbackDetail,
    llmAvailable: partial.llmAvailable ?? false,
    baseContentLabel: partial.baseContentLabel ?? null,
    mode: partial.mode || "draft_fallback",
    meta: attachContentQualityToApiMeta(
      {
        ...(partial.meta || {}),
        draftFallback: true,
        deliveryRescue: true,
        generationMode: "mission_rescue_delivery",
        failReasons: (gate.reasons || gate.failReasons || []).slice(0, 8),
      },
      displayed
    ),
  };
}
