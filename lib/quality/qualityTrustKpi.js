/**
 * 품질 신뢰도 KPI — 글 100개 중 90개 이상 사람이 읽을 수 있는 수준
 * trust-kpi-v3 (2026-08): 구조 점수(리드·경험·지역·브랜드)도 readable에 포함
 */
import { assessBriclogResetQualityGate, BRICLOG_RESET_PASS_SCORE } from "@/lib/product/briclogResetQualityGate";
import { assessStructureScore } from "@/lib/quality/structureScoreKpi";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";

export const QUALITY_TRUST_KPI_TARGET = 0.9;
export const QUALITY_TRUST_KPI_VERSION = "trust-kpi-v3";

/** 구조 점수를 trust readable에 포함할지 — reset 품질 기본 ON */
export function isStructureRequiredForTrust() {
  if (process.env.BRICLOG_STRUCTURE_IN_TRUST === "false") return false;
  if (process.env.BRICLOG_STRUCTURE_IN_TRUST === "true") return true;
  return isBriclogResetQualityEnforced();
}

/**
 * 사람이 읽을 수 있는 글 — reset 품질 게이트 + 구조 KPI
 * @param {object} pack
 * @param {object} input
 */
export function assessContentTrustReadable(pack, input = {}) {
  const reset = assessBriclogResetQualityGate(pack, input);
  const structure = assessStructureScore(pack, input);
  const structureRequired = isStructureRequiredForTrust();
  const reasons = [...(reset.reasons || []).slice(0, 8)];
  if (structureRequired && !structure.ok) {
    for (const r of structure.reasons || []) {
      if (!reasons.includes(r)) reasons.push(r);
    }
  }
  const readable =
    !reset.hardFail &&
    !reset.shouldWithhold &&
    reset.score >= BRICLOG_RESET_PASS_SCORE &&
    (!structureRequired || structure.ok);
  return {
    readable,
    score: reset.score,
    resetOk: reset.ok,
    contentEvalScore: reset.contentEvalScore ?? reset.checks?.contentEvaluation?.score,
    humanBeliefOk: reset.checks?.humanBelief?.ok ?? true,
    structureOk: structure.ok,
    structureRequired,
    structureScore: structure.score,
    structureParts: structure.parts,
    hardFail: reset.hardFail,
    reasons: reasons.slice(0, 10),
  };
}

/**
 * @param {Array<{ pack: object, input: object, label?: string }>} cases
 */
export function measureQualityTrustKpi(cases = []) {
  const results = cases.map((c, i) => {
    const trust = assessContentTrustReadable(c.pack, c.input);
    return {
      index: i,
      label: c.label || `case-${i + 1}`,
      ...trust,
    };
  });
  const total = results.length;
  const readable = results.filter((r) => r.readable).length;
  const rate = total ? readable / total : 0;
  return {
    version: QUALITY_TRUST_KPI_VERSION,
    total,
    readable,
    rate,
    target: QUALITY_TRUST_KPI_TARGET,
    targetMet: rate >= QUALITY_TRUST_KPI_TARGET,
    results,
  };
}
