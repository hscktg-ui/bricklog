/** ENGINE PRIORITY OVERRIDE — 주제 증명 임계값 SSOT */

/** 필수 설명 항목 대비 확보 비율 — 미만이면 생성 금지·추가 조사 */
export const MIN_INFO_SECUREMENT_RATE = 0.5;

/** 주제 설명률 — 60% 미만 생성 금지 */
export const MIN_TOPIC_EXPLANATION_RATE = 0.6;

/** 생성 전 확보된 정보 단위 최소 */
export const MIN_PREWRITE_INFO_UNITS = 8;

/** 작성 후 본문 내 새로운 정보 단위 최소 (문장·글자수 아님) */
export const MIN_POSTWRITE_INFO_UNITS = 10;

/** 브랜드 치환 후 문장 유지율 — 초과 시 재작성 */
export const MAX_BRAND_SWAP_IDENTITY_OVERLAP = 0.82;

/** 본문에 브랜드가 반영된 문장 비율 최소 */
export const MIN_BRAND_SENTENCE_RATIO = 0.12;
