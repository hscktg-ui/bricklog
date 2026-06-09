/** BRICLOG Content Quality Review Engine — 출고 기준 */

export const CQREVIEW_THRESHOLD = 95;
export const CQREVIEW_MAX_REVISIONS = 1;

export const CQREVIEW_WEIGHTS = {
  brandConsistency: 0.25,
  readerPerspective: 0.2,
  informationValue: 0.2,
  readability: 0.15,
  reliability: 0.1,
  seoFit: 0.05,
  platformFit: 0.05,
};

export const CQREVIEW_DIMENSION_LABELS = {
  brandConsistency: "브랜드 일관성",
  readability: "가독성",
  readerPerspective: "독자 관점",
  informationValue: "정보 가치",
  reliability: "신뢰성",
  seoFit: "SEO 적합성",
  naverBlogFit: "네이버 블로그",
  instagramFit: "인스타그램",
  smartplaceFit: "스마트플레이스",
  aiTrace: "AI 흔적",
};

export const CQREVIEW_PERSPECTIVES = [
  "브랜드 전문가",
  "마케팅 실무자",
  "블로거",
  "일반 독자",
];
