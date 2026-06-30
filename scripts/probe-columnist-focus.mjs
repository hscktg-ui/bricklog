/**
 * Columnist 집중 분석 — 매트리스·인테리어·미용실 (prod)
 */
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { applySimpleWorkspaceDefaults } from "../lib/product/simpleWorkspaceDefaults.js";
import { getCustomerBlogSlaMs } from "../lib/config/briclogDefaults.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "artifacts", "columnist-focus", "latest.json");

const SCENARIOS = [
  {
    id: "mattress",
    raw: {
      brandName: "금성침대",
      region: "김포",
      topic: "김포 가구단지 매트리스 추천",
      industry: "침대·매트리스",
      storeFeatures: "매트리스 체험존·모션베드 시연·무이자 할부·배송 설치",
      blogLengthTier: "short",
    },
  },
  {
    id: "interior",
    raw: {
      brandName: "우드앤라이트",
      region: "판교",
      topic: "거실 리모델링 상담",
      industry: "인테리어",
      storeFeatures: "3D 설계·맞춤 상담·조명·수납",
      blogLengthTier: "short",
    },
  },
  {
    id: "salon",
    raw: {
      brandName: "레이어드살롱",
      region: "서울 홍대",
      topic: "5월 컬러 이벤트",
      industry: "미용실",
      storeFeatures: "시즌 컬러·두피 케어·디자이너 상담",
      blogLengthTier: "short",
    },
  },
];

try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}
applyE2eTestCredentialsToEnv(process.env);

const GAP = Math.max(0, Number(process.env.PROBE_BATCH_GAP_MS) || 20_000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function research(fv, token) {
  const res = await fetch(`${BASE}/api/content/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      researchQuery: `${fv.brandName} ${fv.topic}`,
      researchTypes: fv.researchTypes || ["latest", "local", "keyword", "trend"],
      researchMode: "v2_axis",
      brandName: fv.brandName,
      region: fv.region,
      industry: fv.industry,
      topic: fv.topic,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  return res.json();
}

const auth = await getE2eBearerToken();
if (!auth.ok) process.exit(1);

mkdirSync(dirname(OUT), { recursive: true });
const results = [];

for (const scenario of SCENARIOS) {
  let input = applySimpleWorkspaceDefaults(
    mergeWorkspaceBrandIntoInput({
      ...scenario.raw,
      researchEnabled: true,
      skipAutoPipeline: true,
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    })
  );
  const axis = await applyV2AxisResearch({
    pipelineInput: input,
    generateResearchAsync: (fv) => research(fv, auth.token),
    onStep: (s) => process.stdout.write(`  [${scenario.id}] ${s}\n`),
  });
  if (!axis.ok) {
    results.push({ id: scenario.id, pass: false, error: axis.userMessage });
    continue;
  }
  input = axis.input;
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/content/blog`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify(slimBlogApiPayload(input)),
    signal: AbortSignal.timeout(180_000),
  });
  const body = await res.json();
  results.push({
    id: scenario.id,
    pass: Boolean(body.blogContent?.sections?.length && !body.withheld),
    ms: Date.now() - t0,
    mode: body.mode,
    apiStatus: res.status,
    columnistSlowFallback: body.meta?.columnistSlowFallback,
    diagnostic: body.meta?.columnistFailDiagnostic,
    userMessage: body.userMessage,
  });
  console.log(
    `${results.at(-1).pass ? "✓" : "✗"} ${scenario.id} ${body.mode} slow=${body.meta?.columnistSlowFallback} code=${body.meta?.columnistFailDiagnostic?.code || "—"}\n`
  );
  if (GAP > 0) await sleep(GAP);
}

writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify({ pass: results.filter((r) => r.pass).length, total: results.length }));
