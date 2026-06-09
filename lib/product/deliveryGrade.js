/**
 * 배달 등급 SSOT — draft | human | publish
 * human = tier min(기본 2,000자) + 3섹션 이상
 */
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  DEFAULT_BLOG_LENGTH_TIER,
  resolveBlogLengthTier,
} from "@/lib/constants";

export const DELIVERY_GRADE = {
  DRAFT: "draft",
  HUMAN: "human",
  PUBLISH: "publish",
};

export const HUMAN_MIN_SECTIONS = 3;

export function resolveInputBlogLengthTier(input = {}) {
  return input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
}

export function countPackBodyChars(pack) {
  if (!pack?.sections?.length) return 0;
  return countBlogBodyCharsWithSpaces(pack);
}

/**
 * @param {object} pack
 * @param {object} [input]
 * @returns {{
 *   grade: "draft"|"human"|"publish",
 *   tierMet: boolean,
 *   chars: number,
 *   sections: number,
 *   tierKey: string,
 *   tierMin: number,
 *   tierTarget: number,
 * }}
 */
export function assessDeliveryGrade(pack, input = {}) {
  const tierKey = resolveInputBlogLengthTier(input);
  const tier = resolveBlogLengthTier(tierKey);
  const sections = pack?.sections?.length || 0;
  const chars = countPackBodyChars(pack);
  const meta = pack?._meta || {};
  const tierMet = sections >= HUMAN_MIN_SECTIONS && chars >= tier.min;

  let grade = DELIVERY_GRADE.DRAFT;
  if (tierMet) {
    grade = DELIVERY_GRADE.HUMAN;
  }
  const publishReady =
    tierMet &&
    (meta.publishReady === true ||
      meta.sqv?.publishReady === true ||
      (meta.passOutput === true && !meta.deliveryRescue && !meta.draftFallback));
  if (publishReady && !meta.deliveryRescue && !meta.missionProseFallback) {
    grade = DELIVERY_GRADE.PUBLISH;
  }

  return {
    grade,
    tierMet,
    chars,
    sections,
    tierKey,
    tierMin: tier.min,
    tierTarget: tier.target,
    tierMax: tier.max,
  };
}

export function isHumanDeliveryGrade(pack, input = {}) {
  const g = assessDeliveryGrade(pack, input);
  return (
    g.grade === DELIVERY_GRADE.HUMAN || g.grade === DELIVERY_GRADE.PUBLISH
  );
}

export function stampDeliveryGradeMeta(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const assessed = assessDeliveryGrade(pack, input);
  const rescue =
    pack._meta?.deliveryRescue ||
    pack._meta?.missionProseFallback ||
    pack._meta?.draftFallback;
  let grade = assessed.grade;
  if (grade === DELIVERY_GRADE.HUMAN && rescue && !assessed.tierMet) {
    grade = DELIVERY_GRADE.DRAFT;
  }
  if (rescue && grade === DELIVERY_GRADE.PUBLISH) {
    grade = assessed.tierMet ? DELIVERY_GRADE.HUMAN : DELIVERY_GRADE.DRAFT;
  }

  return {
    ...pack,
    _meta: {
      ...pack._meta,
      deliveryGrade: grade,
      lengthTierMet: assessed.tierMet,
      blogCharCount: assessed.chars,
      lengthTierMin: assessed.tierMin,
      lengthTierTarget: assessed.tierTarget,
      humanTierMet: assessed.tierMet,
      deliveryRescue: rescue || undefined,
      passOutput:
        grade === DELIVERY_GRADE.PUBLISH
          ? pack._meta?.passOutput !== false
          : grade === DELIVERY_GRADE.HUMAN
            ? true
            : false,
      publishReady: grade === DELIVERY_GRADE.PUBLISH,
    },
  };
}

export function deliveryGradeLabelKo(grade) {
  if (grade === DELIVERY_GRADE.PUBLISH) return "올리기 준비";
  if (grade === DELIVERY_GRADE.HUMAN) return "편집본 준비";
  return "초안 · 다듬는 중";
}
