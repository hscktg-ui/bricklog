/**
 * OpenAI SDK — OPENAI_API_KEY는 process.env 만 사용 (하드코딩·로그 출력 금지)
 */
import OpenAI from "openai";
import { isOpenAIConfigured, getOpenAIModel } from "./llmProvider";

/** @type {OpenAI | null} */
let cachedClient = null;

function redactSecrets(text) {
  return String(text || "").replace(/sk-[a-zA-Z0-9._-]{8,}/g, "[REDACTED]");
}

/**
 * 서버 전용 싱글톤 클라이언트
 * @returns {OpenAI | null}
 */
export function getOpenAIClient() {
  if (!isOpenAIConfigured()) return null;
  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 120000,
      maxRetries: 2,
    });
  }
  return cachedClient;
}

/** 연결 가능 여부 (키 노출 없음) */
export function getOpenAIClientStatus() {
  return {
    configured: isOpenAIConfigured(),
    clientReady: !!getOpenAIClient(),
    model: getOpenAIModel(),
  };
}
