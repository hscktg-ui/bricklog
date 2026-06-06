/**
 * BRICLOG PRIORITY UPDATE — 기능 추가보다 품질 향상 우선
 * 신규 기능은 아래 5개 완료 전 보류
 */
export const BRICLOG_PRIORITY_VERSION = "priority-v1";

/** 우선 개발 순서 (완료 전 신규 기능 보류) */
export const PRIORITY_DEVELOPMENT_ORDER = [
  { id: "research_verification", label: "조사결과 검증 시스템", order: 1, status: "done" },
  { id: "ai_editor", label: "AI 편집장", order: 2, status: "done" },
  { id: "brand_wiki", label: "브랜드 위키", order: 3, status: "done" },
  { id: "user_correction_learning", label: "사용자 수정 학습", order: 4, status: "done" },
  { id: "performance_learning", label: "성과 학습", order: 5, status: "done" },
];

export function arePriorityPillarsComplete() {
  return PRIORITY_DEVELOPMENT_ORDER.every((p) => p.status === "done");
}

/** 강제 파이프라인: 주제 증명 → 조사 → 검증 → 생성 → 감사 → 출력 */
export const PIPELINE_ORDER_STRICT = [
  "input",
  "topic_map",
  "info_securement_rate",
  "topic_explanation_rate",
  "info_unit_check",
  "research",
  "research_verify",
  "generate",
  "quality_audit",
  "brand_uniqueness",
  "output",
];

/**
 * 신규 기능 개발 허용 여부
 * 환경변수 BRICLOG_ALLOW_NEW_FEATURES=true 로만 해제
 */
export function isNewFeatureDevelopmentAllowed() {
  if (process.env.BRICLOG_ALLOW_NEW_FEATURES === "true") return true;
  return arePriorityPillarsComplete();
}

export function getPriorityDevelopmentBrief() {
  const lines = PRIORITY_DEVELOPMENT_ORDER.map(
    (p) => `${p.order}. ${p.label}`
  );
  return [
    "【BRICLOG ENGINE PRIORITY OVERRIDE】",
    "원칙: 글을 생성하지 말고, 먼저 주제를 설명할 수 있는지 증명한다.",
    "증명하지 못하면 작성하지 않는다. 정보가 부족하면 조사한다.",
    `파이프라인: ${PIPELINE_ORDER_STRICT.join(" → ")}`,
    "",
    "【BRICLOG 개발 우선순위】",
    "목표: 발행 가능한 결과물 (수정 없이 복사·발행)",
    ...lines,
    isNewFeatureDevelopmentAllowed()
      ? "신규 기능: 허용됨 (BRICLOG_ALLOW_NEW_FEATURES)"
      : "신규 기능: 품질 5대 축 완료 전 보류",
  ].join("\n");
}
