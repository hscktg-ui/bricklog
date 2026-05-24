import { getAbstractBlogSample } from "./industryAbstractExamples";

/** Few-shot 참고 — 업종 추상 예시만, 실제 브랜드명 금지 */
export const BLOG_STYLE_HINTS = [
  "구조: 장면 → 경험 → 브랜드 연결 (정보 나열·SEO 반복 금지)",
  "도입: 생활 장면으로 시작, '오늘 소개'·참고1/2 금지",
  "키워드: '지역+키워드' 기계 반복 금지, 말하듯 삽입",
  "마무리: 저장·체크리스트·검색 유도 문구 금지",
];

export const BLOG_RHYTHM_SAMPLE = getAbstractBlogSample("flower");
