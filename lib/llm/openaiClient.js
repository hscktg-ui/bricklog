/**
 * GPT 채팅 완성 — OpenAI SDK (환경변수 OPENAI_API_KEY)
 */
import { getOpenAIModel, resolveWriterModel } from "./llmProvider";
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
      const completion = await client.chat.completions.create(
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

      const choice = completion.choices?.[0];
      const content = choice?.message?.content;
      if (content?.trim()) return content;

      lastErr = new Error("OPENAI_EMPTY_RESPONSE");
      lastErr.finishReason = choice?.finish_reason || "empty";
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
