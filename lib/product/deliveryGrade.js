/**
 * 배달 등급 SSOT — draft | human | publish
 * human = tier min + 사람 칼럼 계약(경험 말투·AI 흔적 없음)
 */
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  DEFAULT_BLOG_LENGTH_TIER,
  resolveBlogLengthTier,
} from "@/lib/constants";
import {
  assessHumanColumnContract,
  contractToDeliveryGrade,
} from "@/lib/product/humanColumnContract";
import {
  isMissionCatalogDeliveryPack,
  isMissionCatalogEvalPass,
} from "@/lib/product/missionCatalogDelivery";

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
  const contract = assessHumanColumnContract(pack, input);
  const meta = pack?._meta || {};

  return {
    grade: contractToDeliveryGrade(contract, meta),
    tierMet: contract.tierMet,
    humanVoiceMet: contract.humanVoiceMet,
    humanColumnOk: contract.ok,
    chars: contract.chars,
    sections: contract.sections,
    tierKey: resolveInputBlogLengthTier(input),
    tierMin: contract.tierMin,
    tierTarget: resolveBlogLengthTier(resolveInputBlogLengthTier(input)).target,
    tierMax: resolveBlogLengthTier(resolveInputBlogLengthTier(input)).max,
    humanColumnReasons: contract.reasons,
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
  const missionCatalog =
    pack._meta?.forcedMissionProseRoute &&
    isMissionCatalogDeliveryPack(pack, input) &&
    isMissionCatalogEvalPass(pack);
  if (grade === DELIVERY_GRADE.HUMAN && rescue && !assessed.tierMet && !missionCatalog) {
    grade = DELIVERY_GRADE.DRAFT;
  }
  if (
    missionCatalog &&
    assessed.tierMet &&
    assessed.humanVoiceMet &&
    grade === DELIVERY_GRADE.DRAFT
  ) {
    grade = DELIVERY_GRADE.HUMAN;
  }
  if (grade === DELIVERY_GRADE.HUMAN && !assessed.humanVoiceMet) {
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
      humanTierMet: assessed.tierMet && assessed.humanVoiceMet,
      humanVoiceMet: assessed.humanVoiceMet,
      humanColumnOk: assessed.humanColumnOk,
      humanColumnReasons: (assessed.humanColumnReasons || []).slice(0, 8),
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
