/** @typedef {'good'|'neutral'|'bad'} FeedbackReaction */

export const FEEDBACK_REACTIONS = [
  { id: "good", label: "좋음" },
  { id: "neutral", label: "보통" },
  { id: "bad", label: "별로" },
];

export const FEEDBACK_TAGS = [
  { id: "too_ad", label: "광고 같음" },
  { id: "too_ai", label: "AI 같음" },
  { id: "gpt_tone", label: "말투가 어색함" },
  { id: "repeat", label: "반복 문장" },
  { id: "low_emotion", label: "감성 부족" },
  { id: "low_info", label: "정보 부족" },
  { id: "brand_weak", label: "브랜드 느낌 약함" },
  { id: "seo_weak", label: "현장감이 약함" },
  { id: "title_weak", label: "제목 아쉬움" },
  { id: "length_wrong", label: "길이 안 맞음" },
];

/** 스마트플레이스 전용 피드백 태그 */
export const PLACE_FEEDBACK_TAGS = [
  { id: "too_weak", label: "블로그 대비 약함" },
  { id: "too_bloggy", label: "블로그체 같음" },
  { id: "too_ad", label: "광고 같음" },
  { id: "low_info", label: "운영 정보 부족" },
  { id: "length_wrong", label: "길이 안 맞음" },
  { id: "brand_weak", label: "브랜드 약함" },
];

/** 인스타그램 전용 피드백 태그 */
export const INSTA_FEEDBACK_TAGS = [
  { id: "too_weak", label: "블로그 대비 약함" },
  { id: "low_emotion", label: "감성 부족" },
  { id: "too_bloggy", label: "블로그체 같음" },
  { id: "emoji_low", label: "이모지 부족" },
  { id: "repeat", label: "반복 문장" },
  { id: "gpt_tone", label: "말투가 어색함" },
];

export function feedbackTagsForChannel(channel = "blog") {
  if (channel === "place" || channel === "smartplace") return PLACE_FEEDBACK_TAGS;
  if (channel === "instagram" || channel === "insta") return INSTA_FEEDBACK_TAGS;
  return FEEDBACK_TAGS;
}

export const CONTENT_EVENT_TYPES = [
  "copy_all",
  "rewrite",
  "save",
  "delete",
  "download",
  "tab_channel",
  "copy_channel",
];
