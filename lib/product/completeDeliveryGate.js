/**
 * Complete delivery gate — stub·thin·core fail 차단 (doctrine SSOT 연동)
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  assessContentExplainabilityForPublish,
  isContentDoctrineEnforced,
} from "@/lib/product/briclogContentDoctrine";
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";
import { scoreCoreContent } from "@/lib/quality/coreQualityEngine";
import { detectOutlineLeak } from "@/lib/content/outlinePackGuard";
import {
  isMissionCatalogDeliveryPack,
  isMissionCatalogEvalPass,
  resolveMissionCatalogMinChars,
} from "@/lib/product/missionCatalogDelivery";

const STUB_GENERATION_MODES = new Set(["standalone", "form", "form_proxy"]);

/** core.total은 높아도 delivery를 막아야 하는 failReason */
const CORE_HARD_FOR_DELIVERY = new Set([
  "placeholder_detected",
  "outline_only_output",
  "meta_philosophy_leak",
  "fiction_detected",
  "internal_prompt_leak",
  "checklist_template_high",
  "coverage_slot_dump",
  "confirm_sentence_flood",
  "visit_review_template_contamination",
]);

/**
 * @param {object} pack
 * @param {Record<string, unknown>} input
 */
export function assertCompleteBlogPackForDelivery(pack, input = {}) {
  if (!isContentDoctrineEnforced()) {
    return { ok: true, reasons: [], chars: 0 };
  }

  const reasons = [];
  const chars = countBlogBodyCharsWithSpaces(pack);
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const isEditorialColumn =
    pack?._meta?.editorialQualityStandard === true ||
    pack?._meta?.editorialQualityReshape === true;
  const isMissionCatalog = isMissionCatalogDeliveryPack(pack, input);
  const editorialMin = Math.max(480, Math.round(tier.min * 0.2));
  const catalogMin = resolveMissionCatalogMinChars(input);
  const genMode = String(
    pack?._meta?.generationMode || pack?._meta?.sourceChannel || ""
  ).toLowerCase();

  if (!pack?.sections?.length) reasons.push("empty_pack");
  if (isMissionCatalog) {
    if (chars < catalogMin) reasons.push("length_tier_under");
  } else if (isEditorialColumn) {
    if (chars < editorialMin) reasons.push("length_tier_under");
  } else if (chars < tier.min) {
    reasons.push("length_tier_under");
  }
  if ((pack.sections?.length || 0) < 2) reasons.push("structure_structure_thin");
  if (STUB_GENERATION_MODES.has(genMode)) reasons.push("form_proxy_stub");

  const outline = detectOutlineLeak(pack, "blog");
  if (outline.isOutline && !(isMissionCatalog && isMissionCatalogEvalPass(pack))) {
    reasons.push("outline_only_output");
  }

  const explain = assessContentExplainabilityForPublish(input);
  if (!isMissionCatalog || !isMissionCatalogEvalPass(pack)) {
    if (!explain.ok) {
      for (const r of explain.reasons || []) reasons.push(r);
    }
  }

  const evalCtx = { ...input, input };
  const core = scoreCoreContent(pack, evalCtx, "blog");
  const hardCoreFails = (core.failReasons || []).filter((r) =>
    CORE_HARD_FOR_DELIVERY.has(r)
  );
  if (hardCoreFails.length) {
    reasons.push(...hardCoreFails);
  }

  const full = getBlogFullText(pack);
  const thinMin = isMissionCatalog
    ? Math.min(400, catalogMin * 0.85)
    : Math.min(400, tier.min * 0.45);
  if (full.replace(/\s/g, "").length < thinMin) {
    reasons.push("body_too_thin");
  }

  const unique = [...new Set(reasons.filter(Boolean))];
  return {
    ok: unique.length === 0,
    reasons: unique,
    chars,
    tierMin: tier.min,
    corePass: hardCoreFails.length === 0 && core.pass,
    topicExplainable: explain.topicExplainable,
    userMessage:
      unique.length === 0
        ? null
        : "완성 기준에 맞지 않아 글을 보류했습니다. 입력을 구체화하거나 「다시 받기」로 재생성해 주세요.",
  };
}

export function isCompleteDeliveryEnforced() {
  return isBriclogMissionEnforced();
}
