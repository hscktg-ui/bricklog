/**
 * BRICLOG Tri-AI Fast Pipeline
 * 네이버(재료) → 제미나이(조사·의도) → GPT(작성 1회) → 로컬(분량·검수)
 * 기본 ON — BRICLOG_FAST_PIPELINE=false 로만 끔
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isGeminiConfigured } from "@/lib/content/contentIntelligenceV12";
import { getQualityTarget } from "@/lib/quality/qualityDefaults";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";

export function isBriclogFastPipelineEnabled() {
  return process.env.BRICLOG_FAST_PIPELINE !== "false";
}

/** 조사 JSON 합성 — Gemini 전담 (GPT는 작성만) */
export function useGeminiResearchProvider() {
  const forced = String(process.env.BRICLOG_RESEARCH_PROVIDER || "")
    .trim()
    .toLowerCase();
  if (forced === "openai") return false;
  if (forced === "gemini") return isGeminiConfigured();
  return isGeminiConfigured();
}

export function getNaverMaxQueries() {
  if (isBriclogMissionEnforced()) {
    const n = Number(process.env.BRICLOG_NAVER_MAX_QUERIES);
    if (Number.isFinite(n) && n > 0) return n;
    return isBriclogFastPipelineEnabled() ? 6 : 10;
  }
  if (!isBriclogFastPipelineEnabled()) {
    return Number(process.env.BRICLOG_SEARCH_EXPANSION_MAX_QUERIES) || 10;
  }
  const n = Number(process.env.BRICLOG_NAVER_MAX_QUERIES);
  return Number.isFinite(n) && n > 0 ? n : 4;
}

export function getResearchDepthMaxRounds(topicIsModelLike = false) {
  if (isBriclogMissionEnforced() && isBriclogFastPipelineEnabled()) {
    return topicIsModelLike ? 1 : 1;
  }
  if (!isBriclogFastPipelineEnabled()) {
    return topicIsModelLike ? 2 : 1;
  }
  return 0;
}

export function shouldSkipModelTopicExtraResearch() {
  return isBriclogFastPipelineEnabled();
}

export function getCoreMaxRewrites() {
  if (!isBriclogFastPipelineEnabled()) return 3;
  const n = Number(process.env.BRICLOG_LLM_MAX_REWRITES);
  return Number.isFinite(n) && n >= 1 ? Math.min(4, n) : 3;
}

export function isChannelPackDeferred() {
  if (!isBriclogFastPipelineEnabled()) return false;
  return process.env.BRICLOG_CHANNEL_PACK_DEFER !== "false";
}

export function getLocalFinishMaxMs() {
  if (isBriclogMissionEnforced() && isBriclogFastPipelineEnabled()) {
    const n = Number(process.env.BRICLOG_LOCAL_FINISH_MS);
    return Number.isFinite(n) && n > 0 ? n : 14_000;
  }
  if (!isBriclogFastPipelineEnabled()) return 30_000;
  const n = Number(process.env.BRICLOG_LOCAL_FINISH_MS);
  return Number.isFinite(n) && n > 0 ? n : 8_000;
}

export function getStrictLengthMaxAttempts() {
  return isBriclogFastPipelineEnabled() ? 3 : 20;
}

export function getGenerationTimeBudgetMs() {
  if (!isBriclogFastPipelineEnabled()) return 90_000;
  const n = Number(process.env.BRICLOG_GENERATION_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : 72_000;
}

export function getLlmLoopBudgetMs() {
  if (!isBriclogFastPipelineEnabled()) return 90_000;
  const n = Number(process.env.BRICLOG_LLM_LOOP_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : 78_000;
}

/** GPT human-tier expansion pass (WRITE→EXPAND) — GPT-5.5 지배 시 항상 ON */
export function isWriterEngineExpansionEnabled() {
  if (process.env.BRICLOG_WRITER_ENGINE === "false") return false;
  if (isGpt55WriterDominant()) return true;
  return isBriclogMissionEnforced();
}

/** GPT 작성 프롬프트 — gate용 brief는 user에 최소만 (기본 ON) */
export function isSlimWriterPromptEnabled() {
  if (process.env.BRICLOG_SLIM_WRITER_PROMPT === "false") return false;
  return isBriclogFastPipelineEnabled();
}

/** LLM 초안 문장 prune — 기본 OFF (후처리로 voice 손상 방지) */
export function shouldSkipOffAxisPrune() {
  if (process.env.BRICLOG_PRUNE_OFF_AXIS === "true") return false;
  return isBriclogFastPipelineEnabled();
}

/** 플레이스·인스타·썸네일 단독 생성 — 180s SLA용 경량 조사·작성 */
export function isChannelStandaloneFastEnabled() {
  if (process.env.BRICLOG_CHANNEL_STANDALONE_FAST === "false") return false;
  return isBriclogFastPipelineEnabled();
}

export function getChannelLlmLoopBudgetMs() {
  if (!isBriclogFastPipelineEnabled()) return 45_000;
  const n = Number(process.env.BRICLOG_CHANNEL_LLM_LOOP_MS);
  return Number.isFinite(n) && n > 0 ? n : 28_000;
}

export function shouldSkipChannelSupplementalResearch() {
  return isChannelStandaloneFastEnabled();
}

export function getChannelSoftPassFloor() {
  return Math.max(85, getQualityTarget() - 8);
}

export function isChannelStandaloneFastInput(input = {}) {
  if (!isChannelStandaloneFastEnabled()) return false;
  if (input.channelStandaloneFast === false) return false;
  if (input.channelStandaloneFast === true) return true;
  const ch = String(input.contentChannel || "").toLowerCase();
  if (!["place", "instagram", "image"].includes(ch)) return false;
  return input.sourceChannel !== "blog" && !input._sourceBlogPack;
}

export function getResearchClientTimeoutMs() {
  if (isBriclogMissionEnforced() && isBriclogFastPipelineEnabled()) return 24_000;
  return isBriclogFastPipelineEnabled() ? 18_000 : 45_000;
}

export function getChannelPackDeadlineMs() {
  if (isChannelPackDeferred()) return Number.MAX_SAFE_INTEGER;
  return 78_000;
}

export function getBlogWriteMaxTokens(tier = "medium") {
  if (!isBriclogFastPipelineEnabled()) {
    return tier === "short" ? 3200 : 3800;
  }
  if (tier === "short") return 3400;
  if (tier === "long") return 4800;
  return 4400;
}

export const BRICLOG_FAST_PIPELINE_BRIEF = `【BRICLOG · Tri-AI】
Naver=지역·한국 검색 재료 | Gemini=조사·팩트·고객질문 | GPT=본문 1회 | Memory=브랜드 유지.
조사 부족 시 작성 금지. 정보량 없이 글자수 맞추기 금지. SEO는 결과이지 목표가 아님.`;
