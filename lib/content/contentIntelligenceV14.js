/**
 * BRICLOG MASTER ENGINE V14 — PLAN / WRITE / REVIEW 분리 + 실전 출고
 */
import {
  V13_TOPIC_DOMINANCE_MIN,
  MASTER_ENGINE_V13_BANNED_OUTPUT_PHRASES,
} from "@/lib/content/contentIntelligenceV13";

export { V13_TOPIC_DOMINANCE_MIN as V14_TOPIC_DOMINANCE_MIN };

/** 입력 → PLAN(내부) → WRITE → REVIEW → 출력 */
export const MASTER_ENGINE_V14_PIPELINE = [
  "input_capture",
  "plan_internal",
  "write_publishable",
  "review_audit",
  "length_control",
  "v14_pre_output",
  "final_output",
];

export const MASTER_ENGINE_V14_BANNED_OUTPUT_PHRASES = [
  ...MASTER_ENGINE_V13_BANNED_OUTPUT_PHRASES,
  "정리: 브랜드 자산으로 남기는 실행 제안",
  "기능 설명: 실제 운영에 필요한 제어 장치",
  "활용 방식: 팀 단위 적용과 검수 루틴",
  "문제 제기: 지금 콘텐츠 운영에서 막히는 지점",
  "원인 분석: 왜 기존 작성 방식이 반복 실패하는가",
  "브랜드 철학: 브랜드 기억과 방향성의 역할",
  "운영 흐름: 옵션값에서 실행 단계까지",
  "콘텐츠 축적: 반복 발행에서 일관성을 만드는 방법",
  "템퍼 콘텐츠는",
  "콘텐츠는 문장 장식보다",
  "발행 직전 체크리스트",
  "기존 AI 글은",
];

export const MASTER_ENGINE_V14_GLOBAL_RULES = `【BRICLOG MASTER ENGINE V14】
- 파이프라인: 입력 → PLAN(내부 전용, 절대 출력 금지) → WRITE(완성 본문) → REVIEW(검수) → 출력.
- 최우선: 브랜드·지역·업종·주제·목적·글분량이 시스템 프롬프트보다 우선한다.
- 본문 80% 이상은 사용자 입력 주제·브랜드·지역·업종 실무 정보(체험·행사·할인·방문·구매·FAQ 등).
- 금지 출력: PLAN 소제목, 구성안, 운영 가이드, 브릭로그 철학·메모리·검수 기준 설명.
- 길이 부족 시 같은 문장 반복 금지 → 제품 설명·비교·방문 체크·FAQ·행사·설치 정보로 확장.
- 브릭로그는 브릭로그를 설명하는 AI가 아니다. 사용자 브랜드·지역·주제를 가장 잘 설명한다.`;

export const MASTER_ENGINE_V14_CHANNEL_RULES = {
  blog: `블로그: 네이버에 바로 붙여넣을 완성 본문만. 구성안·PLAN·체크리스트·운영 문서 금지.`,
  place: `스마트플레이스: 행사·공지·혜택·방문 유도. 철학·SEO 장문·보조키워드 UI 없음.`,
  instagram: `인스타: hook·캡션·CTA·해시태그. 블로그식 장문·운영 설명 금지.`,
  image: `이미지: 생성 프롬프트만.`,
  review: `검수: 평가·문제점·개선점만. 새 글 생성 금지.`,
};

/** V14 최종 검수 8항 */
export const MASTER_ENGINE_V14_PRE_OUTPUT_CHECKLIST = [
  "write_not_plan",
  "brand_reflected",
  "region_reflected",
  "topic_dominance_80",
  "industry_density",
  "repetition_ok",
  "length_tier_ok",
  "no_meta_prompt_leak",
];
