import {
  buildChatCompletionCreateParams,
  resolveWriterModel,
} from "./openaiCompletionParams";
import { getOpenAIClient } from "./openaiSdk";

function redactSecrets(text) {
  return String(text || "").replace(/sk-[a-zA-Z0-9._-]{8,}/g, "[REDACTED]");
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
 * 고객지원용 일반 텍스트 응답 (JSON 강제 없음)
 */
export async function callOpenAIAssistant(messages, options = {}) {
  const client = getOpenAIClient();
  if (!client) throw new Error("OPENAI_NOT_CONFIGURED");

  const model = resolveWriterModel(options.model);
  const response = await client.responses.create(
    buildChatCompletionCreateParams({
      model,
      messages,
      temperature: options.temperature ?? 0.45,
      maxTokens: options.maxTokens ?? 1200,
    })
  );

  const content = extractResponseText(response).trim();
  if (!content) throw new Error("OPENAI_EMPTY_RESPONSE");
  return redactSecrets(content);
}
