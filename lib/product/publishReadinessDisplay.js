/**
 * 발행 준비 상태 — 에디터·작가·디자이너 공통 SSOT
 * humanReady / displayReady 이중 칩 + SQV 글값 통합
 */
import { COMPLETION_READY_HINT } from "@/lib/product/completionStandard";
import { adaptiveQualityModeLabelKo } from "@/lib/golden/adaptiveQualityPolicy";
import {
  DELIVERY_GRADE,
  deliveryGradeLabelKo,
} from "@/lib/product/deliveryGrade";

export const PUBLISH_READY_LABEL = "지금 복사해 올려도 됩니다";
export const PUBLISH_POLISHING_LABEL = "한 번 더 다듬는 중";
export const PUBLISH_DRAFT_LABEL = "초안 · 다듬는 중";
export const PUBLISH_REVIEW_LABEL = "올리기 전 한 번 읽어 보세요";

function sqvHint(sqv) {
  if (!sqv || typeof sqv.score !== "number") return "";
  const tail = (sqv.reasons || []).slice(0, 2).filter(Boolean).join(" · ");
  return tail
    ? `글값 ${sqv.grade} (${sqv.score}) — ${tail}`
    : `글값 ${sqv.grade} (${sqv.score})`;
}

/**
 * @param {object} [pack]
 * @returns {{
 *   status: "ready" | "polishing" | "review" | "blocked",
 *   label: string,
 *   hint: string,
 *   canCopy: boolean,
 *   sqvScore?: number,
 *   sqvGrade?: string,
 * }}
 */
function adaptiveHint(meta = {}) {
  const label = meta.adaptiveQualityModeLabel || adaptiveQualityModeLabelKo(meta.goldenGate);
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
    return {
      status: "polishing",
      label: PUBLISH_DRAFT_LABEL,
      hint: `목표 ${min.toLocaleString("ko-KR")}자 편집본을 맞추는 중입니다. 「다시 받기」로 보강할 수 있어요.`,
      canCopy: true,
      sqvScore: sqv?.score,
      sqvGrade: sqv?.grade,
      deliveryGrade: DELIVERY_GRADE.DRAFT,
    };
  }

  if (meta.deliveryGrade === DELIVERY_GRADE.HUMAN) {
    return {
      status: "polishing",
      label: deliveryGradeLabelKo(DELIVERY_GRADE.HUMAN),
      hint: "분량은 갖췄어요. 올리기 전에 톤·사실만 한 번 확인해 주세요.",
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
        hint: prefix + (sqvHint(sqv) || "복사는 가능하지만, 올리기 전에 한 번 더 읽어 보세요."),
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
      hint: sqvHint(sqv) || "글값이 낮습니다. 「다시 받기」 또는 직접 다듬어 주세요.",
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
