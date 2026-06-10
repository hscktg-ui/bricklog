/**
 * 발행 등급 A/B/C — 숫자 대신 행동 가이드 SSOT
 */
import { resolvePublishReadiness } from "@/lib/product/publishReadinessDisplay";

export const PUBLISH_GRADE_A = {
  id: "A",
  label: "즉시 발행 가능",
  shortLabel: "발행 가능",
  action: "복사해서 바로 올려도 됩니다.",
  dot: "🟢",
  tone: "ready",
};

export const PUBLISH_GRADE_B = {
  id: "B",
  label: "검토 후 발행 추천",
  shortLabel: "검토 권장",
  action: "한 번 읽고 사실·톤만 확인한 뒤 올려 주세요.",
  dot: "🟡",
  tone: "review",
};

export const PUBLISH_GRADE_C = {
  id: "C",
  label: "재생성 권장",
  shortLabel: "다시 받기",
  action: "입력을 조금 구체적으로 한 뒤 「다시 받기」를 눌러 주세요.",
  dot: "🔴",
  tone: "retry",
};

/** 축 점수 → 사용자 언어 (숫자 숨김) */
export function axisQualityLabel(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return "확인 중";
  if (score >= 82) return "우수";
  if (score >= 68) return "보통";
  return "보완 필요";
}

/**
 * @param {{ publishScore?: number, readiness?: { status?: string } }} input
 */
export function resolvePublishGrade(input = {}) {
  const score = typeof input.publishScore === "number" ? input.publishScore : 0;
  const status = input.readiness?.status;
  const sqvGrade = input.sqvGrade;
  const editorGrade = input.professionalEditorGrade === true;

  if (status === "blocked" || (score < 60 && !editorGrade)) return PUBLISH_GRADE_C;
  if (
    status === "ready" ||
    score >= 85 ||
    sqvGrade === "A" ||
    editorGrade
  ) {
    return PUBLISH_GRADE_A;
  }
  if (status === "polishing" || score >= 70 || sqvGrade === "B") return PUBLISH_GRADE_B;
  return PUBLISH_GRADE_C;
}

export function buildManuscriptStatusLines(axes = []) {
  const byId = Object.fromEntries(axes.map((a) => [a.id, a]));
  return [
    {
      id: "brand",
      label: "브랜드 반영",
      quality: axisQualityLabel(byId.brand?.score),
    },
    {
      id: "region",
      label: "지역성 반영",
      quality: axisQualityLabel(byId.region?.score),
    },
    {
      id: "topic",
      label: "주제 답변",
      quality: axisQualityLabel(byId.topic?.score),
    },
    {
      id: "trust",
      label: "정보 밀도",
      quality: axisQualityLabel(byId.trust?.score),
    },
  ];
}

export function buildManuscriptStatusFromPack(pack = {}) {
  const readiness = resolvePublishReadiness(pack);
  const meta = pack._meta || {};
  const sqv = meta.sqv;
  const publishScore =
    sqv?.score ??
    meta.contentQualityValue ??
    meta.qualityScore?.total ??
    meta.contentEvalScore ??
    meta.goldenGate?.score ??
    meta.haeshinScore ??
    72;

  return {
    readiness,
    grade: resolvePublishGrade({
      publishScore,
      readiness,
      sqvGrade: sqv?.grade,
      professionalEditorGrade: meta.professionalEditorGrade || sqv?.professionalEditorGrade,
    }),
    publishScore,
    sqvGrade: sqv?.grade,
  };
}
