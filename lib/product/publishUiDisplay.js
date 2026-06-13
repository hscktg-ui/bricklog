/**
 * 발행 UI 표시 SSOT — 클라이언트 번들용 (생성·배달 엔진 import 금지)
 */
import { DELIVERY_GRADE } from "@/lib/product/deliveryGradeConstants";
import { adaptiveQualityModeLabelKo } from "@/lib/golden/adaptiveQualityPolicy";

export const COMPLETION_READY_HINT =
  "편집본이 준비됐어요. 복사한 뒤 한 번 읽고 올려 주세요.";

export const PUBLISH_READY_LABEL = "지금 복사해 올려도 됩니다";
export const PUBLISH_POLISHING_LABEL = "한 번 더 다듬는 중";
export const PUBLISH_DRAFT_LABEL = "초안 · 다듬는 중";
export const PUBLISH_REVIEW_LABEL = "올리기 전 한 번 읽어 보세요";

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

function sqvHint(sqv) {
  if (!sqv || typeof sqv.score !== "number") return "";
  const tail = (sqv.reasons || []).slice(0, 2).filter(Boolean).join(" · ");
  return tail
    ? `글값 ${sqv.grade} (${sqv.score}) — ${tail}`
    : `글값 ${sqv.grade} (${sqv.score})`;
}

function adaptiveHint(meta = {}) {
  const label =
    meta.adaptiveQualityModeLabel || adaptiveQualityModeLabelKo(meta.goldenGate);
  return label ? `${label} · ` : "";
}

function goldenQualityHint(meta = {}) {
  const gate = meta.goldenGate;
  const parts = [];
  if (meta.llmAdaptivePublish || meta.llmDeliveryPolish) {
    parts.push("AI 원고 마감");
  }
  if (typeof gate?.haeshin?.score === "number") {
    parts.push(`해신 ${gate.haeshin.score}`);
  }
  if (typeof gate?.score === "number") {
    parts.push(`품질 ${gate.score}`);
  }
  return parts.length ? `${parts.join(" · ")} — ` : "";
}

function draftLabelFromMeta(meta = {}) {
  if (meta.humanColumnOk) return "사람이 쓴 칼럼";
  if (meta.lengthTierMet && meta.humanVoiceMet === false) {
    return "말투·경험 다듬는 중";
  }
  if (!meta.lengthTierMet) return "분량 맞추는 중";
  return PUBLISH_DRAFT_LABEL;
}

/**
 * @param {object} [pack]
 */
export function resolvePublishReadiness(pack = {}) {
  const meta = pack._meta || {};
  const sqv = meta.sqv;
  const prefix = adaptiveHint(meta);

  if (meta.outputWithheld) {
    return {
      status: "blocked",
      label: PUBLISH_REVIEW_LABEL,
      hint: "아직 화면에 보여 드리기 어려운 초안입니다. 「다시 받기」를 눌러 주세요.",
      canCopy: false,
      sqvScore: sqv?.score,
      sqvGrade: sqv?.grade,
    };
  }

  if (meta.deliveryGrade === DELIVERY_GRADE.DRAFT) {
    const min = meta.lengthTierMin || 2000;
    const voiceHint =
      meta.lengthTierMet && meta.humanVoiceMet === false
        ? "분량은 맞췄어요. 사람이 쓴 칼럼 말투로 다듬는 중입니다."
        : `목표 ${min.toLocaleString("ko-KR")}자·경험형 말투 편집본을 맞추는 중입니다.`;
    return {
      status: "polishing",
      label: draftLabelFromMeta(meta),
      hint: `${voiceHint} 「다시 받기」로 보강할 수 있어요.`,
      canCopy: true,
      sqvScore: sqv?.score,
      sqvGrade: sqv?.grade,
      deliveryGrade: DELIVERY_GRADE.DRAFT,
    };
  }

  if (meta.deliveryGrade === DELIVERY_GRADE.HUMAN) {
    return {
      status: "polishing",
      label: "사람이 쓴 칼럼 · 편집본",
      hint: "경험형 말투와 분량을 갖췄어요. 올리기 전에 사실만 한 번 확인해 주세요.",
      canCopy: true,
      sqvScore: sqv?.score,
      sqvGrade: sqv?.grade,
      deliveryGrade: DELIVERY_GRADE.HUMAN,
    };
  }

  if (meta.publishReady === true || sqv?.publishReady === true) {
    const gHint = goldenQualityHint(meta);
    const tail = gHint || (sqvHint(sqv) ? `${sqvHint(sqv)} — ` : "");
    return {
      status: "ready",
      label: PUBLISH_READY_LABEL,
      hint: prefix + tail + "복사해서 네이버·인스타에 붙여 넣으면 됩니다.",
      canCopy: true,
      sqvScore: sqv?.score,
      sqvGrade: sqv?.grade,
    };
  }

  if (sqv && typeof sqv.score === "number") {
    if (sqv.score >= 76) {
      return {
        status: "polishing",
        label: PUBLISH_POLISHING_LABEL,
        hint:
          prefix +
          (sqvHint(sqv) || "복사는 가능하지만, 올리기 전에 한 번 더 읽어 보세요."),
        canCopy: true,
        sqvScore: sqv.score,
        sqvGrade: sqv.grade,
      };
    }
    if (sqv.score >= 50) {
      return {
        status: "review",
        label: PUBLISH_REVIEW_LABEL,
        hint: prefix + (sqvHint(sqv) || COMPLETION_READY_HINT),
        canCopy: true,
        sqvScore: sqv.score,
        sqvGrade: sqv.grade,
      };
    }
    return {
      status: "review",
      label: PUBLISH_REVIEW_LABEL,
      hint:
        sqvHint(sqv) ||
        "글값이 낮습니다. 「다시 받기」 또는 직접 다듬어 주세요.",
      canCopy: true,
      sqvScore: sqv.score,
      sqvGrade: sqv.grade,
    };
  }

  const explicitPublish =
    meta.publishReady === true ||
    meta.primaryDirective?.publishReady === true ||
    meta.aiEditorAudit?.publishReady === true;

  const human = meta.humanWritingDelivery || {};
  const humanReady = human.humanReady;
  const displayReady =
    human.displayReady ??
    meta.completionReadiness?.displayReady ??
    meta.displayReady;

  if (explicitPublish) {
    return {
      status: "ready",
      label: PUBLISH_READY_LABEL,
      hint: "복사해서 네이버·인스타에 붙여 넣으면 됩니다.",
      canCopy: true,
    };
  }

  if (humanReady === false || displayReady === false) {
    return {
      status: "polishing",
      label: PUBLISH_POLISHING_LABEL,
      hint: "복사는 가능하지만, 올리기 전에 한 번 더 읽어 보세요.",
      canCopy: true,
    };
  }

  if (humanReady === true && displayReady === true) {
    return {
      status: "ready",
      label: PUBLISH_READY_LABEL,
      hint: "복사해서 네이버·인스타에 붙여 넣으면 됩니다.",
      canCopy: true,
    };
  }

  return {
    status: "review",
    label: PUBLISH_REVIEW_LABEL,
    hint: COMPLETION_READY_HINT,
    canCopy: true,
  };
}

/** @param {object} input */
export function resolvePublishGrade(input = {}) {
  const score = typeof input.publishScore === "number" ? input.publishScore : 0;
  const status = input.readiness?.status;
  const sqvGrade = input.sqvGrade;
  const editorGrade = input.professionalEditorGrade === true;

  if (status === "blocked" || (score < 60 && !editorGrade)) {
    return PUBLISH_GRADE_C;
  }
  if (
    status === "ready" ||
    score >= 85 ||
    sqvGrade === "A" ||
    editorGrade
  ) {
    return PUBLISH_GRADE_A;
  }
  if (status === "polishing" || score >= 70 || sqvGrade === "B") {
    return PUBLISH_GRADE_B;
  }
  return PUBLISH_GRADE_C;
}

export function axisQualityLabel(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return "확인 중";
  if (score >= 82) return "우수";
  if (score >= 68) return "보통";
  return "보완 필요";
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
