/**
 * OpenAI 연결 확인 — 키 값 출력 금지
 * 실행: node --env-file=.env.local scripts/verify-openai.mjs
 */
import OpenAI from "openai";

const key = (process.env.OPENAI_API_KEY || "").trim();
const configured = key.length >= 20 && key.startsWith("sk-");

console.log("OPENAI_API_KEY present:", configured);
if (!configured) {
  process.exit(1);
}

const client = new OpenAI({ apiKey: key, timeout: 30000, maxRetries: 1 });
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

try {
  const res = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: 'Reply JSON only: {"ok":true}' }],
    max_tokens: 16,
    response_format: { type: "json_object" },
  });
  const hasContent = !!res.choices?.[0]?.message?.content;
  console.log("OpenAI SDK chat:", hasContent ? "ok" : "empty");
  process.exit(hasContent ? 0 : 2);
} catch (e) {
  const msg = String(e?.message || e).replace(/sk-[a-zA-Z0-9._-]+/g, "[REDACTED]");
  console.error("OpenAI SDK error:", msg.slice(0, 200));
  process.exit(3);
}
