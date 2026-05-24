/**
 * 블로그 채널 — 읽는 콘텐츠 (체류·정보·자연스러운 흐름)
 */
export const BLOG_CHANNEL = {
  id: "blog",
  goal: "체류시간 · 정보 밀도 · 지역 SEO",
  bodyMin: 2000,
  bodyMax: 2800,
  sectionCount: { min: 5, max: 7 },
  sectionChars: { min: 250, max: 400 },
  mainKeywordUses: { min: 5, max: 7 },
  subKeywordUses: { min: 1, max: 2 },
  hashtagCount: { min: 15, max: 25 },
  emojiMax: 0,
  sentenceStyle: "long-form",
  paragraphBreak: "mobile-3-sentences",
  ctaStyle: "soft-comment",
  emotionLevel: "balanced",
  bannedOpeners: [
    "오늘은",
    "소개해드릴게요",
    "안녕하세요 여러분",
    "검색창에 입력",
    "체크리스트로 삼으면",
    "해당 브랜드는",
  ],
  bannedPatterns: ["을(를)", "undefined", "null"],
};

export function getBlogChannelBrief(ctx) {
  return [
    `[blog] ${BLOG_CHANNEL.goal}`,
    `문단 호흡·감정선·모바일 줄바꿈`,
    `과장·GPT 정리문·키워드 억지 삽입 금지`,
    `실제 블로거가 쓴 듯한 자연스러운 한국어`,
  ].join(" · ");
}
