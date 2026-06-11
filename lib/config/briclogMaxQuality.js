/**
 * BRICLOG Max Quality SSOT — 비용 무관 최고 품질 (GPT-5.5 + Gemini + Writer + 풀 에디터)
 * 기본 ON (Mission ON 시). BRICLOG_MAX_QUALITY=false 로만 경량 복귀.
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

export const MAX_QUALITY_VERSION = "max-quality-v1";

export function isBriclogMaxQualityEnabled() {
  if (process.env.BRICLOG_MAX_QUALITY === "false") return false;
  if (process.env.BRICLOG_MAX_QUALITY === "true") return true;
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
