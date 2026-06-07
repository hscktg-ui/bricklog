/**
 * 피드백 반영 — 전체 재생성 vs 수술적 다듬기 전략
 * 피드백 시 품질 저하 방지: 기존 편집본을 유지하고 의도에 맞게만 수정
 */
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack";
import { salvageBlogPackForDelivery } from "@/lib/generation/postVerifySalvage";
import { parseFeedbackIntent, runRewrite } from "@/lib/rewrite/rewriteEngine";

const FULL_REGEN_INTENTS = new Set([
  "restructure_sections",
  "add_information_units",
  "expand_explanations",
  "clarify_selection_criteria",
]);

const SURGICAL_TAG_IDS = new Set([
  "title_weak",
  "repeat",
  "seo_weak",
  "too_ad",
  "too_ai",
  "gpt_tone",
  "low_emotion",
  "brand_weak",
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
  if (pack._meta?.isBriefOnly || pack._meta?.missionProseFallback) return true;
  if (pack._meta?.draftFallback) return true;

  const rewriteCount = Number(pack._meta?.rewriteCount || 0);
  if (rewriteCount >= 2) return false;

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
  if (/주제\s*바꿔|다른\s*주제|처음부터|전체\s*다시|새로\s*써/i.test(memoText)) {
    return true;
  }

  if (scope !== "all" && scope !== "sections") return false;

  const tags = Array.isArray(tagIds) ? tagIds : [];
  if (tags.length === 0 && !memoText.trim()) return false;

  const surgicalTags = tags.filter((id) => SURGICAL_TAG_IDS.has(id));
  if (surgicalTags.length === tags.length && tags.length > 0) return false;
  if (scope === "title") return false;

  if (tags.includes("low_info") && tags.includes("length_wrong")) return true;
  if (intentSet.has("add_information_units") && intentSet.has("expand_explanations")) {
    return true;
  }

  return false;
}

/** rewrite 후 salvage·display 품질 파이프라인 (enrichBlogPack 대체) */
export function polishFeedbackRewritePack(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length) return pack;
  const pipelineInput = input || ctx.input || ctx;
  let next = salvageBlogPackForDelivery(pack, pipelineInput);
  next = ensureBlogDisplayPack(next, pipelineInput);
  return {
    ...next,
    _meta: {
      ...(pack._meta || {}),
      ...(next._meta || {}),
      feedbackPolished: true,
      salvageDeliveryFinalized: next._meta?.salvageDeliveryFinalized ?? true,
    },
  };
}

/**
 * 피드백 수술적 반영 — runRewrite 결과를 품질 게이트에 통과시킴
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
