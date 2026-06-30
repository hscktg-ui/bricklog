/**
 * 신규 가입자 UX — 심플 4필드 · 1~2분 SLA prod 검증
 * Run: npm run test:probe-new-signup-sla
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
import { getBlogGenerationProbeTimeoutMs } from "../lib/config/briclogFastPipeline.js";
import { assessUnifiedBlogDelivery } from "../lib/product/unifiedDeliveryGate.js";
import { evaluateEditorGradeResearchGate } from "../lib/product/editorGradeResearchGate.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT_DIR = join(root, "artifacts", "new-signup-sla");
const SLA_MS = getCustomerBlogSlaMs();
const PROBE_TIMEOUT = getBlogGenerationProbeTimeoutMs();
const GAP_MS = Math.max(0, Number(process.env.PROBE_BATCH_GAP_MS) || 25_000);

const SCENARIOS = [
  {
    id: "cafe",
    label: "카페 · 신규 4필드",
    raw: {
      brandName: "산책카페",
      region: "전주 한옥마을",
      topic: "봄 시즌 브런치",
      industry: "카페",
      storeFeatures: "루프탑 뷰 · 수제 베이글 · 반려견 동반",
      blogLengthTier: "short",
    },
  },
  {
    id: "restaurant",
    label: "음식점 · 점심 특선",
    raw: {
      brandName: "한상차림",
      region: "강남",
      topic: "점심 특선 리뉴얼",
      industry: "음식점",
      storeFeatures: "점심 특선 9800원 · 단체석 · 예약",
      blogLengthTier: "short",
    },
  },
  {
    id: "salon",
    label: "미용실 · 시즌",
    raw: {
      brandName: "레이어드살롱",
      region: "홍대",
      topic: "5월 시즌 컬러",
      industry: "미용실",
      storeFeatures: "레이어드 컷 · 두피 케어 · 주차 2시간",
      blogLengthTier: "short",
    },
  },
  {
    id: "pension",
    label: "펜션 · 장박",
    raw: {
      brandName: "애월바다펜션",
      region: "제주 애월",
      topic: "비수기 장박 할인",
      industry: "펜션",
      storeFeatures: "오션뷰 · 바비큐 · 7박 할인",
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
process.env.BRICLOG_RESET_QUALITY = "true";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateResearchAsync(fv, token) {
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
      mainKeyword: fv.mainKeyword || fv.topic,
      topic: fv.topic,
    }),
    signal: AbortSignal.timeout(55_000),
  });
  return res.json();
}

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const report = {
  at: new Date().toISOString(),
  base: BASE,
  slaMs: SLA_MS,
  probeTimeoutMs: PROBE_TIMEOUT,
  persona: "new_signup_simple_workspace",
  results: [],
};

console.log(`\n=== 신규 가입자 SLA (${BASE}) sla=${SLA_MS}ms timeout=${PROBE_TIMEOUT}ms ===\n`);

for (const scenario of SCENARIOS) {
  let input = mergeWorkspaceBrandIntoInput({
    ...scenario.raw,
    researchEnabled: true,
    skipAutoPipeline: true,
    v2AxisRequired: true,
    v2PipelineEnforced: true,
    v3EngineEnforced: true,
  });
  input = applySimpleWorkspaceDefaults(input);

  const row = { id: scenario.id, label: scenario.label, v4Speaker: input.v4Speaker };
  const t0 = Date.now();

  try {
    const axis = await applyV2AxisResearch({
      pipelineInput: input,
      generateResearchAsync: (fv) => generateResearchAsync(fv, auth.token),
      onStep: (s) => process.stdout.write(`  [${scenario.id}] ${s}\n`),
    });
    if (!axis.ok) throw new Error(axis.userMessage || "research_failed");
    Object.assign(input, axis.input);

    const gate = evaluateEditorGradeResearchGate(input);
    row.editorGate = { ok: gate.ok, count: gate.substantiveCount, min: gate.minRequired };

    const res = await fetch(`${BASE}/api/content/blog`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
      body: JSON.stringify(slimBlogApiPayload(input)),
      signal: AbortSignal.timeout(PROBE_TIMEOUT),
    });
    const body = await res.json();
    row.ms = Date.now() - t0;
    row.slaOk = row.ms <= SLA_MS;
    row.apiStatus = res.status;
    row.mode = body.mode;
    row.columnistSlowFallback = Boolean(body.meta?.columnistSlowFallback);
    row.deliveryValue = Boolean(body.meta?.deliveryValue || body.blogContent?._meta?.deliveryValueExposure);

    if (body.withheld || !body.blogContent?.sections?.length) {
      row.pass = false;
      row.error = body.userMessage || body.mode;
      row.columnistFailDiagnostic = body.meta?.columnistFailDiagnostic || null;
      report.results.push(row);
      console.log(`✗ ${scenario.label}: ${row.error} (${row.ms}ms sla=${row.slaOk ? "OK" : "SLOW"})\n`);
      if (GAP_MS > 0) await sleep(GAP_MS);
      continue;
    }

    const pack = body.blogContent;
    const unified = assessUnifiedBlogDelivery(pack, input);
    row.pass = unified.pass && row.slaOk;
    row.unified = { pass: unified.pass, reasons: unified.reasons };
    row.benchmark = unified.benchmark;
    report.results.push(row);

    const mark = row.pass ? "✓" : row.slaOk ? "△" : "✗";
    console.log(
      `${mark} ${scenario.label}: ${row.ms}ms sla=${row.slaOk ? "OK" : "SLOW"} unified=${unified.pass} slow-fb=${row.columnistSlowFallback} deliveryValue=${row.deliveryValue}\n`
    );
  } catch (err) {
    row.ms = Date.now() - t0;
    row.pass = false;
    row.slaOk = row.ms <= SLA_MS;
    row.error = err.message;
    report.results.push(row);
    console.log(`✗ ${scenario.label}: ${err.message}\n`);
  }
  if (GAP_MS > 0) await sleep(GAP_MS);
}

const passed = report.results.filter((r) => r.pass).length;
const slaPass = report.results.filter((r) => r.slaOk).length;
const avgMs = Math.round(
  report.results.reduce((s, r) => s + (r.ms || 0), 0) / Math.max(1, report.results.length)
);

report.summary = {
  total: report.results.length,
  pass: passed,
  passRate: Math.round((passed / report.results.length) * 1000) / 10,
  slaPass,
  slaPassRate: Math.round((slaPass / report.results.length) * 1000) / 10,
  avgMs,
  slowFallbackCount: report.results.filter((r) => r.columnistSlowFallback).length,
};

writeFileSync(join(OUT_DIR, "latest.json"), JSON.stringify(report, null, 2), "utf8");
writeFileSync(join(OUT_DIR, "latest-summary.json"), JSON.stringify(report.summary, null, 2), "utf8");

console.log("=== SUMMARY ===");
console.log(JSON.stringify(report.summary, null, 2));
process.exit(passed >= 3 && slaPass >= 3 ? 0 : 1);
