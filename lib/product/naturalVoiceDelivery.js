/**
 * Natural Voice Delivery — 정보량·tier 패딩보다 「15분 직접 작성」 체감 우선
 * GPT-5.5 LLM + belief·경험·AI 패턴 통과 시 tier.min(3600+) 대신 현실 분량 하한
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { shouldPreserveGpt55LlmPackBody } from "@/lib/product/gpt55LlmPackGuard";
import { isLlmOriginatedPack } from "@/lib/product/llmPackOrigin";
import { isMissionFallbackPack } from "@/lib/product/briclogWriterEngine";
import {
  scoreHumanBelief,
} from "@/lib/product/humanBeliefEngine";
import {
  scoreExperienceVoice,
} from "@/lib/content/experienceVoiceProfile";
import { detectAiWritingPatterns } from "@/lib/product/aiPatternDetector";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { resolveLocalBatchBlogMinChars } from "@/lib/content/missionProseGate";

export const NATURAL_VOICE_DELIVERY_VERSION = "natural-voice-v1";

/** belief 85 미만이어도 짧은 현장 글 허용 — persona 정렬은 별도 보정 */
export const NATURAL_VOICE_BELIEF_FLOOR = 73;

/** 직접 10~15분 작성 체감 분량 (공백 포함) — local batch와 동일 현실 하한 */
export function resolveNaturalVoiceDeliveryMinChars(tierKey, tier) {
  return resolveLocalBatchBlogMinChars(tierKey, tier);
}

function isNaturalVoiceEligiblePack(pack, input = {}) {
  if (
    pack?._meta?.missionProseFallback ||
    pack?._meta?.draftFallback ||
    pack?._meta?.deliveryRescue
  ) {
    return false;
  }
  if (isMissionFallbackPack(pack, input)) return false;
  if (shouldPreserveGpt55LlmPackBody(pack, input)) return true;
  return isLlmOriginatedPack(pack, input);
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function shouldPreferNaturalnessOverDensity(pack, input = {}) {
  if (!pack?.sections?.length) return false;
  if (!isNaturalVoiceEligiblePack(pack, input)) return false;

  const full = getBlogFullText(pack);
  const belief = scoreHumanBelief(full, input, pack);
  const experience = scoreExperienceVoice(full);
  const ai = detectAiWritingPatterns(pack, input);
  const checklist = scoreChecklistVoice(full, pack);

  return (
    ai.ok &&
    checklist.ok &&
    belief.adHits <= 1 &&
    !belief.issues?.includes("ad_smell_high") &&
    !belief.issues?.includes("brochure_voice") &&
    experience.score >= 48 &&
    (belief.score >= NATURAL_VOICE_BELIEF_FLOOR ||
      (belief.score >= 58 && experience.score >= 52))
  );
}
