/**
 * 티카페 — 프로덕션 API 생성
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");

try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}
applyE2eTestCredentialsToEnv(process.env);

const INPUT = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴와 다실 분위기",
  mainKeyword: "경주 티카페",
  industry: "티카페",
  blogLengthTier: "medium",
  writingSkillLevel: "civilian",
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  researchEnabled: true,
  researchMode: "v2_axis",
  skipAutoPipeline: true,
};

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth failed", auth.reason);
  process.exit(1);
}

const t0 = Date.now();
const res = await fetch(`${BASE}/api/content/blog`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.token}`,
  },
  body: JSON.stringify(INPUT),
});
const body = await res.json();
const pack = body.blogContent || {};
const full = getBlogFullText(pack);
const meta = {
  httpStatus: res.status,
  elapsedMs: Date.now() - t0,
  ok: body.ok,
  withheld: body.withheld,
  mode: body.mode,
  userMessage: body.userMessage,
  goldenScore: pack._meta?.goldenGate?.score,
  goldenVerdict: pack._meta?.goldenGate?.verdict,
  publishReady: pack._meta?.publishReady,
  chars: full.replace(/\s/g, "").length,
  sections: pack.sections?.length,
};

const outDir = join(root, "artifacts", "probe-tea-cafe");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "meta-prod.json"), JSON.stringify({ meta, input: INPUT }, null, 2), "utf8");
writeFileSync(join(outDir, "article-prod.md"), full, "utf8");

console.log(JSON.stringify(meta, null, 2));
console.log("\n--- ARTICLE ---\n");
console.log(full);
