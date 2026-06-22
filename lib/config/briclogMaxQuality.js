/**
 * BRICLOG Max Quality SSOT — 비용 무관 최고 품질 (GPT-5.5 + Gemini Pro + Writer + 풀 에디터)
 * UX 목표 1~2분: Reset 품질 모드에서는 기본 OFF (90pt 게이트·로컬 delivery pass는 유지).
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";

export const MAX_QUALITY_VERSION = "max-quality-v1";

export function isBriclogMaxQualityEnabled() {
  if (process.env.BRICLOG_MAX_QUALITY === "false") return false;
  if (process.env.BRICLOG_MAX_QUALITY === "true") return true;
  if (isBriclogResetQualityEnforced()) return false;
  return isBriclogMissionEnforced();
}

/** Gemini 조사·분석 모델 — env 우선, 없으면 max: pro / default: flash */
export function resolveGeminiModel() {
  const forced = String(process.env.GEMINI_MODEL || "").trim();
  if (forced) return forced;
  return isBriclogMaxQualityEnabled() ? "gemini-2.5-pro" : "gemini-2.5-flash";
}

export function getGeminiResearchTimeoutMs() {
  const n = Number(process.env.BRICLOG_GEMINI_RESEARCH_TIMEOUT_MS);
  if (Number.isFinite(n) && n > 0) return n;
  return isBriclogMaxQualityEnabled() ? 45_000 : 22_000;
}

export function getGeminiMaxOutputTokens(kind = "research") {
  const envKey =
    kind === "analysis"
      ? "BRICLOG_GEMINI_ANALYSIS_MAX_TOKENS"
      : "BRICLOG_GEMINI_RESEARCH_MAX_TOKENS";
  const n = Number(process.env[envKey]);
  if (Number.isFinite(n) && n > 0) return n;
  if (!isBriclogMaxQualityEnabled()) {
    return kind === "analysis" ? 2048 : 4096;
  }
  return kind === "analysis" ? 4096 : 8192;
}

export function getMaxQualityCqReviewRevisions() {
  const n = Number(process.env.BRICLOG_CQREVIEW_MAX_REVISIONS);
  if (Number.isFinite(n) && n >= 1) return Math.min(5, n);
  return isBriclogMaxQualityEnabled() ? 3 : null;
}
