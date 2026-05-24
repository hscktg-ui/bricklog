/**
 * V4 화자 선택 → 기존 contentPersona 매핑
 */

export const V4_SPEAKER_OPTIONS = [
  { value: "auto", label: "자동추천" },
  { value: "plain_review", label: "담백한 후기형", persona: "visit_review", subtype: "review" },
  { value: "local_blogger", label: "동네 블로거형", persona: "local_guide", subtype: "local" },
  { value: "brand_intro", label: "브랜드 소개형", persona: "brand_story", subtype: "philosophy" },
  { value: "expert_info", label: "전문 정보형", persona: "info_intro", subtype: "guide" },
  { value: "essay", label: "감성 에세이형", persona: "brand_story", subtype: "product" },
  { value: "real_use", label: "실사용 후기형", persona: "visit_review", subtype: "experience" },
  { value: "magazine", label: "매거진형", persona: "info_intro", subtype: "explain" },
  { value: "interview", label: "인터뷰형", persona: "brand_story", subtype: "event" },
  { value: "column", label: "칼럼형", persona: "info_intro", subtype: "compare" },
];

export function applyV4SpeakerToInput(input = {}) {
  const key = input.v4Speaker || "auto";
  if (key === "auto") return input;
  const opt = V4_SPEAKER_OPTIONS.find((o) => o.value === key);
  if (!opt?.persona) return input;
  return {
    ...input,
    contentPersona: opt.persona,
    contentPersonaSubtype: opt.subtype || input.contentPersonaSubtype,
  };
}

export function getV4SpeakerPromptLine(input = {}) {
  const key = input.v4Speaker || "auto";
  const opt = V4_SPEAKER_OPTIONS.find((o) => o.value === key);
  if (!opt || key === "auto") {
    return "화자: 브랜드·주제에 맞게 1인칭·문체를 일관 유지. 본문 처음부터 끝까지 동일 화자.";
  }
  return `화자: ${opt.label}. 처음부터 끝까지 동일한 관점·말투 유지.`;
}
