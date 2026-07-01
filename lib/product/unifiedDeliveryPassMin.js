/**
 * 송출 등급 bar SSOT — bench 85 · editor 88 · eval 90 → unified 85
 */
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";

export const UNIFIED_DELIVERY_PASS_MIN_VERSION = "unified-pass-min-v1";
/** 무편집 발행 A · visit benchmark · unified gate 공통 */
export const UNIFIED_DELIVERY_PASS_MIN = 85;
/** contentEvaluationEngine withhold (별도 — unified 송출과 분리) */
export const UNIFIED_CONTENT_EVAL_WITHHOLD_MIN = 90;

/**
 * @param {{ passMin?: number }} [opts]
 */
export function resolveUnifiedDeliveryPassMin(opts = {}) {
  if (typeof opts.passMin === "number") return opts.passMin;
  const env = Number(process.env.BRICLOG_UNIFIED_PASS_MIN);
  if (Number.isFinite(env) && env >= 75 && env <= 95) return Math.floor(env);
  if (isBriclogResetQualityEnforced()) return UNIFIED_DELIVERY_PASS_MIN;
  return UNIFIED_DELIVERY_PASS_MIN;
}
