/**
 * Human tier(기본 2,000자) · 사람 칼럼 계약 — LLM 재작성 힌트
 */
import {
  DEFAULT_BLOG_LENGTH_TIER,
  resolveBlogLengthTier,
} from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract";
import { shouldSkipWriterEngineForGpt55 } from "@/lib/product/gpt55LightDelivery";
import { computeContentQualityValue } from "@/lib/product/contentQualityValue";
import {
  B_GRADE_MIN_SCORE,
  isBriclogBGradeFloorEnabled,
} from "@/lib/product/bGradeDeliveryEngine";
import {
  A_GRADE_MIN_SCORE,
  isBriclogAGradeFloorEnabled,
  needsAGradePass as needsAGradePassEngine,
} from "@/lib/product/aGradeDeliveryEngine";
import { needsHumanLikePass } from "@/lib/product/humanLikeDeliveryEngine";

export function isHumanTierMet(pack, input = {}) {
  if (!pack?.sections?.length) return false;
  if ((pack.sections?.length || 0) < HUMAN_MIN_SECTIONS) return false;
  const tier = resolveBlogLengthTier(
    input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER
  );
  return countBlogBodyCharsWithSpaces(pack) >= tier.min;
}

export function buildHumanTierRegenNote(pack, input = {}) {
  const tierKey = input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const tier = resolveBlogLengthTier(tierKey);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const sections = pack?.sections?.length || 0;
  return `【분량 재작성】현재 ${chars}자·${sections}섹션. 목표 최소 ${tier.min}자(공백 포함)·${HUMAN_MIN_SECTIONS}섹션 이상·섹션당 2~4문단. 조사 fact 3건 이상 본문에 녹이기. outline·bullet·placeholder·「확인하세요」 나열 금지.`;
}

export function isHumanColumnContractMet(pack, input = {}) {
  return assessHumanColumnContract(pack, input).ok;
}

export function needsAGradePass(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogAGradeFloorEnabled()) return false;
  const sqv = computeContentQualityValue(pack, input);
  return (sqv.score ?? 0) < A_GRADE_MIN_SCORE;
}

export function needsBGradePass(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogBGradeFloorEnabled()) return false;
  if (needsAGradePassEngine(pack, input)) return true;
  const sqv = computeContentQualityValue(pack, input);
  return (sqv.score ?? 0) < B_GRADE_MIN_SCORE;
}

/** Writer Engine EXPAND/VOICE pass 필요 여부 */
export function needsWriterEnginePass(pack, input = {}) {
  if (!pack?.sections?.length) return false;
  if (needsHumanLikePass(pack, input)) return true;
  if (needsAGradePass(pack, input)) return true;
  if (needsBGradePass(pack, input)) return true;
  if (shouldSkipWriterEngineForGpt55(pack, input)) return false;
  return !isHumanColumnContractMet(pack, input);
}

export function buildHumanColumnRegenNote(pack, input = {}) {
  const contract = assessHumanColumnContract(pack, input);
  const reasons = (contract.reasons || []).slice(0, 6).join(", ");
  const lengthNote = buildHumanTierRegenNote(pack, input);
  if (!reasons) return lengthNote;
  return `【칼럼 계약 재작성】미달: ${reasons}. ${lengthNote}`;
}
