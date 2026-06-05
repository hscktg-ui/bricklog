/**
 * 내일 출시 전 일괄 검증 — 빌드 + 정적 스모크 + (서버 있으면) 클릭·8인
 * Run: npm run prelaunch
 * Env: BASE_URL (optional — auto-detect 3005 → 3000 → 3002)
 */
import { spawnSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolveLiveBaseUrl, isServerUp } from "./resolve-base-url.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  return r.status === 0;
}

loadEnvLocal();
const BASE = await resolveLiveBaseUrl();
const serverUp = await isServerUp(BASE);

console.log("\n=== BRICLOG PRELAUNCH ===\n");
console.log(`BASE_URL: ${BASE}${process.env.BASE_URL ? " (env)" : serverUp ? " (auto)" : " (fallback — server down)"}\n`);

const steps = [];

const skipBuild = process.env.PRELAUNCH_SKIP_BUILD === "1";
if (!skipBuild) {
  steps.push(["build", () => run("npm", ["run", "build"])]);
} else {
  console.log("\n(PRELAUNCH_SKIP_BUILD=1 — build skipped)\n");
}
steps.push(["test:quality", () => run("npm", ["run", "test:quality"])]);
steps.push(["test:v20", () => run("npm", ["run", "test:v20"])]);
steps.push(["test:human-belief", () => run("npm", ["run", "test:human-belief"])]);
steps.push(["test:briclog-doctrine", () => run("npm", ["run", "test:briclog-doctrine"])]);
steps.push(["test:beta-test-guard", () => run("npm", ["run", "test:beta-test-guard"])]);
steps.push(["test:length-tiers", () => run("npm", ["run", "test:length-tiers"])]);
steps.push([
  "test:eight-users",
  () => run("npm", ["run", "test:eight-users"], { BASE_URL: BASE }),
]);
steps.push(["test:director", () => run("npm", ["run", "test:director"])]);

if (serverUp) {
  console.log(`\nServer OK at ${BASE} — browser smokes\n`);
  steps.push([
    "test:click-blockers",
    () => run("npm", ["run", "test:click-blockers"], { BASE_URL: BASE }),
  ]);
  steps.push([
    "test:ui-stability",
    () => run("npm", ["run", "test:ui-stability"], { BASE_URL: BASE }),
  ]);
} else {
  console.log(
    `\nSkip click-blockers / ui-stability — start server: npm run dev or npm run start:3005\n`
  );
}

let failed = 0;
for (const [name, fn] of steps) {
  console.log(`\n--- ${name} ---\n`);
  if (!fn()) {
    console.error(`\nFAILED: ${name}\n`);
    failed += 1;
  }
}

console.log(
  failed
    ? `\n=== PRELAUNCH: ${failed} step(s) failed ===\n`
    : "\n=== PRELAUNCH: all steps passed ===\n"
);
process.exit(failed ? 1 : 0);
