/**
 * 피드백 반영 — 전체 재생성 vs 수술적 다듬기 전략
 * 품질·업종 오염 방지: 정보/AI톤 피드백은 항상 업종 잠금 재생성
 */
import { finalizeContentQualityForDelivery } from "@/lib/product/contentQualityDelivery";
import { parseFeedbackIntent, runRewrite } from "@/lib/rewrite/rewriteEngine";

const FULL_REGEN_INTENTS = new Set([
  "restructure_sections",
  "add_information_units",
  "expand_explanations",
  "clarify_selection_criteria",
  "humanize_prose",
  "remove_template_phrases",
  "increase_information_density",
  "strengthen_brand_voice",
  "strengthen_local_intent",
]);

const FULL_REGEN_TAG_IDS = new Set([
  "low_info",
  "too_ai",
  "gpt_tone",
  "too_weak",
  "repeat",
  "brand_weak",
  "seo_weak",
]);

const SURGICAL_ONLY_TAG_IDS = new Set([
  "title_weak",
  "too_ad",
  "low_emotion",
  "length_wrong",
]);

/**
 * @param {object} opts
 * @returns {boolean}
 */
export function shouldFeedbackFullRegen({
  intents = [],
  tagIds = [],
  scope = "all",
  memo = "",
  inputPatch = {},
  existingPack = null,
} = {}) {
  const pack = existingPack;
  if (!pack?.sections?.length) return true;
  if (pack._meta?.isBriefOnly) return true;

  if (inputPatch.topic && inputPatch.topic !== pack._meta?.topicSeed) {
    return true;
  }

  const intentSet = new Set(
    (Array.isArray(intents) ? intents : []).map((x) => String(x || "").trim()).filter(Boolean)
  );
  if ([...intentSet].some((id) => FULL_REGEN_INTENTS.has(id))) {
    return true;
  }

  const memoText = String(memo || "");
  if (/주제\s*바꿔|다른\s*주제|처음부터|전체\s*다시|새로\s*써|gpt|ai\s*틱|정보\s*부족|가구|꽃|업종/i.test(memoText)) {
    return true;
  }

  if (scope === "title") return false;

  const tags = Array.isArray(tagIds) ? tagIds : [];
  if (tags.some((id) => FULL_REGEN_TAG_IDS.has(id))) return true;

  if (tags.length === 0 && !memoText.trim()) return false;

  const surgicalOnly =
    tags.length > 0 && tags.every((id) => SURGICAL_ONLY_TAG_IDS.has(id));
  if (surgicalOnly && scope !== "all" && scope !== "sections") return false;
  if (surgicalOnly && tags.length > 0 && !memoText.trim()) return false;

  if (tags.includes("low_info") && tags.includes("length_wrong")) return true;
  if (intentSet.has("add_information_units") && intentSet.has("expand_explanations")) {
    return true;
  }

  if (pack._meta?.missionProseFallback || pack._meta?.draftFallback) return true;

  return tags.length === 0 && Boolean(memoText.trim());
}

/** rewrite 후 delivery SSOT — 업종 잠금·EQS·게이트 통과 */
export function polishFeedbackRewritePack(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length) return pack;
  const pipelineInput = input || ctx.input || ctx;
  const next = finalizeContentQualityForDelivery(pack, pipelineInput, "blog");
  return {
    ...next,
    _meta: {
      ...(pack._meta || {}),
      ...(next._meta || {}),
      feedbackPolished: true,
      feedbackDeliveryFinalized: true,
    },
  };
}

/**
 * 피드백 수술적 반영 — 제목·톤 등 경미한 수정만 (품질 게이트 통과)
 */
export function applyFeedbackSurgicalRewrite(
  pack,
  feedbackText,
  ctx,
  scope = "all",
  tagIds = [],
  input = {}
) {
  const { pack: rewritten } = runRewrite(
    "blog",
    pack,
    feedbackText,
    ctx,
    scope,
    tagIds
  );
  const intent = parseFeedbackIntent(feedbackText, tagIds);
  const polished = polishFeedbackRewritePack(rewritten, ctx, input);
  return {
    pack: {
      ...polished,
      _meta: {
        ...(polished._meta || {}),
        rewritten: true,
        feedbackRewrite: true,
        feedbackSurgical: true,
        feedbackScope: intent.scope,
      },
    },
    intent,
  };
}
