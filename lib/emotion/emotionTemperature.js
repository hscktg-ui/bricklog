/**
 * V4 감정 온도 — 제목·본문·마무리 일관
 */

export const EMOTION_TEMPERATURE_OPTIONS = [
  { value: "auto", label: "자동추천" },
  { value: "plain", label: "담백함" },
  { value: "warm", label: "따뜻함" },
  { value: "excited", label: "설렘" },
  { value: "calm", label: "차분함" },
  { value: "trust", label: "신뢰감" },
  { value: "pro", label: "전문성" },
  { value: "playful", label: "유쾌함" },
  { value: "premium", label: "고급스러움" },
  { value: "friendly", label: "친근함" },
];

const PROMPT_HINTS = {
  plain: "담백하고 과장 없는 문장. 감탄·수식어 최소.",
  warm: "따뜻한 일상 톤. 독자에게 말 걸듯 부드럽게.",
  excited: "설레는 리듬. 짧은 문장과 가벼운 기대감.",
  calm: "차분한 호흡. 급하지 않게 읽히는 문장.",
  trust: "신뢰감. 확인된 사실·경험 중심, 단정한 말투.",
  pro: "전문 정보형. 핵심만 명확히.",
  playful: "유쾌하고 가벼운 톤. 지나친 유행어는 피함.",
  premium: "고급스럽고 절제된 표현. 과한 감성 금지.",
  friendly: "친근하고 편한 말투. 독자에게 가깝게, 과한 유행어는 피함.",
};

export function resolveEmotionTemperature(input = {}) {
  const key = input.emotionTemperature || "auto";
  if (key !== "auto" && PROMPT_HINTS[key]) {
    return { key, label: EMOTION_TEMPERATURE_OPTIONS.find((o) => o.value === key)?.label, hint: PROMPT_HINTS[key] };
  }
  const tone = input.tone || "emotional";
  const map = {
    emotional: "warm",
    lifestyle: "friendly",
    informative: "trust",
    premium: "premium",
    trust: "trust",
  };
  const resolved = map[tone] || "warm";
  return {
    key: resolved,
    label: EMOTION_TEMPERATURE_OPTIONS.find((o) => o.value === resolved)?.label,
    hint: PROMPT_HINTS[resolved],
    source: "auto",
  };
}

export function getEmotionPromptLine(input = {}) {
  const e = resolveEmotionTemperature(input);
  return `감정 온도: ${e.label}. ${e.hint} 제목·본문·마무리에 동일하게 유지.`;
}
