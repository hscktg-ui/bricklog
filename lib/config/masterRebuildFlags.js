/**
 * BRICLOG MASTER REBUILD 2026 — Research → Fact → Explain → Experience → Write → Eval → Safe Edit
 */
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";

export const MASTER_REBUILD_VERSION = "master-rebuild-2026-v1";

/** 조사 우선 · 사실 우선 · GPT=편집장 · soft-pass 금지 */
export function isBriclogMasterRebuildEnforced() {
  if (process.env.BRICLOG_MASTER_REBUILD === "false") return false;
  if (process.env.BRICLOG_MASTER_REBUILD === "true") return true;
  return isBriclogResetQualityEnforced();
}

export const MASTER_REBUILD_PASS_SCORE = 90;
export const MASTER_REBUILD_REVISE_MIN = 80;

/** 품질 미달·조사 부족이어도 본문이 있으면 무조건 송출 (보류 금지) */
export function isBriclogAlwaysDeliverEnabled() {
  if (process.env.BRICLOG_ALWAYS_DELIVER === "false") return false;
  if (process.env.BRICLOG_ALWAYS_DELIVER === "true") return true;
  return isBriclogMasterRebuildEnforced();
}

export function isCustomerBodyDeliverable(pack) {
  return Boolean(pack?.sections?.length);
}

/** 평가 점수와 무관 — 섹션 본문이 있으면 송출 허용 */
export function resolveDeliveryAllowed(pack, evaluation = null) {
  if (isBriclogAlwaysDeliverEnabled() && isCustomerBodyDeliverable(pack)) return true;
  return evaluation?.pass === true && evaluation?.shouldWithhold !== true;
}

export const MASTER_REBUILD_PIPELINE_STEPS = [
  "사용자 입력",
  "검색 의도 분석",
  "조사 항목 생성",
  "브랜드 메모리 로드",
  "조사 결과 정리",
  "설명·경험 포인트",
  "아웃라인",
  "본문 작성",
  "Delete Engine",
  "품질 평가 90점",
  "Safe Edit",
  "최종 출력",
];
