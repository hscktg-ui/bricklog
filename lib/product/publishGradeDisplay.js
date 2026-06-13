/**
 * 발행 등급 A/B/C — 숫자 대신 행동 가이드 SSOT
 * 클라이언트 UI는 publishUiDisplay.js — 이 파일은 서버·API re-export
 */
export {
  PUBLISH_GRADE_A,
  PUBLISH_GRADE_B,
  PUBLISH_GRADE_C,
  axisQualityLabel,
  resolvePublishGrade,
  buildManuscriptStatusLines,
} from "@/lib/product/publishUiDisplay";

import {
  resolvePublishReadiness,
  resolvePublishGrade,
} from "@/lib/product/publishUiDisplay";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract";

/** 서버·배치 — pack에서 원고 상태 스냅샷 (클라이ent import 금지) */
export function buildManuscriptStatusFromPack(pack = {}) {
  const readiness = resolvePublishReadiness(pack);
  const meta = pack._meta || {};
  const sqv = meta.sqv;
  const contract = assessHumanColumnContract(pack, pack._input || {});
  const publishScore =
    sqv?.score ??
    meta.contentQualityValue ??
    meta.qualityScore?.total ??
    meta.contentEvalScore ??
    meta.goldenGate?.score ??
    meta.haeshinScore ??
    72;

  const editorialGrade = resolvePublishGrade({
    publishScore,
    readiness,
    sqvGrade: undefined,
    professionalEditorGrade: meta.professionalEditorGrade,
  });

  return {
    readiness,
    grade: editorialGrade,
    publishScore,
    sqvGrade: sqv?.grade,
    sqvDiagnostic:
      typeof sqv?.score === "number"
        ? {
            score: sqv.score,
            grade: sqv.grade,
            label: `글값 ${sqv.grade} (${sqv.score})`,
          }
        : null,
    deliveryGrade: meta.deliveryGrade,
    humanVoiceMet: meta.humanVoiceMet ?? contract.humanVoiceMet,
    catalogProseOk:
      meta.humanColumnProseScore?.ok ?? contract.proseContamination?.ok ?? true,
  };
}
