/**
 * BRICLOG Phase Gate — 배포 전 자동 회귀 (야간 런)
 * Run: npm run test:phase-gate
 * Prod: $env:BASE_URL='https://briclog.ai'; npm run test:phase-gate:prod
 */
import { spawnSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const OUT = join(root, "artifacts", "overnight-phase-gate", "latest-summary.json");
/** --prod only (ignore shell PHASE_GATE_PROD leak from overnight:growth) */
const PROD = process.argv.includes("--prod");

const STEPS = [
  { phase: 0, id: "briclog-defaults", cmd: "npm", args: ["run", "test:briclog-defaults"] },
  { phase: 0, id: "launch-publish-mode", cmd: "npm", args: ["run", "test:launch-publish-mode"] },
  { phase: 0, id: "all-channel-sla", cmd: "npm", args: ["run", "test:all-channel-sla"] },
  { phase: 0, id: "blog-async-job", cmd: "npm", args: ["run", "test:blog-async-job"] },
  { phase: 1, id: "content-history-ssot", cmd: "npm", args: ["run", "test:content-history-ssot"] },
  { phase: 1, id: "quality-leap-finish", cmd: "npm", args: ["run", "test:quality-leap-finish"] },
  { phase: 1, id: "core-rules", cmd: "npm", args: ["run", "test:core-rules"] },
  { phase: 1, id: "unified-pass-min", cmd: "npm", args: ["run", "test:unified-pass-min"] },
  { phase: 1, id: "unified-delivery-gate", cmd: "npm", args: ["run", "test:unified-delivery-gate"] },
  { phase: 2, id: "publish-ready-kpi", cmd: "npm", args: ["run", "test:publish-ready-kpi"] },
  { phase: 2, id: "ui-delivery-smoke", cmd: "npm", args: ["run", "test:ui-delivery-smoke"] },
  { phase: 2, id: "writer-first-delivery", cmd: "npm", args: ["run", "test:writer-first-delivery"] },
];

const PROD_STEPS = [
  { phase: 2, id: "prod-http", fn: probeProd },
  { phase: 2, id: "probe-async-signup-sla", cmd: "npm", args: ["run", "test:probe-async-signup-sla"] },
  { phase: 2, id: "product-score", cmd: "npm", args: ["run", "test:product-score:prod"] },
];

async function probeProd() {
  const base = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
  const urls = [
    { path: "/", requireOk: true },
    { path: "/api/launch/flags", requireOk: true },
    { path: "/api/public/engine-status", requireOk: false },
  ];
  for (const { path, requireOk } of urls) {
    const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(20_000) });
    if (requireOk && !res.ok) throw new Error(`${path} HTTP ${res.status}`);
    if (!requireOk && res.status >= 500 && res.status !== 503) {
      throw new Error(`${path} HTTP ${res.status}`);
    }
  }
  return { ok: true, base };
}

function runStep(step) {
  const started = Date.now();
  if (step.fn) {
    return step.fn().then(
      () => ({ ...step, ok: true, ms: Date.now() - started }),
      (err) => ({
        ...step,
        ok: false,
        ms: Date.now() - started,
        error: err?.message || String(err),
      })
    );
  }
  const r = spawnSync(step.cmd, step.args, {
    cwd: root,
    shell: process.platform === "win32",
    encoding: "utf8",
    env: process.env,
    stdio: "pipe",
  });
  return {
    ...step,
    ok: r.status === 0,
    ms: Date.now() - started,
    exitCode: r.status,
    stderr: (r.stderr || "").slice(-800),
  };
}

const allSteps = PROD ? [...STEPS, ...PROD_STEPS] : STEPS;
const results = [];

console.log(`\n=== BRICLOG Phase Gate (${PROD ? "prod" : "local"}) ===\n`);

for (const step of allSteps) {
  process.stdout.write(`  [phase ${step.phase}] ${step.id} ... `);
  const result = await runStep(step);
  results.push(result);
  console.log(result.ok ? `PASS ${result.ms}ms` : `FAIL ${result.error || result.exitCode}`);
}

const failed = results.filter((r) => !r.ok);
const summary = {
  at: new Date().toISOString(),
  prod: PROD,
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  failed: failed.length,
  pass: failed.length === 0,
  results,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(summary, null, 2), "utf8");
console.log(`\nreport: ${OUT}`);
console.log(`passed ${summary.passed}/${summary.total}`);

if (!summary.pass) {
  console.error("\nFAIL: phase gate");
  process.exit(1);
}
console.log("\nPASS: phase-gate");
