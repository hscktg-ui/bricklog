/**
 * 야간 품질·성장 오케스트레이터 — 페이즈 게이트·배치·회귀·커밋·배포 반복
 * Run: npm run overnight:growth  (alias: overnight:improvement)
 *
 * Env:
 *   OVERNIGHT_DURATION_MS — 전체 실행 시간 (default 8h)
 *   OVERNIGHT_CYCLE_MS — 사이클 간격 (default 30m)
 *   BRICLOG_PERSONA_LIMIT — thousand-feedback 건수 (default 120)
 *   OVERNIGHT_SKIP_DEPLOY=1 — 배포 생략
 *   OVERNIGHT_PROD_GATE=1 — 4사이클마다 prod phase-gate (default 1)
 *   BASE_URL — prod gate 대상 (default https://briclog.ai)
 */
import { spawnSync } from "child_process";
import { execSync } from "child_process";
import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GROWTH_DIR = join(ROOT, "artifacts", "overnight-growth");
const GROWTH_LOG = join(GROWTH_DIR, "growth-log.jsonl");
const GROWTH_SUMMARY = join(GROWTH_DIR, "latest-summary.json");
const DURATION_MS = Number(process.env.OVERNIGHT_DURATION_MS || 8 * 60 * 60 * 1000);
const CYCLE_MS = Number(process.env.OVERNIGHT_CYCLE_MS || 30 * 60 * 1000);
const SKIP_DEPLOY = process.env.OVERNIGHT_SKIP_DEPLOY === "1";
const PROD_GATE = process.env.OVERNIGHT_PROD_GATE !== "0";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(label, command, args = [], envExtra = {}) {
  console.log(`\n[overnight] ▶ ${label}`);
  console.log(`[overnight]   ${command} ${args.join(" ")}`);
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      ...envExtra,
      BRICLOG_PERSONA_LIMIT: envExtra.BRICLOG_PERSONA_LIMIT || process.env.BRICLOG_PERSONA_LIMIT || "120",
      BRICLOG_PERSONA_CONCURRENCY: process.env.BRICLOG_PERSONA_CONCURRENCY || "16",
    },
  });
  const ok = result.status === 0;
  console.log(
    `[overnight] ${ok ? "✓" : "✗"} ${label} (${Math.round((Date.now() - started) / 1000)}s)`
  );
  return ok;
}

function gitPorcelain() {
  try {
    return execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" });
  } catch {
    return "";
  }
}

function hasCodeChanges() {
  return gitPorcelain()
    .split("\n")
    .filter(Boolean)
    .some((line) => {
      const path = line.slice(3).trim().replace(/^"\/?|"\/?$/g, "");
      return /^(lib|app|components|scripts|package\.json)/.test(path);
    });
}

function gitCommit(message) {
  execSync(
    `git -c user.name="briclog-bot" -c user.email="dev@briclog.ai" commit -m "${message.replace(/"/g, '\\"')}"`,
    { cwd: ROOT, stdio: "inherit" }
  );
}

function commitAndDeploy(cycle) {
  if (!hasCodeChanges()) {
    console.log("[overnight] no code changes — skip commit");
    return;
  }
  console.log("[overnight] committing code changes…");
  execSync("git add lib app components scripts package.json", { cwd: ROOT, stdio: "inherit" });
  const msg = `Overnight cycle ${cycle}: batch-driven quality improvements.`;
  gitCommit(msg);
  execSync("git push origin main", { cwd: ROOT, stdio: "inherit" });
  if (!SKIP_DEPLOY) {
    run("deploy:vercel", "npm", ["run", "deploy:vercel"]);
  }
}

function readJsonSafe(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function readProductScore() {
  const data = readJsonSafe(join(ROOT, "config", "product-readiness-score.json"));
  if (!data) return null;
  return {
    score: data.score ?? data.totalScore,
    band: data.band ?? data.productionBand,
    publishReady: data.publishReadyRate ?? data.kpis?.publishReadyRate,
  };
}

function readPhaseGateSummary() {
  const data = readJsonSafe(join(ROOT, "artifacts", "overnight-phase-gate", "latest-summary.json"));
  if (!data) return null;
  return {
    pass: data.pass ?? data.passed,
    total: data.total ?? data.steps?.length,
    failed: data.failed,
  };
}

function appendGrowthLog(entry) {
  mkdirSync(GROWTH_DIR, { recursive: true });
  appendFileSync(GROWTH_LOG, `${JSON.stringify(entry)}\n`, "utf8");
}

function writeGrowthSummary(payload) {
  mkdirSync(GROWTH_DIR, { recursive: true });
  writeFileSync(GROWTH_SUMMARY, JSON.stringify(payload, null, 2), "utf8");
}

function readThousandSummary() {
  try {
    const path = join(ROOT, "artifacts", "thousand-persona-batch", "latest-summary.json");
    if (!existsSync(path)) return null;
    const data = JSON.parse(readFileSync(path, "utf8"));
    const s = data.summary || data;
    return {
      publishReady: s.publishReady,
      total: s.total,
      humanVoiceMet: s.humanVoiceMet,
      avgChars: s.avgChars,
      regionColumnOkRate: s.regionColumnOkRate,
      avgRegionMentions: s.avgRegionMentions,
      regionOverCap: s.regionOverCap,
      flowerPublishReady: s.byIndustry?.flower?.publishReady,
      flowerTotal: s.byIndustry?.flower?.n,
    };
  } catch {
    return null;
  }
}

const startedAt = Date.now();
let cycle = 0;

console.log("=== BRICLOG OVERNIGHT GROWTH ===");
console.log(
  `Duration: ${Math.round(DURATION_MS / 3600000)}h · Cycle: ${Math.round(CYCLE_MS / 60000)}m · Prod gate: ${PROD_GATE ? "on" : "off"} · Started: ${new Date().toISOString()}`
);
mkdirSync(GROWTH_DIR, { recursive: true });

while (Date.now() - startedAt < DURATION_MS) {
  cycle += 1;
  const cycleStarted = Date.now();
  console.log(`\n========== CYCLE ${cycle} ${new Date().toLocaleString("ko-KR")} ==========`);

  run("test:phase-gate", "npm", ["run", "test:phase-gate"]);
  if (PROD_GATE && cycle % 4 === 0) {
    run("test:phase-gate:prod", "npm", ["run", "test:phase-gate:prod"], {
      BASE_URL: process.env.BASE_URL || "https://briclog.ai",
    });
  }
  run("test:product-score", "npm", ["run", "test:product-score"]);
  run("test:publish-ready-kpi", "npm", ["run", "test:publish-ready-kpi"]);

  run("test:channel-sqv-delivery", "npm", ["run", "test:channel-sqv-delivery"]);
  run("test:sqv-user-display", "npm", ["run", "test:sqv-user-display"]);
  run("test:core-rules", "npm", ["run", "test:core-rules"]);
  run("test:mission-prose", "npm", ["run", "test:mission-prose"]);
  run("test:region-column-naturalize", "npm", ["run", "test:region-column-naturalize"]);
  run("test:research-heavy-delivery", "npm", ["run", "test:research-heavy-delivery"]);
  run("test:flower-persona-publish", "npm", ["run", "test:flower-persona-publish"]);
  run("test:checklist-heading-sanitize", "npm", ["run", "test:checklist-heading-sanitize"]);
  run("test:hard-placeholder-signal", "npm", ["run", "test:hard-placeholder-signal"]);
  run("test:blog-api-delivery-gate", "npm", ["run", "test:blog-api-delivery-gate"]);
  run("mission:batch", "npm", ["run", "mission:batch"]);
  run("thousand-feedback", "npm", ["run", "run:thousand-feedback"]);

  const summary = readThousandSummary();
  if (summary) {
    console.log("[overnight] thousand-summary:", summary);
  }

  if (cycle % 2 === 0) {
    run("cross-channel-batch", "npm", ["run", "test:cross-channel-batch"]);
  }
  if (cycle % 3 === 0) {
    run("overnight-quality", "npm", ["run", "test:overnight-quality"]);
    run("overnight-category-long", "npm", ["run", "test:overnight-category-long"]);
  }

  try {
    commitAndDeploy(cycle);
  } catch (err) {
    console.error("[overnight] commit/deploy failed:", err?.message || err);
  }

  const cycleRecord = {
    cycle,
    at: new Date().toISOString(),
    durationMs: Date.now() - cycleStarted,
    phaseGate: readPhaseGateSummary(),
    productScore: readProductScore(),
    thousand: summary,
  };
  appendGrowthLog(cycleRecord);
  writeGrowthSummary({
    lastCycle: cycle,
    startedAt: new Date(startedAt).toISOString(),
    updatedAt: cycleRecord.at,
    cyclesCompleted: cycle,
    latest: cycleRecord,
  });
  console.log("[overnight] growth log:", GROWTH_SUMMARY);

  const elapsed = Date.now() - startedAt;
  if (elapsed >= DURATION_MS) break;
  const wait = Math.min(CYCLE_MS, DURATION_MS - elapsed);
  console.log(`[overnight] sleep ${Math.round(wait / 60000)}m until next cycle…`);
  await sleep(wait);
}

console.log(`\n[overnight] finished ${cycle} cycle(s) in ${Math.round((Date.now() - startedAt) / 60000)}m`);
