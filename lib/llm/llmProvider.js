/**
 * LLM Provider Guard — 서버 운영자만 API Key 관리
 * 기본: OPENAI_API_KEY 있으면 LLM 우선 (BRICLOG_LLM_FIRST=false 로만 해제)
 */

import { isLlmFirstDefault } from "@/lib/quality/qualityDefaults";

const PLACEHOLDER_KEYS = /^(your_|xxx|test|placeholder|sk-your)/i;

export function isOpenAIConfigured() {
  if (typeof process === "undefined") return false;
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (key.length < 20 || !key.startsWith("sk-")) return false;
  if (PLACEHOLDER_KEYS.test(key)) return false;
  return true;
}

/** 개발용 템플릿 본문 — 명시적 허용 시에만 (기본 false) */
export function isDevTemplateFallbackAllowed() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.BRICLOG_ALLOW_DEV_FALLBACK === "true"
  );
}

export function getOpenAIModel() {
  return (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
}

export function getLLMMode() {
  if (isOpenAIConfigured() && isLlmFirstDefault()) return "openai";
  if (isDevTemplateFallbackAllowed()) return "dev_fallback";
  return "brief_only";
}

