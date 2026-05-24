import { getOpenAIModel } from "./llmProvider";
import { getOpenAIClient } from "./openaiSdk";

function redactSecrets(text) {
  return String(text || "").replace(/sk-[a-zA-Z0-9._-]{8,}/g, "[REDACTED]");
}

/**
 * 고객지원용 일반 텍스트 응답 (JSON 강제 없음)
 */
export async function callOpenAIAssistant(messages, options = {}) {
  const client = getOpenAIClient();
  if (!client) throw new Error("OPENAI_NOT_CONFIGURED");

  const model = options.model || getOpenAIModel();
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.45,
    max_tokens: options.maxTokens ?? 700,
  });

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OPENAI_EMPTY_RESPONSE");
  return redactSecrets(content);
}
