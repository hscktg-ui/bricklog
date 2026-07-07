/**
 * Council 세션 리포트 — 축 회귀 일괄 실행
 * Run: npm run test:council-session
 */
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

const STEPS = [
  "test:council-brief",
  "test:writing-contract",
  "test:council-wedge-batch",
  "test:north-star-kpi",
  "test:channel-bundle-consistency",
  "test:employee-feedback-verify",
];

const results = [];
let allOk = true;

for (const script of STEPS) {
  const t0 = Date.now();
  const r = spawnSync(npmCmd, ["run", script], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
  const ms = Date.now() - t0;
  const ok = r.status === 0;
  if (!ok) allOk = false;
  results.push({
    script,
    ok,
    ms,
    exitCode: r.status,
    tail: (r.stdout || r.stderr || "").split("\n").slice(-4).join("\n"),
  });
  console.log(`${ok ? "PASS" : "FAIL"} ${script} (${ms}ms)`);
}

const summary = {
  at: new Date().toISOString(),
  steps: results,
  pass: results.filter((r) => r.ok).length,
  total: results.length,
  northStar:
    "붙여넣기율·월간 계획 KPI + contract 축 + 채널 번들 일관성",
};

const outDir = join(root, "artifacts", "council-session");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

const artifactPaths = [
  "artifacts/council-brief/latest-summary.json",
  "artifacts/council-wedge-batch/latest-summary.json",
  "artifacts/north-star-kpi/latest-summary.json",
  "artifacts/channel-bundle-consistency/latest-summary.json",
];
for (const rel of artifactPaths) {
  const p = join(root, rel);
  if (existsSync(p)) {
    try {
      summary[rel.replace(/\//g, "_").replace(/\.json$/, "")] = JSON.parse(
        readFileSync(p, "utf8")
      );
    } catch {
      /* ignore */
    }
  }
}
writeFileSync(join(outDir, "latest-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

console.log(`\nCouncil session: ${summary.pass}/${summary.total}`);
console.log(`Report: ${join(outDir, "latest-summary.json")}`);
process.exit(allOk ? 0 : 1);
