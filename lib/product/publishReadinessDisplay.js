/**
 * 발행 준비 상태 — 에디터·작가·디자이너 공통 SSOT
 * humanReady / displayReady 이중 칩 대신 단일 사용자 메시지
 */
import { COMPLETION_READY_HINT } from "@/lib/product/completionStandard";

export const PUBLISH_READY_LABEL = "지금 복사해 올려도 됩니다";
export const PUBLISH_POLISHING_LABEL = "한 번 더 다듬는 중";
export const PUBLISH_REVIEW_LABEL = "올리기 전 한 번 읽어 보세요";

/**
 * @param {object} [pack]
 * @returns {{
 *   status: "ready" | "polishing" | "review" | "blocked",
 *   label: string,
 *   hint: string,
 *   canCopy: boolean,
 * }}
 */
export function resolvePublishReadiness(pack = {}) {
  const meta = pack._meta || {};

  if (meta.outputWithheld) {
    return {
      status: "blocked",
      label: PUBLISH_REVIEW_LABEL,
      hint: "아직 화면에 보여 드리기 어려운 초안입니다. 「다시 받기」를 눌러 주세요.",
      canCopy: false,
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
