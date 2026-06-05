/**
 * Gemini API 연결 진단 — npm run check:gemini
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isGeminiConfigured } from "../lib/content/contentIntelligenceV12.js";

const root = join(import.meta.dirname, "..");
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]] != null) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}
import { useGeminiResearchProvider } from "../lib/config/briclogFastPipeline.js";
import { runGeminiResearchPack } from "../lib/llm/geminiResearchPack.js";

const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "").trim();
const masked = key ? `${key.slice(0, 8)}…${key.slice(-4)}` : "(없음)";

console.log("GEMINI_API_KEY:", masked);
console.log("isGeminiConfigured:", isGeminiConfigured());
console.log("useGeminiResearchProvider:", useGeminiResearchProvider());
console.log("GEMINI_MODEL:", process.env.GEMINI_MODEL || "gemini-2.5-flash (default)");

if (!isGeminiConfigured()) {
  console.log("\n❌ 키가 없거나 형식이 맞지 않습니다.");
  console.log("   .env.local 에 GEMINI_API_KEY=AIza... (20자 이상) 를 넣고 dev 서버를 재시작하세요.");
  process.exit(1);
}

const probe = await runGeminiResearchPack({
  system: 'Return JSON: {"summary":"ok","researchStatus":"ok","researchFacts":[]}',
  user: "브랜드 템퍼 · 지역 평택 · 주제 모션베드 — 1문장 요약만",
  brandContext: {},
});

if (probe.ok) {
  console.log("\n✅ Gemini 조사 API 응답 OK");
  console.log("   writerOutline:", probe.writerOutline?.length || 0, "items");
  process.exit(0);
}

console.log("\n❌ Gemini 호출 실패");
console.log("   reason:", probe.reason || "unknown");
if (probe.detail) console.log("   detail:", probe.detail);
console.log("\n   모델·키·Generative Language API 활성화를 Google AI Studio에서 확인하세요.");
process.exit(1);
