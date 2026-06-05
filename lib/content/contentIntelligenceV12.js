/**
 * BRICLOG MASTER ENGINE V12 — Brand Memory Intelligence Platform
 * 브랜드 기억 최우선 · 공식자료 → 네이버 → Gemini 분석(선택)
 */

import {
  buildMasterSystemV6Brief,
  MASTER_SYSTEM_V6_TAGLINE,
} from "@/lib/product/briclogMasterSystemV6";

export const MASTER_ENGINE_V12_PIPELINE = [
  "brand_memory_load",
  "user_memory_load",
  "feedback_load",
  "brand_analysis",
  "region_analysis",
  "topic_analysis",
  "entity_inference",
  "official_sources",
  "naver_research",
  "gemini_deep_analysis",
  "fact_verification",
  "content_strategy",
  "write",
  "quality_review",
  "final_output",
];

export const MASTER_ENGINE_V12_DATA_PRIORITY = `【정보 수집 우선순위 V12】
1순위: 브랜드 작업실·브랜드 메모리·철학·승인 콘텐츠·대표 피드백
2순위: 공식 홈페이지·공식 블로그·SNS·보도자료·제품 카탈로그
3순위: 네이버(검색·블로그·뉴스·플레이스·커뮤니티) 스니펫 — 재료만, 복사·브랜드 관점 재해석
4순위: Gemini 심층 분석·AI 추론(단서 기반). 외부 검색·AI보다 브랜드 기억 우선.`;

export const MASTER_ENGINE_V12_RULES = `【BRICLOG MASTER ENGINE V12 · ${MASTER_SYSTEM_V6_TAGLINE}】
${buildMasterSystemV6Brief()}
- Steve Jobs Rule: API·진행·조사 부족·내부 로직·오류를 사용자에게 노출하지 않는다.
- 검색엔진은 정답, 브릭로그는 맥락. 검색은 재료, 기억은 자산, 브랜드는 반복.
- 제품·행사: 공식 홈·카탈로그·보도 우선. AI 추론보다 공식·메모리 우선.
- 입력은 단서(오피모3↔OPIMO-III 등). 검색/API 실패해도 중단 금지.
- 「조사 부족」「13/20」「검색 실패」「다시 시도」「API 오류」 노출 금지.
- UNKNOWN 사실처럼 쓰지 않음. 허구 체험·후기·효과·할인·행사 단정 금지.
- SEO는 결과이지 목적. 키워드 도배 금지. 사람·체류·가독성 우선.`;

export const MASTER_ENGINE_V12_BANNED_USER_PHRASES = [
  "조사 부족",
  "다시 눌러",
  "다시 입력",
  "다시 시도",
  "검색 실패",
  "API 오류",
  "API 실패",
  "데이터 부족",
  "13개",
  "20개",
  "수집 부족",
  "Gemini",
  "Google",
];

/** V11 호환 — Google CSE 기본 비활성 */
export function isGoogleSearchEnabledInV12() {
  return (
    (process.env.BRICLOG_GOOGLE_SEARCH || "").trim().toLowerCase() === "true"
  );
}

export function isGeminiConfigured() {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "")
    .trim();
  return key.length >= 20 && key.startsWith("AIza");
}
