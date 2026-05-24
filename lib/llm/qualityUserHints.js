/** 검수 실패 코드 → 사용자 안내 (기술 용어 없음) */

const HINTS = {
  length_under_min: "본문이 조금 짧습니다.",
  score_below_upload_ready: "문장 품질 점수가 기준에 살짝 못 미쳤습니다.",
  brand_missing: "매장·브랜드 이름이 더 들어가면 좋습니다.",
  scenes_insufficient: "구체적인 장면 묘사가 더 필요합니다.",
  title_not_reflected: "제목과 본문 내용이 맞지 않습니다.",
  quality_loop: "글 흐름을 다듬는 중입니다.",
  placeholder: "미완성 표현이 포함되어 있습니다.",
  duplicate_sentence: "같은 문장이 반복되었습니다.",
  ai_cliche: "AI 관용 표현을 줄여 주세요.",
  no_scene: "구체적인 장면(퇴근길, 매장 앞 등)이 더 필요합니다.",
  search_intent_low: "검색 의도(위치·이용 방법·차별점)를 더 담아 주세요.",
  placeholder_detected: "미완성·placeholder 표현을 실제 문장으로 바꿔 주세요.",
  ai_cliche_detected: "AI 관용 표현을 줄이고 구체 장면으로 써 주세요.",
  repetition_detected: "같은 문장 반복을 제거해 주세요.",
  topic_drift: "입력 주제·키워드와 맞게 다시 써 주세요.",
  input_mismatch: "입력하신 핵심 이야기·포함 내용과 맞게 다시 써 주세요.",
  search_intent_missing: "검색 의도(왜·어떻게·누구에게)에 답해 주세요.",
  brand_presence_missing: "브랜드·매장 특징이 더 드러나게 써 주세요.",
  persona_inconsistency: "선택한 화자 톤을 처음부터 끝까지 유지해 주세요.",
  tone_inconsistency: "말투(해요/습니다)를 구간마다 일관되게 유지해 주세요.",
  fake_location_inserted: "입력하지 않은 지역명은 넣지 마세요.",
  length_too_short: "본문 분량을 더 채워 주세요.",
  humanity_below_min: "인간적인 문장 톤을 더 살려 주세요.",
  brand_feature: "브랜드 특징이 본문에 더 녹아야 합니다.",
};

export function buildQualityUserHint(failures = []) {
  const list = [...new Set(failures)].filter(Boolean);
  if (!list.length) {
    return "검수 기준에 살짝 못 미쳤지만 초안을 보여드립니다. 확인 후 다시 생성하거나 직접 수정해 주세요.";
  }
  const tips = list
    .slice(0, 3)
    .map((id) => HINTS[id] || null)
    .filter(Boolean);
  const detail = tips.length ? tips.join(" ") : "";
  return `초안을 만들었습니다. ${detail} 필요하면 「다시 생성」을 눌러 주세요.`;
}
