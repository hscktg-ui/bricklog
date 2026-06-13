/**
 * 발행 준비 상태 — 에디터·작가·디자이너 공통 SSOT
 * 클라이언트 UI는 publishUiDisplay.js — 이 파일은 서버·API re-export
 */
export {
  COMPLETION_READY_HINT,
  PUBLISH_READY_LABEL,
  PUBLISH_POLISHING_LABEL,
  PUBLISH_DRAFT_LABEL,
  PUBLISH_REVIEW_LABEL,
  resolvePublishReadiness,
} from "@/lib/product/publishUiDisplay";

import { resolvePublishReadiness as resolvePublishReadinessLite } from "@/lib/product/publishUiDisplay";
import {
  assessHumanColumnContract,
  humanColumnContractLabelKo,
} from "@/lib/product/humanColumnContract";
import {
  DELIVERY_GRADE,
  deliveryGradeLabelKo,
} from "@/lib/product/deliveryGrade";

/**
 * 서버 배달 직후 — 계약 재평가가 필요할 때만 (클라이언트 import 금지)
 * @param {object} [pack]
 */
export function resolvePublishReadinessWithContract(pack = {}) {
  const meta = pack._meta || {};
  if (meta.deliveryGrade !== DELIVERY_GRADE.DRAFT) {
    return resolvePublishReadinessLite(pack);
  }
  const contract = assessHumanColumnContract(pack, pack._input || {});
  const min = meta.lengthTierMin || 2000;
  const voiceHint =
    meta.lengthTierMet && !meta.humanVoiceMet
      ? "분량은 맞췄어요. 사람이 쓴 칼럼 말투로 다듬는 중입니다."
      : `목표 ${min.toLocaleString("ko-KR")}자·경험형 말투 편집본을 맞추는 중입니다.`;
  const sqv = meta.sqv;
  return {
    status: "polishing",
    label:
      humanColumnContractLabelKo(contract) ||
      deliveryGradeLabelKo(DELIVERY_GRADE.DRAFT),
    hint: `${voiceHint} 「다시 받기」로 보강할 수 있어요.`,
    canCopy: true,
    sqvScore: sqv?.score,
    sqvGrade: sqv?.grade,
    deliveryGrade: DELIVERY_GRADE.DRAFT,
  };
}
