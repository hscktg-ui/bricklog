/**
 * OpenAI 연결 확인 — Writer gpt-5.5 고정
 * node --env-file=.env.local scripts/verify-openai.mjs
 */
import OpenAI from "openai";
import {
  OPENAI_WRITER_MODEL,
  buildChatCompletionCreateParams,
  resolveWriterModel,
} from "../lib/llm/openaiCompletionParams.js";
import { isGpt55WriterDominant } from "../lib/llm/llmProvider.js";

const key = (process.env.OPENAI_API_KEY || "").trim();
const configured = key.length >= 20 && key.startsWith("sk-");

console.log("OPENAI_API_KEY present:", configured);
if (!configured) {
  process.exit(1);
}

const model = resolveWriterModel();
console.log("OPENAI_WRITER_MODEL (locked):", model);
console.log("gpt55Dominant:", isGpt55WriterDominant());
console.log("matches SSOT:", model === OPENAI_WRITER_MODEL);

if (process.env.OPENAI_MODEL && process.env.OPENAI_MODEL !== OPENAI_WRITER_MODEL) {
  console.log(
    "note: OPENAI_MODEL env ignored unless gpt-5.5* — env was:",
    process.env.OPENAI_MODEL
  );
}

const client = new OpenAI({ apiKey: key, timeout: 30000, maxRetries: 1 });

try {
  const res = await client.chat.completions.create(
    buildChatCompletionCreateParams({
      model,
      messages: [{ role: "user", content: 'Reply JSON only: {"ok":true}' }],
      maxTokens: 64,
      responseFormat: { type: "json_object" },
    })
  );
  const hasContent = !!res.choices?.[0]?.message?.content;
  console.log("OpenAI SDK chat:", hasContent ? "ok" : "empty");
  console.log("Resolved model:", res.model || model);
  process.exit(hasContent && model === OPENAI_WRITER_MODEL ? 0 : 2);
} catch (e) {
  const msg = String(e?.message || e).replace(/sk-[a-zA-Z0-9._-]+/g, "[REDACTED]");
  console.error("OpenAI SDK error:", msg.slice(0, 280));
  process.exit(3);
}
