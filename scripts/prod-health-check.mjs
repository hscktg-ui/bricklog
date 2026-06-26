/**
 * Prod 서버 상태 점검 — HTTP·엔진·결제·공개 API
 * Run: npm run test:prod-health
 * Env: BASE_URL (default https://briclog.ai)
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "artifacts", "prod-health", "latest-summary.json");

async function probe(name, url, opts = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(opts.timeoutMs || 25_000),
      ...opts.fetch,
    });
    let json = null;
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) {
      try {
        json = await res.json();
      } catch {
        /* ignore */
      }
    }
    const ok = opts.requireOk ? res.ok : res.status < 500 || res.status === 503;
    return {
      name,
      ok,
      status: res.status,
      ms: Date.now() - started,
      snippet: json ? JSON.stringify(json).slice(0, 160) : null,
      detail: opts.pick?.(json) ?? null,
    };
  } catch (err) {
    return {
      name,
      ok: false,
      ms: Date.now() - started,
      error: err?.message || String(err),
    };
  }
}

async function main() {
  const checks = await Promise.all([
    probe("home", `${BASE}/`, { requireOk: true }),
    probe("launch_flags", `${BASE}/api/launch/flags`, {
      requireOk: true,
      pick: (j) => j?.product?.identity,
    }),
    probe("billing_status", `${BASE}/api/billing/status`, {
      requireOk: true,
      pick: (j) => ({
        provider: j?.billing?.providerLabel,
        checkout: j?.billing?.checkoutEnabled,
        inicisReview: j?.billing?.inicisReview,
        paymentStatus: j?.billing?.paymentStatus,
      }),
    }),
    probe("engine_status", `${BASE}/api/public/engine-status`, {
      requireOk: false,
      pick: (j) => ({
        ok: j?.ok,
        stale: j?.stale,
        cron: j?.cron?.secretConfigured,
        memory: j?.memory?.serviceRole,
      }),
    }),
    probe("public_stats", `${BASE}/api/public/stats`, { requireOk: true }),
    probe("manifest", `${BASE}/manifest.webmanifest`, { requireOk: true }),
  ]);

  const failed = checks.filter((c) => !c.ok);
  const summary = {
    at: new Date().toISOString(),
    base: BASE,
    pass: failed.length === 0,
    total: checks.length,
    failed: failed.length,
    checks,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(summary, null, 2), "utf8");

  console.log(`\n=== PROD HEALTH (${BASE}) ===\n`);
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"} ${c.name} ${c.status ?? ""} ${c.ms}ms`);
    if (c.detail) console.log("  ", JSON.stringify(c.detail));
    if (c.error) console.log("  ", c.error);
  }
  console.log(`\nReport: ${OUT}`);
  if (!summary.pass) process.exit(1);
}

main();
