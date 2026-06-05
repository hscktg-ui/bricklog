/**
 * .env.local → Vercel Environment Variables (production + preview + development)
 *
 * Usage (PowerShell, one-time token from https://vercel.com/account/tokens):
 *   $env:VERCEL_TOKEN = "vercel_..."
 *   npm run sync:vercel-env
 *
 * Optional:
 *   $env:VERCEL_PROJECT = "bricklog"
 *   $env:NEXT_PUBLIC_APP_URL = "https://briclog.ai"
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
const token = (process.env.VERCEL_TOKEN || "").trim();
const project = (process.env.VERCEL_PROJECT || "bricklog").trim();
const prodAppUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://briclog.ai").trim();

const SKIP_KEYS = new Set([
  "BRICLOG_TEST_EMAIL",
  "BRICLOG_TEST_PASSWORD",
  "BRICLOG_SMS_DEV_MODE",
  "NEXT_PUBLIC_BRICLOG_SMS_DEV_MODE",
]);

function parseEnvFile(path) {
  const text = readFileSync(path, "utf8");
  const out = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!key || SKIP_KEYS.has(key)) continue;
    out.set(key, value);
  }
  if (out.has("NEXT_PUBLIC_APP_URL")) {
    out.set("NEXT_PUBLIC_APP_URL", prodAppUrl);
  }
  out.set("NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL", "false");
  out.set("BRICLOG_BRAND_FIRST_ENGINE", "1");
  return out;
}

function runVercel(args) {
  const result = spawnSync("npx", ["vercel", ...args], {
    cwd: root,
    encoding: "utf8",
    shell: true,
    timeout: 120_000,
    env: { ...process.env, VERCEL_TOKEN: token },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error?.code === "ETIMEDOUT") {
    console.error("vercel CLI timed out");
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!token) {
  console.error("VERCEL_TOKEN이 없습니다.");
  console.error("1) https://vercel.com/account/tokens 에서 토큰 생성");
  console.error('2) PowerShell: $env:VERCEL_TOKEN = "vercel_..."');
  console.error("3) npm run sync:vercel-env");
  process.exit(1);
}

if (!existsSync(envPath)) {
  console.error(".env.local 파일이 없습니다:", envPath);
  process.exit(1);
}

const vars = parseEnvFile(envPath);

const REQUIRED_FOR_AUTH = ["SUPABASE_SERVICE_ROLE_KEY"];
const RECOMMENDED_PROD = ["BRICLOG_CRON_SECRET"];
for (const key of [...REQUIRED_FOR_AUTH, ...RECOMMENDED_PROD]) {
  if (!vars.get(key)) {
    console.warn(
      `\n⚠ ${key} 가 비어 있습니다.${
        key === "SUPABASE_SERVICE_ROLE_KEY"
          ? " SMS·가입 검증이 동작하지 않습니다."
          : " Vercel Cron(야간 엔진 진화)이 동작하지 않습니다."
      }`,
    );
    if (key === "SUPABASE_SERVICE_ROLE_KEY") {
      console.warn(
        "  Supabase → Project Settings → API → service_role (secret) 복사 후 .env.local에 넣고 다시 실행하세요.\n",
      );
    }
    if (key === "BRICLOG_CRON_SECRET") {
      console.warn(
        "  Vercel → Settings → Environment Variables 에 BRICLOG_CRON_SECRET 추가 후 Redeploy 하세요.\n",
      );
    }
  }
}

console.log(`Link project: ${project}`);
runVercel(["link", "--yes", "--project", project, "--token", token]);

const TARGET_ENVS = (process.env.VERCEL_ENV_TARGETS || "production")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

let ok = 0;
for (const [name, value] of vars) {
  if (!value) continue;
  const sensitive =
    /SECRET|KEY|TOKEN|PASSWORD|SERVICE_ROLE/i.test(name) &&
    !name.startsWith("NEXT_PUBLIC_");
  console.log(`\n→ ${name}`);
  for (const envName of TARGET_ENVS) {
    const args = [
      "env",
      "add",
      name,
      envName,
      "--value",
      value,
      "--yes",
      "--force",
      "--token",
      token,
    ];
    if (sensitive) args.push("--sensitive");
    runVercel(args);
  }
  ok += 1;
}

console.log(`\nDone: ${ok} variables synced.`);
console.log("Redeploy: npm run deploy:vercel");
