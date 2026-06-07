/**
 * 피드백 반영 — 사용자에게 보이는 한 줄 요약
 */
import {
  normalizeFeedbackIntents,
  FEEDBACK_INTENT_LABELS,
} from "@/lib/feedback/feedbackIntentEngine";

const CUSTOMER_APPLIED = {
  reduce_ad_tone: "광고 톤을 줄였어요",
  increase_information_density: "정보를 더 담았어요",
  remove_exaggeration: "과장 표현을 줄였어요",
  add_information_units: "구체 정보를 보강했어요",
  add_examples: "사례를 더 넣었어요",
  expand_explanations: "설명을 보강했어요",
  strengthen_local_intent: "지역 맥락을 강화했어요",
  add_regional_context: "지역 정보를 더 넣었어요",
  strengthen_brand_voice: "브랜드 톤을 맞췄어요",
  align_tone_manner: "말투를 정리했어요",
  remove_repetition: "반복 문장을 줄였어요",
  restructure_sections: "글 구성을 다시 잡았어요",
  clarify_selection_criteria: "선택 기준을 분명히 했어요",
  humanize_prose: "문장을 더 자연스럽게 다듬었어요",
  remove_template_phrases: "뻔한 표현을 줄였어요",
};

/**
 * @param {string[]} intents
 * @param {string} [feedbackText]
 * @returns {string}
 */
export function formatFeedbackAppliedCustomerLine(intents = [], feedbackText = "") {
  const ids = normalizeFeedbackIntents(intents);
  const lines = ids
    .map((id) => CUSTOMER_APPLIED[id] || FEEDBACK_INTENT_LABELS[id])
    .filter(Boolean)
    .slice(0, 2);

  if (lines.length) {
    return `피드백 반영: ${lines.join(" · ")}`;
  }

  const memo = String(feedbackText || "").trim();
  if (memo) {
    const short = memo.length > 48 ? `${memo.slice(0, 48)}…` : memo;
    return `피드백 반영: ${short}`;
  }

  return "";
}
