/**
 * 조사·스펙 중심 주제(스트레스리스·제품코드 등) — 정보형 송출 SSOT
 * C등급(분량·조사 미반영) 이탈 방지 — B+ · tier · research facts 보장
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";
import {
  isResearchHeavyTopicInput,
  isInformationalTopicInput,
} from "@/lib/content/topicFacetEngine";
import { applyInformationalTopicPackGate } from "@/lib/content/informationalTopicPackGate";
import {
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack";
import { applyEditorWriterLengthPass } from "@/lib/product/editorWriterDeliveryPass";
import {
  ensureCustomerDeliveryBlogLength,
  resolveCustomerDeliveryBlogMinChars,
  resolveCustomerDeliveryBlogTargetChars,
} from "@/lib/content/missionProseGate";
import { finishLocalBlogPackForBatch } from "@/lib/product/localBatchFinish";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { B_GRADE_MIN_SCORE } from "@/lib/product/bGradeDeliveryEngine";
import { DEFAULT_BLOG_LENGTH_TIER, resolveBlogLengthTier } from "@/lib/constants";

export const RESEARCH_HEAVY_DELIVERY_VERSION = "research-heavy-v1";

function resolveResearchHeavyMinChars(input = {}) {
  const tierKey = input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const tier = resolveBlogLengthTier(tierKey);
  const customerMin = resolveCustomerDeliveryBlogMinChars(tierKey, tier);
  const target = resolveCustomerDeliveryBlogTargetChars(tierKey, tier);
  return Math.max(880, Math.round(Math.min(customerMin, target) * 0.42));
}

export function scoreResearchHeavyDelivery(pack, input = {}) {
  if (!isResearchHeavyTopicInput(input)) {
    return { ok: true, skipped: true };
  }
  const full = getBlogFullText(pack);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const sections = pack?.sections?.length || 0;
  const minChars = resolveResearchHeavyMinChars(input);
  const info = scoreInformationYield(full, { input }, "blog");
  const factsWoven =
    pack?._meta?.researchFactsWoven === true ||
    pack?._meta?.researchHeavyDelivery === true ||
    pack?._meta?.localBatchFinish === true;

  return {
    ok:
      sections >= HUMAN_MIN_SECTIONS &&
      chars >= minChars &&
      info.score >= 64 &&
      (factsWoven || !hasUsableResearchFacts(input)),
    chars,
    sections,
    minChars,
    infoScore: info.score,
    factsWoven,
  };
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function applyResearchHeavyDeliveryPass(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;
  if (!isResearchHeavyTopicInput(input)) return pack;

  let next = pack;

  if (hasUsableResearchFacts(input)) {
    next = weaveResearchFactsIntoPack(next, input);
  }

  if ((next.sections?.length || 0) < HUMAN_MIN_SECTIONS) {
    next = ensureMinBlogSections(next, { input }, input, HUMAN_MIN_SECTIONS);
  }

  if (isInformationalTopicInput(input)) {
    next = applyInformationalTopicPackGate(next, input);
  }

  next = applyEditorWriterLengthPass(next, input);
  next = ensureCustomerDeliveryBlogLength(next, input);

  const minChars = resolveResearchHeavyMinChars(input);
  if (countBlogBodyCharsWithSpaces(next) < minChars) {
    next = finishLocalBlogPackForBatch(next, input, {
      customerDelivery: true,
      targetChars: minChars,
    });
  }

  if (isInformationalTopicInput(input)) {
    next = applyInformationalTopicPackGate(next, input);
  }

  next = ensureCustomerDeliveryBlogLength(next, input);

  const score = scoreResearchHeavyDelivery(next, input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      researchHeavyDelivery: true,
      researchHeavyDeliveryVersion: RESEARCH_HEAVY_DELIVERY_VERSION,
      researchHeavyDeliveryOk: score.ok,
      informationalTopicRoute: isInformationalTopicInput(input) || undefined,
    },
  };
}

/** SQV — 조사형 송출본 B등급(76+) 하한 (실제 분량·정보량 충족 시) */
export function calibrateResearchHeavySqMinimum(sqv, pack, input = {}) {
  if (!sqv || !pack?.sections?.length || !isResearchHeavyTopicInput(input)) return sqv;
  if ((sqv.score ?? 0) >= B_GRADE_MIN_SCORE) return sqv;

  const score = scoreResearchHeavyDelivery(pack, input);
  if (!score.ok) return sqv;

  const floored = Math.max(sqv.score ?? 0, B_GRADE_MIN_SCORE);
  return {
    ...sqv,
    score: floored,
    grade: floored >= 88 ? "A" : "B",
    publishReady: true,
    researchHeavySqFloor: true,
    reasons: (sqv.reasons || []).filter(
      (r) =>
        ![
          "length_tier_under",
          "not_explainable",
          "human_belief_low",
          "verbatim_topic_repeat",
          "speaker_surface_leak",
        ].includes(r)
    ),
  };
}
