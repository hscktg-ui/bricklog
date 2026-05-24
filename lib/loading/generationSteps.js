/** V4 생성 진행 단계 — 사용자에게 현재 단계 표시 */

export const V4_PIPELINE_STEPS = [
  { icon: "🌱", text: "브랜드 분석 중..." },
  { icon: "🔍", text: "검색 의도 분석 중..." },
  { icon: "🍃", text: "계절·콘텐츠 맥락 확인 중..." },
  { icon: "✍️", text: "블로그 작성 중..." },
  { icon: "📍", text: "스마트플레이스 작성 중..." },
  { icon: "✨", text: "인스타그램 작성 중..." },
  { icon: "🖼", text: "이미지 카피 작성 중..." },
  { icon: "✓", text: "최종 검수 중..." },
];

const SENSITIVE_VERIFY_STEP = {
  icon: "⚖️",
  text: "민감 업종 검증 중...",
};

/** V2 콘텐츠 품질 — 블로그 생성 UI 4단계만 표시 */
export const CONTENT_V2_BLOG_UI_STEPS = [
  { icon: "🏷", text: "브랜드 분석 중…" },
  { icon: "🔍", text: "제품 조사 중…" },
  { icon: "✍️", text: "콘텐츠 작성 중…" },
  { icon: "✓", text: "최종 검수 중…" },
];

/** V3 브랜드 기반 콘텐츠 엔진 — UI 5단계 */
export const CONTENT_V3_BLOG_UI_STEPS = [
  { icon: "🏷", text: "브랜드·지역·주제 분석 중…" },
  { icon: "🔍", text: "정보 검증·전략 수립 중…" },
  { icon: "📊", text: "SEO 전략 정리 중…" },
  { icon: "✍️", text: "콘텐츠 작성 중…" },
  { icon: "✓", text: "팩트·품질 검수 중…" },
];

const ULTIMATE_STEPS = CONTENT_V3_BLOG_UI_STEPS;

const ULTIMATE_SENSITIVE_STEPS = CONTENT_V2_BLOG_UI_STEPS;

const CHANNEL_STEP = {
  blog: { icon: "✍️", text: "블로그 작성 중..." },
  place: { icon: "📍", text: "스마트플레이스 작성 중..." },
  instagram: { icon: "✨", text: "인스타그램 작성 중..." },
  image: { icon: "🖼", text: "이미지 카피 작성 중..." },
  pipeline: V4_PIPELINE_STEPS,
};

/** 피드백 반영(재작성) 전용 — 일반 생성과 다른 문구 */
export const FEEDBACK_REWRITE_STEPS = [
  { icon: "💬", text: "피드백을 반영하고 있어요" },
  { icon: "✨", text: "톤앤매너를 조정하고 있어요" },
  { icon: "📍", text: "채널별 문구를 맞추고 있어요" },
  { icon: "✓", text: "반영본을 정리하고 있어요" },
];

export const FEEDBACK_COMPLETE_MESSAGE =
  "💬 피드백이 반영된 글이 준비되었습니다";

export const PLACE_FEEDBACK_REWRITE_STEPS = [
  { icon: "💬", text: "스마트플레이스 피드백 반영 중…" },
  { icon: "📖", text: "블로그 운영 포인트 추출 중…" },
  { icon: "📍", text: "공지형 문구로 다시 쓰는 중…" },
  { icon: "✓", text: "플레이스 반영본 정리 중…" },
];

export const INSTA_FEEDBACK_REWRITE_STEPS = [
  { icon: "💬", text: "인스타 피드백 반영 중…" },
  { icon: "📖", text: "블로그 장면·감정선 추출 중…" },
  { icon: "✨", text: "캡션·이모지 맞추는 중…" },
  { icon: "✓", text: "인스타 반영본 정리 중…" },
];

export const PLACE_FEEDBACK_COMPLETE_MESSAGE =
  "📍 스마트플레이스 피드백이 반영되었습니다";
export const INSTA_FEEDBACK_COMPLETE_MESSAGE =
  "✨ 인스타그램 피드백이 반영되었습니다";

export function getFeedbackRewriteSteps(channel = "feedback") {
  if (channel === "place-feedback") return PLACE_FEEDBACK_REWRITE_STEPS;
  if (channel === "instagram-feedback") return INSTA_FEEDBACK_REWRITE_STEPS;
  return FEEDBACK_REWRITE_STEPS;
}

export const GENERATION_COMPLETE_MESSAGES = {
  blog: "✍️ 오늘의 이야기가 완성되었습니다",
  place: "📍 스마트플레이스가 준비되었습니다",
  instagram: "✨ 인스타그램이 준비되었습니다",
  image: "🖼 이미지 카피가 준비되었습니다",
  pipeline: "🌱 채널별 초안이 준비되었습니다",
  feedback: FEEDBACK_COMPLETE_MESSAGE,
  "place-feedback": PLACE_FEEDBACK_COMPLETE_MESSAGE,
  "instagram-feedback": INSTA_FEEDBACK_COMPLETE_MESSAGE,
  default: "🌱 브랜드의 이야기가 준비되었습니다",
};

export function getGenerationSteps(channel = "blog", options = {}) {
  if (channel === "pipeline") {
    return options.sensitiveIndustry ? ULTIMATE_SENSITIVE_STEPS : V4_PIPELINE_STEPS;
  }
  if (channel === "blog") {
    return options.sensitiveIndustry ? ULTIMATE_SENSITIVE_STEPS : ULTIMATE_STEPS;
  }
  const ch = CHANNEL_STEP[channel] || CHANNEL_STEP.blog;
  if (Array.isArray(ch)) return ch;
  return [V4_PIPELINE_STEPS[0], V4_PIPELINE_STEPS[1], ch, V4_PIPELINE_STEPS[7]];
}

export function getCompleteMessage(channel) {
  return GENERATION_COMPLETE_MESSAGES[channel] || GENERATION_COMPLETE_MESSAGES.default;
}

export { SENSITIVE_VERIFY_STEP };
