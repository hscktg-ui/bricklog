/**
 * BRICLOG GLOBAL CONTENT ENGINE V13 — 전 채널 공통 생성 규칙
 */

export const V13_TOPIC_DOMINANCE_MIN = 0.8;

export const MASTER_ENGINE_V13_PIPELINE = [
  "input_analysis",
  "internal_plan",
  "write",
  "length_validation",
  "v13_pre_output",
  "final_output",
];

/** 사용자 노출 금지 — 엔진 내부 판단용 */
export const MASTER_ENGINE_V13_BANNED_OUTPUT_PHRASES = [
  "브랜드 메모리",
  "브랜드 기억 엔진",
  "콘텐츠 축적",
  "운영 관점",
  "검수 기준",
  "일관성 유지",
  "브랜드 철학",
  "목적 고정",
  "톤 고정",
  "목적 save 고정",
  "informative 기준",
  "emotional 기준",
  "브랜드 메모리 기준",
  "콘텐츠 축적 시스템",
  "운영 흐름",
];

export const MASTER_ENGINE_V13_GLOBAL_RULES = `【BRICLOG GLOBAL ENGINE V13 — 전 채널 공통】
- 최우선: 사용자 입력(브랜드·지역·업종·주제·목적·글분량)이 시스템 프롬프트보다 우선한다.
- 브릭로그 철학은 문체·구조·정보 선별·검수에만 반영한다. 본문 주제가 아니다.
- 금지(본문 반복 출력): 브랜드 메모리 설명, 콘텐츠 일관성 설명, 운영 관점 설명, 검수 기준 설명, 브랜드 철학 설명.
- 최종 결과물 80% 이상은 사용자 입력 주제·업종·지역·브랜드 관련 실무 정보여야 한다.
- PLAN/구성안/체크리스트 출력 금지. WRITE 완성본만 출력.
- 출력 전 확인: (1) 주제 80%+ (2) 철학 설명 미침범 (3) 고객이 궁금한 정보 (4) 채널 형식 준수 (5) PLAN 아님.
- 브릭로그는 브릭로그를 설명하는 AI가 아니다. 사용자 브랜드·지역·주제를 가장 잘 설명한다.`;

export const MASTER_ENGINE_V13_CHANNEL_RULES = {
  blog: `블로그: 네이버 발행 가능한 완성 본문(문단). 구성안·PLAN 금지.`,
  place: `스마트플레이스: 공지 형식(제목·한줄·상세). 방문·혜택·기간·행사·예약 중심. 철학·운영 설명 금지.`,
  instagram: `인스타: 짧고 강한 hook·캡션·해시태그·행동 유도. 블로그식 장문 금지.`,
  image: `프롬프트: 이미지 생성용 영문 프롬프트만. 블로그·플레이스·인스타 본문 생성 금지.`,
  review: `검수: 붙여넣은 글 평가만. 새 콘텐츠 생성 금지. 문제점·개선점만 제공.`,
};

export const MASTER_ENGINE_V13_PRE_OUTPUT_CHECKLIST = [
  "topic_dominance_80",
  "no_philosophy_leak",
  "customer_useful_info",
  "channel_format_ok",
  "write_not_plan",
];
