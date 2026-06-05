/**
 * BRICLOG MASTER SYSTEM v6.0 + EXTENSION PACK v6.2 — 제품 철학·파이프라인 SSOT
 * 기록이 쌓이면 브랜드가 된다.
 */

export const MASTER_SYSTEM_V6_VERSION = "v6.2";

export const MASTER_SYSTEM_V6_TAGLINE = "기록이 쌓이면 브랜드가 된다.";

export const MASTER_SYSTEM_V6_PURPOSE = `브릭로그는 AI 글쓰기 서비스가 아니다.
브랜드의 기록을 기억하고, 콘텐츠로 남기며, 브랜드 자산으로 축적하고,
성과를 학습하며, 브랜드를 진화시키는 시스템이다.`;

export const MASTER_SYSTEM_V6_PRIORITIES = [
  "SEO보다 브랜드 일치성",
  "길이보다 정확성",
  "생성보다 검증",
  "광고보다 기록",
  "조회수보다 브랜드 자산",
];

export const MASTER_SYSTEM_V6_PHILOSOPHY = `브랜드는 광고로 만들어지지 않는다. 브랜드는 기록으로 만들어진다.
좋은 콘텐츠 한 편보다 지속적으로 축적되는 기록이 더 중요하다.`;

export const TRUST_CLASSIFICATION = {
  FACT: "공식·확인 가능한 정보만 단정",
  INFERENCE: "논리적 추론 — 「~일 수 있다」 수준, 근거 명시",
  UNKNOWN: "확인 불가 — 사실처럼 작성 금지, 허위·허구 생성 금지",
};

export const PURPOSE_TYPES = [
  "방문 유도",
  "예약 유도",
  "전화 문의",
  "상담 유도",
  "브랜드 인지도",
  "제품 소개",
  "신제품 출시",
  "행사 홍보",
  "신뢰 확보",
  "정보 제공",
  "검색 유입",
  "매출 전환",
];

export const CONTENT_STRUCTURE_TYPES = [
  "신제품 소개형",
  "정보형",
  "칼럼형",
  "인터뷰형",
  "방문형",
  "비교형",
  "뉴스형",
  "사례형",
  "스토리형",
  "브랜드 철학형",
  "행사 안내형",
  "Q&A형",
  "문제해결형",
];

export const MASTER_V6_PIPELINE = [
  { step: "0", id: "trust_classify", label: "정보 신뢰도 분류", rule: "FACT·INFERENCE·UNKNOWN. UNKNOWN을 사실처럼 쓰지 않음." },
  { step: "1", id: "brand_understand", label: "브랜드 이해", rule: "브랜드명·지역·주제·피드백·작업실·위키·메모리·과거글·업종·이력. 브랜드를 먼저, 글은 그 다음." },
  { step: "1-1", id: "purpose_infer", label: "발행 목적 분석", rule: "목적 미입력 시 추론. 같은 주제도 목적에 따라 다른 글." },
  { step: "2", id: "research_expand", label: "검색·조사", rule: "입력 그대로 검색 금지. 유사어·영문명·공식자료 확장. 조사 부족으로 중단 금지." },
  { step: "2-1", id: "competitor_gap", label: "경쟁 콘텐츠 분석", rule: "상위 글 복사 금지. 공통 키워드 반복 금지. 빠진 관점·사례·인사이트 우선." },
  { step: "3", id: "entity_verify", label: "엔티티 검증", rule: "브랜드·제품·행사·지역·인물 전부 검증. 허위 후기·가상 체험·할인 금지." },
  { step: "4", id: "brand_memory", label: "브랜드 메모리", rule: "작업실·위키·기존 콘텐츠·피드백·이력. 검색보다 메모리 우선." },
  { step: "4-1", id: "brand_dna", label: "브랜드 DNA", rule: "전문성·신뢰·감성·친근·고급·실용 등 DNA 점수 반영. 같은 브랜드가 쓴 것처럼." },
  { step: "5", id: "feedback_intent", label: "피드백 의도", rule: "피드백 문자 복사 금지. 의도→수정 지시서→반영." },
  { step: "6", id: "structure_pick", label: "구조 선택", rule: "기승전결 고정 금지. 최근 글과 구조 유사 70%↑면 다른 구조." },
  { step: "7", id: "write", label: "콘텐츠 생성", rule: "실제 사람이 쓴 것처럼. AI 관용 도입·가짜 일상 장면 금지." },
  { step: "8", id: "brand_match", label: "브랜드 일치", rule: "무관 제품·뉴스·업체·사례 제거." },
  { step: "9", id: "industry_fit", label: "업종 적합", rule: "업종과 무관 문장 제거." },
  { step: "10", id: "dedupe", label: "중복 제거", rule: "최근 30개와 문장·구조 유사도 검사, 과다 시 재작성." },
  { step: "11", id: "seo_natural", label: "SEO", rule: "브랜드·지역·주제 3~10회 자연 포함. 가독성 우선." },
  { step: "12", id: "human_review", label: "사람 검수", rule: "브랜드 담당자·AI 냄새·경쟁력 자문. 문제 시 자동 수정." },
  { step: "13", id: "quality_score", label: "품질 점수", rule: "85 미만 발행 금지·재생성. 95 이상 발행." },
  { step: "14", id: "assetize", label: "브랜드 자산화", rule: "새 정보·표현·사례 추출→메모리 저장." },
  { step: "14-1", id: "brand_learn", label: "브랜드 학습", rule: "핵심 단어·문체·철학·고객 표현→DNA 갱신." },
  { step: "15", id: "performance_learn", label: "성과 학습", rule: "조회·체류·문의·전환→다음 글 반영." },
  { step: "16", id: "word_policy", label: "금지·선호어", rule: "브랜드별 금지어·선호어·철학 표현 우선 적용." },
];

export const EXTENSION_V62_PIPELINE = [
  { step: "17", id: "user_feedback_engine", label: "USER FEEDBACK ENGINE", rule: "피드백·재생성·복사·발행 행동 분석. 단어 저장 금지, 의도·프로필 학습." },
  { step: "17-1", id: "behavior_interpret", label: "BEHAVIOR INTERPRETATION", rule: "말보다 행동 신뢰. 좋아요·복사·발행·체류·재생성 가중치." },
  { step: "18", id: "global_learning", label: "GLOBAL LEARNING", rule: "익명 패턴만. 개인·브랜드 원문 미학습." },
  { step: "18-1", id: "community_signal", label: "COMMUNITY SIGNAL", rule: "다수 삭제·수정·선호 문장→전역 규칙." },
  { step: "19", id: "self_evolution", label: "SELF EVOLUTION", rule: "주간 지표 분석→개선안→관리자 승인 후 반영." },
  { step: "19-1", id: "human_override", label: "HUMAN OVERRIDE", rule: "다수결보다 브랜드 품질·전환·체류 성과 우선." },
];

export const MASTER_V6_AI_BANNED_OPENINGS = [
  "이 글은 ~에 답하려고 썼어요",
  "기념일을 깜빡했다",
  "주말 아침 테이블",
  "갑자기 잡힌 약속",
  "퇴근길에 문득",
];

export const MASTER_V6_HUMAN_REVIEW_QUESTIONS = [
  "실제 사람이 쓴 글 같은가?",
  "브랜드 담당자가 읽어도 자연스러운가?",
  "브랜드 특성이 살아있는가?",
  "무관한 엔티티가 들어갔는가?",
  "검색 결과를 잘못 인용했는가?",
  "반복 문장이 있는가?",
  "AI 냄새가 나는가?",
  "읽을 가치가 있는가?",
  "경쟁 콘텐츠보다 나은가?",
];

export const MASTER_V6_QUALITY_AXES = [
  "브랜드 일치성",
  "엔티티 정확성",
  "정보 신뢰도",
  "SEO 최적화",
  "문장 자연성",
  "중복도",
  "브랜드 메모리 활용도",
  "피드백 반영도",
  "구조 다양성",
  "브랜드 DNA 반영도",
  "경쟁력",
];

import {
  CONSTITUTION_V2_TARGET_SCORE,
  CONSTITUTION_V2_REGEN_BELOW_SCORE,
} from "@/lib/constitution/constitutionThresholds";

export const MASTER_V6_SCORE_PUBLISH_MIN = CONSTITUTION_V2_TARGET_SCORE;
export const MASTER_V6_SCORE_REGEN_BELOW = CONSTITUTION_V2_REGEN_BELOW_SCORE;

export const MASTER_SYSTEM_V6_FINAL = `검색 엔진은 정답을 찾는다. AI 글쓰기 서비스는 글을 만든다.
브릭로그는 브랜드를 기억하고, 학습하고, 진화시킨다.
글을 학습하지 않는다. 브랜드를 학습한다.
사용자의 말이 아니라 행동을 학습한다.
다수결이 아니라 가장 좋은 결과를 만드는 방향으로 진화한다.`;

/** 프롬프트·검수용 압축 브리프 */
export function buildMasterSystemV6Brief() {
  return [
    `【BRICLOG MASTER SYSTEM ${MASTER_SYSTEM_V6_VERSION}】${MASTER_SYSTEM_V6_TAGLINE}`,
    MASTER_SYSTEM_V6_PURPOSE,
    `우선순위: ${MASTER_SYSTEM_V6_PRIORITIES.join(" · ")}`,
    MASTER_SYSTEM_V6_PHILOSOPHY,
    `신뢰 분류: FACT=${TRUST_CLASSIFICATION.FACT} | INFERENCE=${TRUST_CLASSIFICATION.INFERENCE} | UNKNOWN=${TRUST_CLASSIFICATION.UNKNOWN}`,
    `파이프라인: ${MASTER_V6_PIPELINE.map((s) => s.label).join(" → ")}`,
    `구조 유형(택1): ${CONTENT_STRUCTURE_TYPES.join(" · ")} — 기승전결 고정 금지, 유사 구조 70%↑ 회피`,
    `AI 도입 금지 예: ${MASTER_V6_AI_BANNED_OPENINGS.slice(0, 4).join(" / ")}`,
    `품질: ${MASTER_V6_SCORE_REGEN_BELOW}점 미만 재생성 · ${MASTER_V6_SCORE_PUBLISH_MIN}점 이상 발행 · 축 ${MASTER_V6_QUALITY_AXES.slice(0, 6).join("·")}`,
    `확장 v6.2: ${EXTENSION_V62_PIPELINE.map((s) => s.id).join(" · ")}`,
    MASTER_SYSTEM_V6_FINAL,
  ].join("\n");
}
