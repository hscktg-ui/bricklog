/**
 * BRICLOG Editor Pre-Output Gate — 최종 출력 전 8항 검수
 */
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import { isMechanicalListingTitle } from "@/lib/content/brandContentEngine";
import { detectDuplicateKillerIssues } from "@/lib/content/duplicateKillerEngine";
import { hasMetaPhilosophyLeak } from "@/lib/content/metaLayerSeparation";
import { isPublishableBlogPack } from "@/lib/content/outlinePackGuard";
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  detectEditorQualityIssues,
  scoreGiSeungJeonGyeol,
  scoreProfessionalEditorTone,
  applyEditorQualityPack,
} from "@/lib/content/editorQualityEngine";
import { enforceStrictBlogLength } from "@/lib/content/editorLengthControlEngine";
import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { applyPerspectiveEngine } from "@/lib/content/perspectiveEngine";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { isLengthPaddingForbidden } from "@/lib/product/missionFlags";
import {
  buildMissionProseFallbackPack,
  deepenMissionProseToMin,
} from "@/lib/llm/missionProseFallback";

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {object} input
 */
export function assertEditorPreOutput(pack, ctx = {}, input = {}) {
  const evalInput = input || ctx.input || ctx;
  const reasons = [];
  const checklist = {};

  const length = assertBlogLengthTier(evalInput, pack);
  checklist.length_tier = length.ok;
  if (!length.ok) {
    reasons.push(...(length.reasons || []));
  }

  const title = pack?.representativeTitle || pack?.title || "";
  checklist.natural_title = !isMechanicalListingTitle(title, ctx, evalInput);
  if (!checklist.natural_title) reasons.push("mechanical_title");

  const full = getBlogFullText(pack);
  const region = String(ctx.region || evalInput.region || "").trim();
  const brand = String(ctx.brandName || evalInput.brandName || "").trim();
  const topic = String(evalInput.topic || evalInput.mainKeyword || ctx.topic || "").trim();
  checklist.brand_region_topic =
    (!brand || full.includes(brand)) &&
    (!region || full.includes(region)) &&
    (!topic || topic.length < 3 || full.includes(topic.split(/\s+/)[0] || topic));
  if (!checklist.brand_region_topic) reasons.push("brand_region_topic_weak");

  const flow = scoreGiSeungJeonGyeol(pack);
  checklist.gi_seung_jeon_gyeol = flow.ok;
  if (!flow.ok) reasons.push(...(flow.reasons || []).map((r) => `structure_${r}`));

  const dup = detectDuplicateKillerIssues(full, {
    sameInfoMax: 2,
    similarityPercent: 70,
  });
  checklist.no_duplicate = dup.ok;
  if (!dup.ok) reasons.push("duplicate_content");

  checklist.no_meta_leak = !hasMetaPhilosophyLeak(full, ctx);
  if (!checklist.no_meta_leak) reasons.push("meta_layer_leak");

  const editorIssues = detectEditorQualityIssues(pack, ctx, evalInput);
  checklist.editor_quality = editorIssues.ok;
  if (!editorIssues.ok) {
    for (const issue of editorIssues.issues.slice(0, 4)) {
      reasons.push(`editor_${issue.type}`);
    }
  }

  const tone = scoreProfessionalEditorTone(pack);
  checklist.professional_tone = tone.ok;
  if (!tone.ok) reasons.push("editor_tone_weak");

  checklist.publishable = isPublishableBlogPack(pack);
  if (!checklist.publishable) reasons.push("not_publishable");

  const reviewerScore = Math.min(
    length.ok ? 95 : 60,
    flow.score,
    tone.score,
    dup.ok ? 100 : 70,
    checklist.publishable ? 100 : 50
  );

  return {
    ok: [...new Set(reasons)].length === 0,
    reasons: [...new Set(reasons)],
    checklist,
    reviewerScore,
    length,
    flow,
    tone,
    duplicate: dup,
  };
}

/**
 * 검수 실패 시 자동 보정 — 길이·메타·에디터 품질
 */
export function applyEditorPreOutputCorrection(pack, ctx = {}, input = {}) {
  let next = applyEditorQualityPack(pack, ctx, input);
  next = applyPerspectiveEngine(next, ctx, input);

  next = normalizeBlogLengthAndStructure(next, ctx, input).pack;
  let lengthResult = enforceStrictBlogLength(next, ctx, input, { maxAttempts: 24 });
  next = lengthResult.pack;

  if (!lengthResult.ok) {
    next = normalizeBlogLengthAndStructure(next, ctx, input).pack;
    lengthResult = enforceStrictBlogLength(next, ctx, input, { maxAttempts: 24 });
    next = lengthResult.pack;
  }

  if (isLengthPaddingForbidden()) {
    const tierKey = input.blogLengthTier || ctx.blogLengthTier || "medium";
    const tier = resolveBlogLengthTier(tierKey);
    if (countBlogBodyCharsWithSpaces(next) < tier.min) {
      next = deepenMissionProseToMin(next, tier.min, { ...ctx, ...input, blogLengthTier: tierKey });
      next = normalizeBlogLengthAndStructure(next, ctx, input).pack;
      if (countBlogBodyCharsWithSpaces(next) < tier.min) {
        next = buildMissionProseFallbackPack({ ...ctx, ...input, blogLengthTier: tierKey });
        next = normalizeBlogLengthAndStructure(next, ctx, input).pack;
      }
      lengthResult = enforceStrictBlogLength(next, ctx, input, { maxAttempts: 24 });
      next = lengthResult.pack;
    }
  }

  const gate = assertEditorPreOutput(next, ctx, input);
  return {
    pack: next,
    gate,
    lengthOk: lengthResult.ok,
  };
}
