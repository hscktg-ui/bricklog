/** OpenAI Responses API — GPT-5.6 Sol Writer SSOT (0824 · 전 엔진 고정·지배) */

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
 * GPT-5 / o3 / o4 계열 레거시 chat/completions 호환 메모
 * Responses API 전환 후에도 일부 토큰 정책 계산에서 재사용한다.
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

function mapResponseFormat(responseFormat) {
  if (!responseFormat?.type) return null;
  if (responseFormat.type === "json_object") {
    return { type: "json_object" };
  }
  if (responseFormat.type === "json_schema") {
    const jsonSchema = responseFormat.json_schema || {};
    if (!jsonSchema?.schema || !jsonSchema?.name) return null;
    return {
      type: "json_schema",
      name: jsonSchema.name,
      schema: jsonSchema.schema,
      strict: jsonSchema.strict ?? true,
      description: jsonSchema.description,
    };
  }
  return null;
}

/**
 * @param {{
 *   model: string,
 *   messages: Array<{ role: string, content: string|object|Array<object> }>,
 *   temperature?: number,
 *   maxTokens?: number,
 *   responseFormat?: { type: string, json_schema?: { name?: string, schema?: object, strict?: boolean, description?: string } },
 *   store?: boolean,
 * }} p
 */
export function buildChatCompletionCreateParams(p) {
  const model = resolveWriterModel(p.model);
  const { messages, temperature, maxTokens, responseFormat } = p;
  const body = {
    model,
    input: Array.isArray(messages) ? messages : [],
    max_output_tokens: maxTokens ?? 4500,
    store: p.store ?? false,
  };
  if (temperature != null && supportsCustomTemperature(model)) {
    body.temperature = temperature;
  }
  const format = mapResponseFormat(responseFormat);
  if (format) {
    body.text = { format };
  }
  return body;
}
