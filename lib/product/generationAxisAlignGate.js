/**
 * 브랜드·업종·주제 축 정렬 — 엉킨 입력 시 GPT 메타 우회·조사 오염 방지
 */
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";

export const GENERATION_AXIS_ALIGN_VERSION = "generation-axis-align-v1";

const FOOD_TOPIC_RE =
  /돈까스|돈가스|국수|맛집|메뉴|음식|식사|브런치|라면|떡볶이|피자|버거|배달|식당|카페\s*메뉴|디저트|베이커리/;
const FURNITURE_TOPIC_RE =
  /침대|매트리스|가구|쇼룸|침실|소파|리클라이너|프레임|헤드보드|수납침대/;
const HOSPITALITY_TOPIC_RE = /수영장|호텔|펜션|숙박|리조트|캠핑/;
const FLOWER_TOPIC_RE = /꽃|플라워|부케|화환|스튜디오/;

const FURNITURE_INDUSTRY_KEYS = new Set([
  "furniture",
  "bed",
  "mattress",
  "default_furniture",
]);
const FOOD_INDUSTRY_KEYS = new Set([
  "restaurant",
  "cafe",
  "bakery",
  "food",
  "default_restaurant",
]);

const FURNITURE_TOPIC_SUGGESTIONS = [
  "쇼룸 전시 오픈",
  "매트리스 체험 후기",
  "인테리어 상담 후기",
  "침실 공간 스타일링",
];
const FOOD_TOPIC_SUGGESTIONS = [
  "대표 시그니처 메뉴",
  "봄 시즌 브런치",
  "직접 다녀온 후기",
  "신메뉴 출시 안내",
];
const GENERIC_TOPIC_SUGGESTIONS = [
  "시즌 프로모션 안내",
  "주말 예약 팁",
  "직접 다녀온 후기",
  "체험 프로그램 안내",
];

function topicBlob(input = {}) {
  return [
    input.topic,
    input.title,
    input.representativeTitle,
    input.mainKeyword,
    input.includePhrases,
  ]
    .filter(Boolean)
    .join(" ");
}

function brandBlob(input = {}) {
  return [input.brandName, input.brandDescription, input.storeFeatures]
    .filter(Boolean)
    .join(" ");
}

/** 브랜드·업종에 맞는 주제 3개 — 축 불일치 UI 가이드 */
export function suggestAlignedTopics(input = {}) {
  const industryKey = resolveBriclogIndustryKey(input);
  const brand = brandBlob(input);
  if (FURNITURE_INDUSTRY_KEYS.has(industryKey) || FURNITURE_TOPIC_RE.test(brand)) {
    return FURNITURE_TOPIC_SUGGESTIONS.slice(0, 3);
  }
  if (FOOD_INDUSTRY_KEYS.has(industryKey) || FOOD_TOPIC_RE.test(brand)) {
    return FOOD_TOPIC_SUGGESTIONS.slice(0, 3);
  }
  return GENERIC_TOPIC_SUGGESTIONS.slice(0, 3);
}

/**
 * @param {object} input
 * @returns {{ ok: boolean, reason?: string, hints?: string[], topicSuggestions?: string[] }}
 */
export function assessGenerationAxisAlignment(input = {}) {
  const topic = topicBlob(input);
  const brand = brandBlob(input);
  const industryKey = resolveBriclogIndustryKey(input);
  const hints = [];

  const topicFood = FOOD_TOPIC_RE.test(topic);
  const topicFurniture = FURNITURE_TOPIC_RE.test(topic);
  const brandFurniture = FURNITURE_TOPIC_RE.test(brand) || FURNITURE_INDUSTRY_KEYS.has(industryKey);
  const brandFood = FOOD_TOPIC_RE.test(brand) || FOOD_INDUSTRY_KEYS.has(industryKey);

  if (topicFood && brandFurniture && !topicFurniture && !FOOD_TOPIC_RE.test(brand)) {
    return {
      ok: false,
      reason: "topic_food_brand_furniture_mismatch",
      hints: [
        "주제는 음식·메뉴인데 브랜드·업종은 가구·침실입니다.",
        "브랜드에 맞는 주제로 바꾸거나, 음식점 브랜드를 선택해 주세요.",
      ],
      topicSuggestions: suggestAlignedTopics(input),
    };
  }

  if (topicFurniture && brandFood && !topicFood && !FURNITURE_TOPIC_RE.test(brand)) {
    return {
      ok: false,
      reason: "topic_furniture_brand_food_mismatch",
      hints: [
        "주제는 가구·침실인데 브랜드·업종은 음식·카페입니다.",
        "브랜드에 맞는 주제로 수정해 주세요.",
      ],
      topicSuggestions: suggestAlignedTopics(input),
    };
  }

  if (/국수나무|돈까스|돈가스/.test(topic) && /목마|침대|매트리스|가구/.test(brand)) {
    return {
      ok: false,
      reason: "cross_brand_topic_leak",
      hints: [
        "다른 매장·메뉴 이름이 주제에 섞여 있습니다.",
        "이 브랜드에 맞는 주제만 입력해 주세요.",
      ],
      topicSuggestions: suggestAlignedTopics(input),
    };
  }

  if (HOSPITALITY_TOPIC_RE.test(topic) && FLOWER_TOPIC_RE.test(brand) && industryKey === "flower") {
    hints.push("주제와 브랜드 업종이 다릅니다. 방문·체험 주제를 브랜드에 맞게 조정합니다.");
  }

  return { ok: true, hints, version: GENERATION_AXIS_ALIGN_VERSION };
}

export function applyGenerationAxisAlignHints(input = {}) {
  const align = assessGenerationAxisAlignment(input);
  if (align.ok) return input;
  return {
    ...input,
    axisAlignBlocked: true,
    axisAlignReason: align.reason,
    axisAlignHints: align.hints,
    forceColumnistSovereignFresh: true,
  };
}
