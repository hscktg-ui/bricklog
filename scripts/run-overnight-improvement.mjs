/**
 * 야간 품질 개선 오케스트레이터 — 배치·회귀 테스트·커밋·배포 반복
 * Run: npm run overnight:improvement
 *
 * Env:
 *   OVERNIGHT_DURATION_MS — 전체 실행 시간 (default 4h)
 *   OVERNIGHT_CYCLE_MS — 사이클 간격 (default 30m)
 *   BRICLOG_PERSONA_LIMIT — thousand-feedback 건수 (default 200)
 *   OVERNIGHT_SKIP_DEPLOY=1 — 배포 생략
 */
import { spawnSync } from "child_process";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DURATION_MS = Number(process.env.OVERNIGHT_DURATION_MS || 4 * 60 * 60 * 1000);
const CYCLE_MS = Number(process.env.OVERNIGHT_CYCLE_MS || 30 * 60 * 1000);
const SKIP_DEPLOY = process.env.OVERNIGHT_SKIP_DEPLOY === "1";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(label, command, args = []) {
  console.log(`\n[overnight] ▶ ${label}`);
  console.log(`[overnight]   ${command} ${args.join(" ")}`);
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: true,
    env: {
      ...process.env,
      BRICLOG_PERSONA_LIMIT: process.env.BRICLOG_PERSONA_LIMIT || "200",
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
    };
  } catch {
    return null;
  }
}

const startedAt = Date.now();
let cycle = 0;

console.log("=== BRICLOG OVERNIGHT IMPROVEMENT ===");
console.log(
  `Duration: ${Math.round(DURATION_MS / 3600000)}h · Cycle: ${Math.round(CYCLE_MS / 60000)}m · Started: ${new Date().toISOString()}`
);

while (Date.now() - startedAt < DURATION_MS) {
  cycle += 1;
  console.log(`\n========== CYCLE ${cycle} ${new Date().toLocaleString("ko-KR")} ==========`);

  run("test:mission-prose", "npm", ["run", "test:mission-prose"]);
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

  const elapsed = Date.now() - startedAt;
  if (elapsed >= DURATION_MS) break;
  const wait = Math.min(CYCLE_MS, DURATION_MS - elapsed);
  console.log(`[overnight] sleep ${Math.round(wait / 60000)}m until next cycle…`);
  await sleep(wait);
}

console.log(`\n[overnight] finished ${cycle} cycle(s) in ${Math.round((Date.now() - startedAt) / 60000)}m`);
