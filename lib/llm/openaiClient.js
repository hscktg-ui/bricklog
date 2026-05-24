/**
 * GPT 채팅 완성 — OpenAI SDK (환경변수 OPENAI_API_KEY)
 */
import { getOpenAIModel } from "./llmProvider";
import { getOpenAIClient } from "./openaiSdk";

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

  const model = options.model || getOpenAIModel();

  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.72,
      max_tokens: options.maxTokens ?? 4500,
      response_format: { type: "json_object" },
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) throw new Error("OPENAI_EMPTY_RESPONSE");
    return content;
  } catch (err) {
    throw sanitizeError(err);
  }
}
