/**
 * Research Stack A 진단 — npm run check:research-stack
 * 로컬: .env.local 로드 · prod: BRICLOG_BASE_URL=https://briclog.ai
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getResearchStackAStatus } from "../lib/config/researchStackA.js";
import { isGeminiConfigured } from "../lib/content/contentIntelligenceV12.js";
import { useGeminiResearchProvider } from "../lib/config/briclogFastPipeline.js";
import { isNaverSearchConfigured } from "../lib/research/searchSources/naverSearch.js";

const root = join(import.meta.dirname, "..");
const envPath = join(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]] != null) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}

const base = (process.env.BRICLOG_BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const local = getResearchStackAStatus();

console.log("=== Research Stack A (local env) ===");
console.log(JSON.stringify(local, null, 2));
console.log("useGeminiResearchProvider:", useGeminiResearchProvider());
console.log("naver configured:", isNaverSearchConfigured());
console.log("gemini configured:", isGeminiConfigured());

let remote = null;
try {
  const res = await fetch(`${base}/api/content/status`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (res.ok) {
    remote = await res.json();
    console.log("\n=== Prod /api/content/status ===");
    console.log(
      JSON.stringify(
        {
          geminiConfigured: remote.geminiConfigured,
          geminiResearchEnabled: remote.geminiResearchEnabled,
          researchStackA: remote.researchStackA,
          openaiSdk: remote.openaiSdk,
        },
        null,
        2
      )
    );
  }
} catch (err) {
  console.warn("\n원격 상태 조회 실패:", err.message);
}

const gaps = [];
if (!local.naver) gaps.push("NAVER_CLIENT_ID + NAVER_CLIENT_SECRET");
if (!local.gemini) gaps.push("GEMINI_API_KEY (AIza…)");
if (!local.cseConfigured) {
  gaps.push("GOOGLE_CSE_API_KEY + GOOGLE_CSE_CX (선택 — 공식자료 보조)");
}

if (gaps.length) {
  console.log("\n⚠ 로컬 env 갭:");
  for (const g of gaps) console.log("  -", g);
} else {
  console.log("\n✅ 로컬 Research Stack A 키 구성 OK");
}

if (remote?.researchStackA) {
  const r = remote.researchStackA;
  if (!r.naver || !r.gemini) {
    console.log("\n⚠ prod env — Vercel에 다음 설정 확인:");
    if (!r.naver) console.log("  - NAVER_CLIENT_ID / NAVER_CLIENT_SECRET");
    if (!r.gemini) console.log("  - GEMINI_API_KEY");
    if (!r.cseConfigured) console.log("  - GOOGLE_CSE_* (선택)");
    process.exitCode = 1;
  } else {
    console.log("\n✅ prod Research Stack A 활성");
  }
} else if (remote) {
  console.log("\n⚠ prod — researchStackA 필드 없음 (배포 후 재확인)");
}

const requiredGaps = gaps.filter((g) => !g.includes("선택"));
if (requiredGaps.length) {
  console.log("\n⚠ 로컬 필수 env 갭:", requiredGaps.join(", "));
  process.exitCode = 1;
}
