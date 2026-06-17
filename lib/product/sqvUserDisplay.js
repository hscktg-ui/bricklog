/**
 * 글값(SQV) — 사용자-facing 표시 SSOT (내부 reason 코드 노출 금지)
 */
import { B_GRADE_MIN_SCORE } from "@/lib/product/bGradeDeliveryEngine";
import { A_GRADE_MIN_SCORE } from "@/lib/product/aGradeDeliveryEngine";

const REASON_KO = {
  human_belief_low: "사람이 쓴 말투를 더 다듬는 중",
  persona_misaligned: "브랜드·화자 톤을 맞추는 중",
  speaker_surface_leak: "화자 말투를 정리하는 중",
  not_explainable: "설명·근거를 보강하는 중",
  length_tier_under: "목표 분량을 맞추는 중",
  body_completion_low: "본문 완성도를 맞추는 중",
  score_capped_by_completion: "완성도에 맞게 점수를 조정했습니다",
  verbatim_topic_repeat: "주제 반복을 줄이는 중",
  brand_proper_noun_weak: "브랜드·제품명 정보를 더 녹이는 중",
  empty_pack: "본문이 비어 있습니다",
  core1_sqv_missing: "품질 점수를 계산하는 중",
  core1_sqv_low: "한 번 더 다듬으면 올리기 좋아집니다",
  channel_sqv_missing: "품질 점수를 계산하는 중",
  first_delivery_channel_editor: "채널 형식에 맞게 편집 중",
  first_delivery_persona: "브랜드 톤을 맞추는 중",
  first_delivery_human_belief: "사람 말투를 다듬는 중",
};

const GRADE_KO = {
  A: "매우 좋음",
  B: "올리기 좋음",
  C: "한 번 더 다듬기",
  D: "다시 받기 권장",
  F: "다시 받기",
};

export function gradeFromSqScore(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  if (score >= A_GRADE_MIN_SCORE) return "A";
  if (score >= B_GRADE_MIN_SCORE) return "B";
  if (score >= 64) return "C";
  if (score >= 50) return "D";
  return "F";
}

export function resolveSqScoreFromPack(pack = {}) {
  const meta = pack._meta || {};
  if (typeof meta.sqv?.score === "number") {
    return {
      score: meta.sqv.score,
      grade: meta.sqv.grade || gradeFromSqScore(meta.sqv.score),
      sqv: meta.sqv,
    };
  }
  if (typeof meta.contentQualityValue === "number") {
    return {
      score: meta.contentQualityValue,
      grade: gradeFromSqScore(meta.contentQualityValue),
      sqv: null,
    };
  }
  return { score: null, grade: null, sqv: null };
}

export function translateSqReason(reason = "") {
  const key = String(reason || "").trim();
  if (!key) return "";
  if (REASON_KO[key]) return REASON_KO[key];
  if (/^core1_|^core2_|^first_delivery_/.test(key)) {
    return "품질을 맞추는 중";
  }
  return "";
}

/** 사용자에게 보여 줄 reason — 내부 코드 필터 */
export function buildSqUserTips(sqv = {}, limit = 2) {
  const tips = (sqv.reasons || [])
    .map(translateSqReason)
    .filter(Boolean);
  return [...new Set(tips)].slice(0, limit);
}

export function formatSqGradeShort(grade, score) {
  if (typeof score !== "number") return "";
  const g = grade || gradeFromSqScore(score) || "—";
  const label = GRADE_KO[g] || "확인 중";
  return `글값 ${g} · ${label}`;
}

export function formatSqUserHint(sqv = {}, meta = {}) {
  const score =
    typeof sqv.score === "number"
      ? sqv.score
      : typeof meta.contentQualityValue === "number"
        ? meta.contentQualityValue
        : null;
  if (score == null) return "";

  const grade = sqv.grade || gradeFromSqScore(score);
  const head = formatSqGradeShort(grade, score);
  const tips = buildSqUserTips(sqv);
  const completionLow =
    typeof sqv.completionRatio === "number" && sqv.completionRatio < 0.88;

  if (meta.publishReady === true || sqv.publishReady === true) {
    return tips.length ? `${head} — ${tips[0]}` : `${head} — 복사해 올려도 됩니다`;
  }
  if (completionLow) {
    return tips.length
      ? `${head} — 분량·구성이 목표에 닿기 전이라 점수를 보수적으로 표시합니다. ${tips[0]}`
      : `${head} — 분량·구성이 목표에 닿기 전이라 점수를 보수적으로 표시합니다`;
  }
  if (score >= B_GRADE_MIN_SCORE) {
    return tips.length
      ? `${head} — ${tips.join(" · ")}`
      : `${head} — 한 번 읽고 올려 주세요`;
  }
  if (score >= 50) {
    return tips.length
      ? `${head} — ${tips[0]}`
      : `${head} — 사실·톤만 확인해 주세요`;
  }
  return `${head} — 「다시 받기」 또는 직접 다듬어 주세요`;
}

export function buildSqUserDiagnostic(pack = {}) {
  const { score, grade, sqv } = resolveSqScoreFromPack(pack);
  if (typeof score !== "number") return null;

  const resolvedGrade = grade || gradeFromSqScore(score);
  const tips = buildSqUserTips(sqv || {});

  return {
    score,
    grade: resolvedGrade,
    label: formatSqGradeShort(resolvedGrade, score),
    hint: formatSqUserHint(
      { ...(sqv || {}), score, grade: resolvedGrade },
      pack._meta || {}
    ),
    tips,
    completionRatio: sqv?.completionRatio,
    calibratedScore: sqv?.calibratedScore,
  };
}
