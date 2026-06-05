/**
 * BRICLOG Tri-AI Fast Pipeline
 * 네이버(재료) → 제미나이(조사·의도) → GPT(작성 1회) → 로컬(분량·검수)
 * 기본 ON — BRICLOG_FAST_PIPELINE=false 로만 끔
 */
import { isGeminiConfigured } from "@/lib/content/contentIntelligenceV12";

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
  if (!isBriclogFastPipelineEnabled()) {
    return Number(process.env.BRICLOG_SEARCH_EXPANSION_MAX_QUERIES) || 10;
  }
  const n = Number(process.env.BRICLOG_NAVER_MAX_QUERIES);
  return Number.isFinite(n) && n > 0 ? n : 4;
}

export function getResearchDepthMaxRounds(topicIsModelLike = false) {
  if (!isBriclogFastPipelineEnabled()) {
    return topicIsModelLike ? 2 : 1;
  }
  return 0;
}

export function shouldSkipModelTopicExtraResearch() {
  return isBriclogFastPipelineEnabled();
}

export function getCoreMaxRewrites() {
  if (!isBriclogFastPipelineEnabled()) return 2;
  const n = Number(process.env.BRICLOG_LLM_MAX_REWRITES);
  return Number.isFinite(n) && n >= 1 ? Math.min(2, n) : 1;
}

export function isChannelPackDeferred() {
  if (!isBriclogFastPipelineEnabled()) return false;
  return process.env.BRICLOG_CHANNEL_PACK_DEFER !== "false";
}

export function getLocalFinishMaxMs() {
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
  return Number.isFinite(n) && n > 0 ? n : 60_000;
}

export function getLlmLoopBudgetMs() {
  if (!isBriclogFastPipelineEnabled()) return 72_000;
  const n = Number(process.env.BRICLOG_LLM_LOOP_BUDGET_MS);
  return Number.isFinite(n) && n > 0 ? n : 38_000;
}

export function getResearchClientTimeoutMs() {
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
