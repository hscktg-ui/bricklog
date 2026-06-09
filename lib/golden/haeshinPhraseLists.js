/**
 * 금칙어·AI 관용구 — 시드 + input 오버라이드 (클라이언트 안전)
 */
import {
  AI_CLICHE_PHRASES,
  FORBIDDEN_GLOBAL_PHRASES,
} from "@/lib/golden/haeshinContentDnaSeed";

/**
 * @param {object} [input]
 */
export function getForbiddenGlobalPhrases(input = {}) {
  const extra = input._haeshinDnaOverrides?.forbiddenGlobal || [];
  return [...new Set([...FORBIDDEN_GLOBAL_PHRASES, ...extra])];
}

/**
 * @param {object} [input]
 */
export function getAiClichePhrases(input = {}) {
  const extra = input._haeshinDnaOverrides?.aiCliche || [];
  return [...new Set([...AI_CLICHE_PHRASES, ...extra])];
}
