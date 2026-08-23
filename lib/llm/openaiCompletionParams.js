/** OpenAI chat/completions — GPT-5.6 Sol Writer SSOT (0824 · 전 엔진 고정·지배) */

/**
 * Writer AI 단일 모델 — env 무관 고정 (OPENAI_MODEL은 레거시·문서용)
 * `gpt-5.6` alias → flagship Sol (Terra/Luna는 Writer 품질 락 제외)
 */
export const DEFAULT_OPENAI_MODEL = "gpt-5.6";

export const OPENAI_WRITER_FAMILY = "gpt-5.6";

export const OPENAI_WRITER_TIER = "sol";

export const OPENAI_WRITER_MODEL = DEFAULT_OPENAI_MODEL;

/** gpt-5.6 또는 gpt-5.6-sol(+snapshot). terra/luna 거부 */
const LOCKED_WRITER_MODEL_RE = /^gpt-5\.6(?:-sol(?:-[0-9a-z.]+)?)?$/i;

export function isLockedWriterModelId(candidate = "") {
  return LOCKED_WRITER_MODEL_RE.test(String(candidate || "").trim());
}

/**
 * @param {string} [candidate]
 * @returns {string}
 */
export function resolveWriterModel(candidate) {
  const c = String(candidate || process.env.OPENAI_MODEL || "").trim();
  if (isLockedWriterModelId(c)) return c;
  return OPENAI_WRITER_MODEL;
}

/**
 * GPT-5 / o3 / o4 계열은 max_tokens 대신 max_completion_tokens 사용
 * @param {string} model
 */
export function usesMaxCompletionTokens(model = "") {
  const m = String(model || "").toLowerCase();
  return /^gpt-5|^o[134]/.test(m);
}

/** gpt-5.5 / gpt-5.6 계열 — temperature는 기본값(1)만 허용 */
export function supportsCustomTemperature(model = "") {
  const m = String(model || "").toLowerCase();
  return !/^gpt-5\.[56](-|$)/.test(m);
}

/**
 * @param {{
 *   model: string,
 *   messages: Array<{ role: string, content: string }>,
 *   temperature?: number,
 *   maxTokens?: number,
 *   responseFormat?: { type: string },
 * }} p
 */
export function buildChatCompletionCreateParams(p) {
  const model = resolveWriterModel(p.model);
  const { messages, temperature, maxTokens, responseFormat } = p;
  const body = { model, messages };
  if (temperature != null && supportsCustomTemperature(model)) {
    body.temperature = temperature;
  }
  const cap = maxTokens ?? 4500;
  if (usesMaxCompletionTokens(model)) {
    body.max_completion_tokens = cap;
  } else {
    body.max_tokens = cap;
  }
  if (responseFormat) body.response_format = responseFormat;
  return body;
}
