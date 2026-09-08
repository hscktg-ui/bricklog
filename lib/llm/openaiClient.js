/**
 * GPT 채팅 완성 — OpenAI SDK (환경변수 OPENAI_API_KEY)
 */
import { resolveWriterModel } from "./llmProvider";
import { getOpenAIClient } from "./openaiSdk";
import { buildChatCompletionCreateParams } from "./openaiCompletionParams";

function redactSecrets(text) {
  return String(text || "").replace(/sk-[a-zA-Z0-9._-]{8,}/g, "[REDACTED]");
}

function sanitizeError(err) {
  const msg = redactSecrets(err?.message || String(err));
  const safe = new Error(msg);
  if (err?.status) safe.status = err.status;
  if (err?.code) safe.code = err.code;
  return safe;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractResponseText(response) {
  const direct = response?.output_text;
  if (typeof direct === "string" && direct.trim()) return direct;

  for (const item of response?.output || []) {
    if (item?.type !== "message") continue;
    for (const content of item.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string" && content.text.trim()) {
        return content.text;
      }
    }
  }
  return "";
}

/**
 * @param {Array<{role: string, content: string}>} messages
 * @param {Object} [options]
 * @returns {Promise<string>}
 */
export async function callOpenAIChat(messages, options = {}) {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const model = resolveWriterModel(options.model);
  const maxAttempts = Math.min(4, Math.max(1, Number(options.emptyRetries ?? 3) || 3));
  let lastErr = null;
  let maxTokens = options.maxTokens ?? 4500;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await client.responses.create(
        buildChatCompletionCreateParams({
          model,
          messages,
          temperature: options.temperature ?? 0.72,
          maxTokens,
          responseFormat:
            options.responseFormat === null
              ? undefined
              : options.responseFormat || { type: "json_object" },
        })
      );

      const content = extractResponseText(response);
      if (content?.trim()) return content;

      lastErr = new Error("OPENAI_EMPTY_RESPONSE");
      lastErr.finishReason =
        response?.incomplete_details?.reason || response?.status || "empty";
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || err);
      const retryable =
        /OPENAI_EMPTY_RESPONSE|429|rate.?limit|timeout|ECONNRESET|ETIMEDOUT/i.test(msg);
      if (!retryable || attempt >= maxAttempts - 1) {
        throw sanitizeError(err);
      }
    }

    if (attempt < maxAttempts - 1) {
      await sleep(900 * (attempt + 1));
      maxTokens = Math.min(maxTokens + 900, 8000);
    }
  }

  throw sanitizeError(lastErr || new Error("OPENAI_EMPTY_RESPONSE"));
}
