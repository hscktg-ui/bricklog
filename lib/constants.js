export { BRAND_TYPE_OPTIONS } from "@/lib/brand/brandType";
export {
  INDUSTRY_AUTOCOMPLETE,
  INDUSTRY_QUICK_PICKS,
  INDUSTRY_MORE_PICKS,
} from "@/lib/brand/industryAutocomplete";

/** 공백 포함 본문 글자 수 (네이버 붙여넣기 기준) — tier별 */
export const BLOG_LENGTH_TIER_OPTIONS = [
  { value: "short", label: "짧은 글", hint: "약 1,800~2,200자" },
  { value: "medium", label: "중간 글", hint: "약 2,400~3,000자" },
  { value: "long", label: "긴 글", hint: "약 2,900~3,300자" },
];

export const BLOG_LENGTH_TARGETS = {
  short: { min: 1800, target: 2100, max: 2400 },
  medium: { min: 2400, target: 2800, max: 3000 },
  long: { min: 2800, target: 3200, max: 3300 },
};

export function resolveBlogLengthTier(tier = "medium") {
  return BLOG_LENGTH_TARGETS[tier] || BLOG_LENGTH_TARGETS.medium;
}

/** @deprecated prefer resolveBlogLengthTier — medium tier defaults */
export const BLOG_MIN_BODY_CHARS = BLOG_LENGTH_TARGETS.medium.min;
export const BLOG_TARGET_BODY_CHARS = BLOG_LENGTH_TARGETS.medium.target;
export const BLOG_MAX_BODY_CHARS = BLOG_LENGTH_TARGETS.medium.max;

export const PLACE_POST_TYPE_OPTIONS = [
  { value: "notice", label: "공지" },
  { value: "holiday", label: "연휴·휴무" },
  { value: "newProduct", label: "신제품" },
  { value: "event", label: "이벤트·프로모션" },
  { value: "hours", label: "운영·영업 안내" },
  { value: "general", label: "일반 안내" },
];

export const INSTA_FORMAT_OPTIONS = [
  { value: "feed", label: "일반" },
  { value: "short", label: "숏폼" },
];

export const INSTA_HASHTAG_COUNT_OPTIONS = [0, 1, 2, 3, 4, 5].map((n) => ({
  value: n,
  label: n === 0 ? "없음" : `${n}개`,
}));

export const INSTA_HASHTAG_MODE_OPTIONS = [
  { value: "auto", label: "자동 추천" },
  { value: "manual", label: "직접 입력" },
];

export const INSTA_BODY_LENGTH_OPTIONS = [
  { value: "short", label: "짧게" },
  { value: "medium", label: "보통" },
  { value: "long", label: "길게" },
];

/** 인스타 기본: balanced → medium 밀도(이모지 포함) */
export const INSTA_EMOJI_LEVEL_DEFAULT = "balanced";

export const INSTA_EMOJI_LEVEL_OPTIONS = [
  { value: "balanced", label: "적절히 (기본)", density: "medium" },
  { value: "heavy", label: "많이", density: "high" },
  { value: "minimal", label: "최소", density: "low" },
];
export {
  BRAND_TAGLINE,
  BRAND_PHILOSOPHY,
  BRICLOG_SLOGAN,
  BRICLOG_SLOGAN_SHORT,
  BRAND_META_TITLE,
  BRAND_META_DESCRIPTION,
} from "@/lib/brand/slogan";

export { CONTENT_KPI_OPTIONS, IMAGE_KPI_OPTIONS } from "@/lib/kpi/contentGoals";
export { EMOJI_DENSITY_OPTIONS } from "@/lib/emoji/emojiDensityEngine";

/** 샘플 체험용 입력 (첫 화면 CTA) */
export const SAMPLE_BLOG_INPUT = {
  brandType: "local_store",
  industry: "flower",
  purpose: "season",
  tone: "emotional",
  region: "서울 마포",
  brandName: "달빛꽃상자",
  mainKeyword: "마포 꽃집",
  subKeyword: "꽃다발, 기념일 꽃",
  includePhrases: "당일 픽업, 시즌 리본, 기념일 맞춤",
  excludePhrases: "최고, 1등, 무조건",
  brandDescription: "마포 동네 꽃집, 당일 픽업·시즌 꽃다발",
  storeFeatures: "",
  benefit: "",
};

import {
  buildSidebarMenuItems,
  CHANNEL_PRODUCTS,
} from "@/lib/channels/channelProducts";

export const PIPELINE_STEPS = ["blog", "place", "insta", "image"].map((id) => {
  const p = CHANNEL_PRODUCTS[id];
  return { id: p.id, label: p.menuLabel, desc: p.desc, icon: p.icon };
});

export const SIDEBAR_MENU = buildSidebarMenuItems();

export const BLOG_PURPOSE_OPTIONS = [
  { value: "season", label: "시즌·감성" },
  { value: "visitDrive", label: "방문 유도" },
  { value: "info", label: "정보 안내" },
  { value: "review", label: "방문 후기" },
  { value: "brand", label: "브랜드 소개" },
  { value: "newOpen", label: "신규 오픈" },
];

export const BLOG_TONE_OPTIONS = [
  { value: "emotional", label: "감성형" },
  { value: "lifestyle", label: "생활형" },
  { value: "informative", label: "정보형" },
  { value: "premium", label: "프리미엄" },
  { value: "trust", label: "신뢰형" },
];

export const INSTA_TONE_OPTIONS = [
  { value: "emotional", label: "감성형" },
  { value: "informative", label: "정보형" },
  { value: "premium", label: "프리미엄형" },
  { value: "minimal", label: "미니멀형" },
];

/** @deprecated UI — IMAGE_KPI_OPTIONS 사용 */
export const IMAGE_PURPOSE_OPTIONS = [
  { value: "thumbnail", label: "블로그 썸네일" },
  { value: "place", label: "플레이스 이미지" },
  { value: "insta", label: "인스타 카드" },
  { value: "banner", label: "이벤트 배너" },
];

export const IMAGE_RATIO_OPTIONS = [
  { value: "auto", label: "자동" },
  { value: "16:9", label: "16:9" },
  { value: "4:5", label: "4:5" },
  { value: "1:1", label: "1:1" },
  { value: "9:16", label: "9:16" },
];

export const IMAGE_PROVIDER_OPTIONS = [
  { value: "auto", label: "자동 (OpenAI → Nano Banana)" },
  { value: "openai", label: "OpenAI (DALL·E)" },
  { value: "nanobanana", label: "Nano Banana" },
];

export const IMAGE_TONE_OPTIONS = [
  { value: "white", label: "화이트톤" },
  { value: "premium", label: "프리미엄" },
  { value: "emotional", label: "감성형" },
  { value: "info", label: "정보형" },
];

/** 파생 채널(플레이스·인스타) — V4 자동 확장 시 즉시 */
/** UI 한 프레임 확보 후 파이프라인 실행 (0이면 클릭 직후 멈춤처럼 느껴짐) */
export const GENERATION_DELAY_MS = 48;
/** 블로그 API 대기 중 최소 오버레이 (체감 속도) */
export const GENERATION_MIN_OVERLAY_MS = 1400;

export const CONTENT_OBJECTIVE_OPTIONS = [
  { value: "branding", label: "브랜딩", kpiGoal: "branding" },
  { value: "save", label: "저장유도", kpiGoal: "save" },
  { value: "newCustomer", label: "신규고객", kpiGoal: "search" },
  { value: "visit", label: "방문유도", kpiGoal: "reservation" },
  { value: "reservation", label: "예약유도", kpiGoal: "reservation" },
  { value: "event", label: "이벤트", kpiGoal: "event" },
  { value: "review", label: "후기", kpiGoal: "search" },
  { value: "localSeo", label: "지역노출", kpiGoal: "search" },
];

export const DEFAULT_BLOG_INPUT = {
  brandType: "other",
  industry: "",
  purpose: "season",
  tone: "emotional",
  kpiGoal: "save",
  contentObjective: "save",
  region: "",
  brandName: "",
  mainKeyword: "",
  subKeyword: "",
  includePhrases: "",
  excludePhrases: "",
  brandDescription: "",
  storeFeatures: "",
  benefit: "",
  emojiDensity: "low",
  address: "",
  phone: "",
  hours: "",
  parking: "",
  includeAddress: false,
  includePhone: false,
  includeHours: false,
  includeParking: false,
  locationBlock: false,
  competitors: "",
  topic: "",
  contentDate: "",
  contentPersona: "auto",
  contentPersonaSubtype: "",
  v4Speaker: "auto",
  emotionTemperature: "auto",
  speechStyle: "friendly_blog",
  proficiency: "editor_pro",
  blogLengthTier: "medium",
  placePostType: "general",
  placeGoal: "visit",
  placeHeadline: "",
  placeDetailHint: "",
  placeKeyFacts: "",
  placePeriod: "",
  placeOffer: "",
  placeCtaType: "visit",
  placeCtaNote: "",
  placeTone: "informative",
  instaFormat: "feed",
  instaCampaignGoal: "save",
  instaHookAngle: "emotional",
  instaScene: "",
  instaCta: "",
  instaAudience: "local",
  instaExcludePhrases: "",
  instaHashtagCount: 5,
  instaHashtagMode: "auto",
  instaManualHashtags: "",
  instaBodyLength: "medium",
  instaEmojiLevel: INSTA_EMOJI_LEVEL_DEFAULT,
  researchEnabled: false,
  researchTypes: [],
  researchQuery: "",
};
