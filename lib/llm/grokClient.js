/**
 * Grok (xAI) — 상세 아트디렉터·비전 검수.
 * 글 작성은 GPT-5.6 Sol. Grok은 화면·컷만.
 */
import OpenAI from "openai";

const PLACEHOLDER = /^(your_|xxx|test|placeholder)/i;

export const GROK_ART_MODEL = "grok-4";
export const GROK_VISION_MODEL = "grok-2-vision-1212";

function grokKey() {
  if (typeof process === "undefined") return "";
  return (
    process.env.XAI_API_KEY ||
    process.env.GROK_API_KEY ||
    ""
  ).trim();
}

export function isGrokConfigured() {
  const key = grokKey();
  if (key.length < 20) return false;
  if (PLACEHOLDER.test(key)) return false;
  return true;
}

let cached = null;

export function getGrokClient() {
  if (!isGrokConfigured()) return null;
  if (cached) return cached;
  cached = new OpenAI({
    apiKey: grokKey(),
    baseURL: "https://api.x.ai/v1",
  });
  return cached;
}

function redact(err) {
  const msg = String(err?.message || err || "").replace(
    /xai-[a-zA-Z0-9._-]{8,}|gsk_[a-zA-Z0-9._-]{8,}/g,
    "[REDACTED]"
  );
  const safe = new Error(msg);
  if (err?.status) safe.status = err.status;
  return safe;
}

/**
 * @param {Array<{role: string, content: string|object}>} messages
 * @param {object} [options]
 */
export async function callGrokChat(messages, options = {}) {
  const client = getGrokClient();
  if (!client) throw new Error("GROK_NOT_CONFIGURED");
  const model = options.model || GROK_ART_MODEL;
  try {
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1800,
      response_format:
        options.responseFormat === null
          ? undefined
          : options.responseFormat || { type: "json_object" },
    });
    const content = completion.choices?.[0]?.message?.content;
    if (!content?.trim()) throw new Error("GROK_EMPTY_RESPONSE");
    return content;
  } catch (err) {
    throw redact(err);
  }
}
