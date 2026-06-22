/** V4 생성 진행 단계 — 사용자에게 현재 단계 표시 */
import { MISSION_INFO_STRUCTURE_STEP } from "@/lib/product/missionUi";
import {
  getChannelLoadingSteps,
  getChannelCompleteMessage,
  CHANNEL_PIPELINE_LOADING_STEPS,
} from "@/lib/product/channelHumanVoice";

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
  { icon: "📊", text: MISSION_INFO_STRUCTURE_STEP },
  { icon: "✍️", text: "콘텐츠 작성 중…" },
  { icon: "✓", text: "팩트·품질 검수 중…" },
];

/** 고객 화면 — 작가 관점 4단계 (화자·시의·주제 반영 포함) */
export const CUSTOMER_BLOG_UI_STEPS = getChannelLoadingSteps("blog");

/** 채널팩 — 한 조사에서 파생 */
export const CUSTOMER_PIPELINE_UI_STEPS = CHANNEL_PIPELINE_LOADING_STEPS;

export const CUSTOMER_PLACE_UI_STEPS = getChannelLoadingSteps("place");

export const CUSTOMER_INSTAGRAM_UI_STEPS = getChannelLoadingSteps("instagram");

/** 블로그와 동일 — 플레이스·인스타·프롬프트·검수 */
export const CONTENT_V3_SIGNATURE_UI_STEPS = CONTENT_V3_BLOG_UI_STEPS;

const ULTIMATE_STEPS = CONTENT_V3_BLOG_UI_STEPS;

const ULTIMATE_SENSITIVE_STEPS = CONTENT_V2_BLOG_UI_STEPS;

const CHANNEL_STEP = {
  blog: CUSTOMER_BLOG_UI_STEPS,
  place: CUSTOMER_PLACE_UI_STEPS,
  instagram: CUSTOMER_INSTAGRAM_UI_STEPS,
  image: [
    { sketch: "image", text: "이미지 문구 맞추는 중…" },
    { sketch: "check", text: "검수 후 다듬는 중…" },
  ],
  pipeline: CUSTOMER_PIPELINE_UI_STEPS,
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
  blog: getChannelCompleteMessage("blog"),
  place: getChannelCompleteMessage("place"),
  instagram: getChannelCompleteMessage("instagram"),
  image: "이미지 문구가 준비됐어요",
  pipeline: getChannelCompleteMessage("pipeline"),
  feedback: "피드백이 반영된 글이 준비되었습니다",
  "place-feedback": "스마트플레이스 피드백이 반영되었습니다",
  "instagram-feedback": "인스타그램 피드백이 반영되었습니다",
  default: "편집본이 준비됐어요",
};

export function getGenerationSteps(channel = "blog", options = {}) {
  if (channel === "pipeline") {
    return getChannelLoadingSteps("pipeline");
  }
  const steps = getChannelLoadingSteps(channel);
  if (steps?.length) return steps;
  return getChannelLoadingSteps("blog");
}

export function getCompleteMessage(channel) {
  return GENERATION_COMPLETE_MESSAGES[channel] || GENERATION_COMPLETE_MESSAGES.default;
}

export { SENSITIVE_VERIFY_STEP };
