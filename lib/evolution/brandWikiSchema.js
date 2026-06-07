/**
 * BRAND WIKI SCHEMA — 엔티티·섹션·축 SSOT
 * CONTENT DOCTRINE: 새 사실 전달 · 좋은 설명 · 주제 설명 불가 시 미발행
 */

export const BRAND_WIKI_SCHEMA_VERSION = "v2";

/** 위키 섹션 — 프롬프트·게이트·UI 공통 */
export const WIKI_SECTIONS = {
  profile: {
    id: "profile",
    label: "브랜드 프로필",
    description: "brandMemory에서 온 확정·반복 사용 정보",
  },
  topic: {
    id: "topic",
    label: "이번 글 주제",
    description: "현재 작성 요청의 브랜드·지역·주제·키워드",
  },
  facts: {
    id: "facts",
    label: "조사·검증 사실",
    description: "본문에 쓸 수 있는 검증·조사 팩트",
  },
  voice: {
    id: "voice",
    label: "톤·표현",
    description: "선호·지양 표현, 말투 제약",
  },
  gaps: {
    id: "gaps",
    label: "부족 정보",
    description: "주제 설명에 필요하지만 아직 없는 항목",
  },
};

/** 팩트 축 — topicMap·research axis와 정렬 */
export const WIKI_FACT_AXES = [
  "brand",
  "region",
  "topic",
  "product",
  "operation",
  "feature",
  "visit",
  "compare",
  "mixed",
];

/** brandMemory → wiki profile 필드 매핑 */
export const WIKI_PROFILE_FIELDS = [
  { id: "brand", axis: "brand", label: "브랜드", pick: (m) => m.brandName || m.name },
  { id: "region", axis: "region", label: "지역", pick: (m) => m.region },
  { id: "industry", axis: "brand", label: "업종", pick: (m) => m.industry || m.industryLabel },
  { id: "product", axis: "product", label: "제품·서비스", pick: (m) => m.productName || m.mainProduct },
  { id: "philosophy", axis: "brand", label: "브랜드 철학", pick: (m) => m.brandPhilosophy || m.brandStory },
  { id: "tone", axis: "brand", label: "톤·말투", pick: (m) => m.tone || m.brandTone },
  { id: "hours", axis: "operation", label: "운영·시간", pick: (m) => m.businessHours || m.hours },
  { id: "contact", axis: "operation", label: "문의·연락", pick: (m) => m.contact || m.phone },
  { id: "usp", axis: "feature", label: "차별점", pick: (m) => m.uniqueSellingPoint || m.differentiator },
  { id: "audience", axis: "brand", label: "고객", pick: (m) => m.targetAudience || m.audience },
  { id: "description", axis: "brand", label: "브랜드 소개", pick: (m) => m.brandDescription },
];

export const MIN_WIKI_ENTRIES = 3;
export const MIN_WIKI_VERIFIED_FACTS = 2;
export const MIN_TOPIC_EXPLAIN_ITEMS = 3;

/**
 * @typedef {object} BrandWikiEntry
 * @property {string} id
 * @property {string} section — profile | topic | facts | voice | gaps
 * @property {string} axis
 * @property {string} label
 * @property {string} value
 * @property {string} source
 * @property {boolean} [verified]
 * @property {boolean} [usableForBody]
 */

/**
 * @typedef {object} BrandWikiDocument
 * @property {string} version
 * @property {BrandWikiEntry[]} entries
 * @property {Record<string, BrandWikiEntry[]>} sections
 * @property {number} count
 * @property {number} entryCount
 * @property {number} verifiedFactCount
 * @property {boolean} ok
 * @property {boolean} topicExplainable
 * @property {string[]} explainGaps
 */
