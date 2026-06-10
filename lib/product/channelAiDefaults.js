/**
 * 채널별 AI 추천 기본값 — 브랜드·지역·주제만으로 나머지 필드 자동 채움
 */
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";

const INSTA_PURPOSE_MAP = {
  awareness: { instaCampaignGoal: "save", instaAudience: "new", instaHookAngle: "emotional" },
  reserve: { instaCampaignGoal: "visit", instaAudience: "local", instaHookAngle: "tip" },
  inquiry: { instaCampaignGoal: "engage", instaAudience: "local", instaHookAngle: "tip" },
  event: { instaCampaignGoal: "launch", instaAudience: "existing", instaHookAngle: "offer" },
  revisit: { instaCampaignGoal: "save", instaAudience: "existing", instaHookAngle: "behind" },
};

const INSTA_MOOD_MAP = {
  emotional: { instaTone: "emotional", instaEmojiLevel: "light" },
  informative: { instaTone: "informative", instaEmojiLevel: "none" },
  review: { instaTone: "minimal", instaEmojiLevel: "light" },
  humor: { instaTone: "emotional", instaEmojiLevel: "moderate" },
};

const PLACE_NOTICE_MAP = {
  today: { placePostType: "notice", placeGoal: "notice", placeCtaType: "visit" },
  event: { placePostType: "event", placeGoal: "promo", placeCtaType: "today" },
  newProduct: { placePostType: "newProduct", placeGoal: "promo", placeCtaType: "visit" },
  reserve: { placePostType: "general", placeGoal: "reserve", placeCtaType: "reserve" },
  ops: { placePostType: "hours", placeGoal: "notice", placeCtaType: "visit" },
};

function topicBlob(input = {}) {
  return `${input.topic || ""} ${input.placeHeadline || ""} ${input.mainKeyword || ""}`;
}

function inferInstaPurpose(input = {}) {
  const t = topicBlob(input);
  if (/예약|문의|상담|DM/i.test(t)) return "reserve";
  if (/이벤트|할인|프로모|오픈|신메뉴|론칭/i.test(t)) return "event";
  if (/단골|재방|다시|또\s*방문/i.test(t)) return "revisit";
  if (/질문|궁금|문의/i.test(t)) return "inquiry";
  return "awareness";
}

function inferInstaMood(input = {}) {
  const t = topicBlob(input);
  if (/후기|솔직|다녀|방문/i.test(t)) return "review";
  if (/유머|재미|웃/i.test(t)) return "humor";
  if (/정보|가이드|팁|방법|정리/i.test(t)) return "informative";
  return "emotional";
}

function inferPlaceNotice(input = {}) {
  const t = topicBlob(input);
  if (/휴무|연휴|영업\s*시간|운영|공지/i.test(t)) return "ops";
  if (/예약|주문|문의/i.test(t)) return "reserve";
  if (/신제품|신메뉴|입고|출시/i.test(t)) return "newProduct";
  if (/이벤트|행사|할인|프로모/i.test(t)) return "event";
  return "today";
}

function buildHashtagHint(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim().split(/\s+/)[0] || "";
  const topic = String(input.topic || input.placeHeadline || "")
    .split(/[,，]/)[0]
    ?.trim()
    .replace(/\s+/g, "");
  const tags = [region, brand, topic].filter((x) => x && x.length >= 2);
  return tags.slice(0, 4).map((t) => `#${t}`);
}

/**
 * @param {object} input
 * @param {'insta'|'place'} channel
 */
export function resolveChannelAiDefaults(input = {}, channel = "insta") {
  const industry = resolveBriclogIndustryKey(input);
  const topic = String(input.topic || input.placeHeadline || "").trim();

  if (channel === "insta") {
    const purpose = input.instaPurposeQuestion || inferInstaPurpose(input);
    const mood = input.instaMoodQuestion || inferInstaMood(input);
    const purposeFields = INSTA_PURPOSE_MAP[purpose] || INSTA_PURPOSE_MAP.awareness;
    const moodFields = INSTA_MOOD_MAP[mood] || INSTA_MOOD_MAP.emotional;
    const hashtags = buildHashtagHint(input);
    return {
      purpose,
      mood,
      fields: {
        instaPurposeQuestion: purpose,
        instaMoodQuestion: mood,
        instaCampaignGoal: purposeFields.instaCampaignGoal,
        instaAudience: purposeFields.instaAudience,
        instaHookAngle: purposeFields.instaHookAngle,
        instaTone: moodFields.instaTone,
        instaEmojiLevel: moodFields.instaEmojiLevel,
        instaFormat: /릴스|숏폼|reels/i.test(topic) ? "short" : "feed",
        instaBodyLength: /릴스|숏폼/i.test(topic) ? "short" : "medium",
        instaHashtagCount: 5,
        instaHashtagMode: "auto",
        instaCta:
          purpose === "reserve"
            ? "프로필 링크에서 예약 · DM 환영"
            : purpose === "inquiry"
              ? "궁금한 점은 댓글·DM으로 남겨 주세요"
              : "",
      },
      card: {
        topicHint: topic || `${industry === "flower" ? "시즌 꽃다발" : "오늘의 소재"} 추천`,
        audienceLabel:
          purpose === "revisit"
            ? "단골·재방문 고객"
            : purpose === "awareness"
              ? "처음 보는 사람"
              : "동네·근처 고객",
        ctaLabel:
          purpose === "reserve"
            ? "예약·DM 유도"
            : purpose === "event"
              ? "오늘·이번 주 방문"
              : "저장·공감",
        hashtagPreview: hashtags,
      },
    };
  }

  const notice = input.placeNoticeKind || inferPlaceNotice(input);
  const noticeFields = PLACE_NOTICE_MAP[notice] || PLACE_NOTICE_MAP.today;
  return {
    notice,
    fields: {
      placeNoticeKind: notice,
      placePostType: noticeFields.placePostType,
      placeGoal: noticeFields.placeGoal,
      placeCtaType: noticeFields.placeCtaType,
      placeTone: /휴무|공지|안내/.test(topic) ? "informative" : "emotional",
      kpiGoal: notice === "reserve" ? "reservation" : "visit",
    },
    card: {
      topicHint: topic || "오늘 매장 소식",
      audienceLabel: "플레이스를 보는 고객",
      ctaLabel:
        notice === "reserve"
          ? "예약·문의"
          : notice === "event"
            ? "행사 참여·방문"
            : "플레이스에서 확인",
      hashtagPreview: [],
    },
  };
}

/** 빈 필드만 AI 추천값으로 채움 */
export function applyChannelAiDefaults(input = {}, channel = "insta") {
  const { fields } = resolveChannelAiDefaults(input, channel);
  const next = { ...input };
  for (const [key, val] of Object.entries(fields)) {
    if (next[key] === undefined || next[key] === "" || next[key] === null) {
      next[key] = val;
    }
  }
  if (channel === "place" && !next.placeHeadline?.trim() && next.topic?.trim()) {
    next.placeHeadline = next.topic;
  }
  return next;
}

export const INSTA_PURPOSE_QUESTIONS = [
  { value: "awareness", label: "인지도" },
  { value: "reserve", label: "예약" },
  { value: "inquiry", label: "문의" },
  { value: "event", label: "이벤트" },
  { value: "revisit", label: "재방문" },
];

export const INSTA_MOOD_QUESTIONS = [
  { value: "emotional", label: "감성" },
  { value: "informative", label: "정보" },
  { value: "review", label: "후기" },
  { value: "humor", label: "유머" },
];

/** 블로그 작업실 — 생성 전 AI 기획 카드 */
export function resolveBlogAiRecommendCard(input = {}) {
  const topic = String(input.topic || "").trim();
  const industry = resolveBriclogIndustryKey(input);
  const topicHint =
    topic ||
    (industry === "flower"
      ? "시즌 꽃 추천·선물 가이드"
      : industry === "furniture"
        ? "제품 선택·비교 포인트"
        : "오늘의 브랜드 이야기");
  return {
    topicHint,
    audienceLabel: /예약|문의/.test(topic) ? "방문·예약 고객" : "검색하는 신규 고객",
    ctaLabel: "네이버 발행용 원고",
    hashtagPreview: buildHashtagHint(input).slice(0, 3),
  };
}

export const PLACE_NOTICE_KIND_OPTIONS = [
  { value: "today", label: "오늘 공지" },
  { value: "event", label: "행사" },
  { value: "newProduct", label: "신제품" },
  { value: "reserve", label: "예약안내" },
  { value: "ops", label: "운영안내" },
];
