/**
 * LLM Provider Guard — 서버 운영자만 API Key 관리
 * Writer: GPT-5.5 고정 (조사·로컬·메모리 AI는 글 작성 금지 — V17)
 */
import { isLlmFirstDefault } from "@/lib/quality/qualityDefaults";
import {
  OPENAI_WRITER_MODEL,
  resolveWriterModel,
} from "@/lib/llm/openaiCompletionParams";

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

/** @deprecated resolveWriterModel — 항상 gpt-5.5 */
export function getOpenAIModel() {
  return resolveWriterModel();
}

export { OPENAI_WRITER_MODEL, resolveWriterModel };

export function getLLMMode() {
  if (isOpenAIConfigured() && isLlmFirstDefault()) return "openai";
  if (isDevTemplateFallbackAllowed()) return "dev_fallback";
  return "brief_only";
}

/**
 * GPT-5.5 Writer가 Mission prose·Editorial·템플릿 fallback 대신 전 구간 지배.
 * BRICLOG_GPT55_DOMINANT=false 로만 비활성.
 */
export function isGpt55WriterDominant() {
  if (process.env.BRICLOG_GPT55_DOMINANT === "false") return false;
  return isOpenAIConfigured() && isLlmFirstDefault();
}

/** Mission/Editorial/로컬 템플릿 송출 허용 여부 */
export function shouldAllowNonLlmTemplateFallback() {
  return !isGpt55WriterDominant();
}
