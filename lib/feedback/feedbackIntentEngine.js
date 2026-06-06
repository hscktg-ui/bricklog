/**
 * 피드백 의도 → 재생성 프롬프트 · 전역 엔진 인사이트 SSOT
 * 사용자 원문을 본문에 넣지 않고 의도로 변환
 */

export const FEEDBACK_INTENT_LABELS = {
  reduce_ad_tone: "광고성 표현 축소",
  increase_information_density: "정보 밀도 강화",
  remove_exaggeration: "과장 표현 제거",
  add_information_units: "정보 단위 추가",
  add_examples: "구체 사례 보강",
  expand_explanations: "설명 보강",
  strengthen_local_intent: "지역 검색 의도 강화",
  add_regional_context: "지역 맥락 추가",
  strengthen_brand_voice: "브랜드 톤 강화",
  align_tone_manner: "톤앤매너 정렬",
  remove_repetition: "반복 문장 제거",
  restructure_sections: "구조 재설계",
  clarify_selection_criteria: "선택 기준 명확화",
  humanize_prose: "자연스러운 문장",
  remove_template_phrases: "템플릿 표현 제거",
};

const INTENT_ENGINE_MAP = {
  reduce_ad_tone: {
    insight_type: "ad_tone_guard",
    payload: { message: "피드백 의도 — 광고 톤 축소" },
  },
  increase_information_density: {
    insight_type: "information_density",
    payload: { message: "피드백 의도 — 정보 밀도 강화" },
  },
  remove_exaggeration: {
    insight_type: "ad_tone_guard",
    payload: { message: "피드백 의도 — 과장 제거" },
  },
  add_information_units: {
    insight_type: "information_density",
    payload: { message: "피드백 의도 — 정보 단위 추가" },
  },
  remove_repetition: {
    insight_type: "repetition_guard",
    payload: { message: "피드백 의도 — 반복 제거" },
  },
  restructure_sections: {
    insight_type: "structure_variety",
    payload: { message: "피드백 의도 — 구조 재설계" },
  },
  strengthen_brand_voice: {
    insight_type: "brand_voice",
    payload: { message: "피드백 의도 — 브랜드 톤 강화" },
  },
  humanize_prose: {
    insight_type: "ai_cliche_threshold",
    payload: { message: "피드백 의도 — AI 티 제거" },
  },
  remove_template_phrases: {
    insight_type: "ai_cliche_threshold",
    payload: { message: "피드백 의도 — 템플릿 제거" },
  },
  strengthen_local_intent: {
    insight_type: "region_density",
    payload: { message: "피드백 의도 — 지역성 강화" },
  },
};

export function normalizeFeedbackIntents(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(/[|,]/);
  return [...new Set(list.map((x) => String(x || "").trim()).filter(Boolean))];
}

export function formatFeedbackIntentBrief(intents = [], feedbackText = "") {
  const ids = normalizeFeedbackIntents(intents);
  const labels = ids
    .map((id) => FEEDBACK_INTENT_LABELS[id] || id)
    .filter(Boolean);
  if (!labels.length && feedbackText) {
    return `수정 방향: ${String(feedbackText).slice(0, 240)}`;
  }
  if (!labels.length) return "";
  return `수정 방향(의도): ${labels.join(" · ")}`;
}

export function mergeFeedbackHints(prev, intents = [], feedbackText = "") {
  const prior = normalizeFeedbackIntents(prev);
  const next = normalizeFeedbackIntents(intents);
  const merged = [...new Set([...prior, ...next])];
  if (feedbackText) merged.push(`round:${hashFeedbackSeed(feedbackText)}`);
  return merged;
}

export function hashFeedbackSeed(text = "") {
  let h = 0;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function insightsFromFeedbackIntents(intents = []) {
  const out = [];
  const seen = new Set();
  for (const id of normalizeFeedbackIntents(intents)) {
    const row = INTENT_ENGINE_MAP[id];
    if (!row || seen.has(row.insight_type)) continue;
    seen.add(row.insight_type);
    out.push(row);
  }
  return out;
}

export function buildFeedbackRegenDirective(intents = [], feedbackText = "") {
  const brief = formatFeedbackIntentBrief(intents, feedbackText);
  if (!brief) return "";
  return [
    brief,
    "사용자 피드백 원문을 본문에 넣지 말 것.",
    "정보 밀도·브랜드 일치·발행 가능 품질을 우선.",
    "같은 실수(반복·광고 톤·허구 체험)를 반복하지 말 것.",
  ].join("\n");
}
