/**
 * 초보자용 로컬 원클릭 준비
 * Run: npm run setup:local
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

const BETA_LINES = [
  "NEXT_PUBLIC_APP_URL=http://localhost:3005",
  "NEXT_PUBLIC_BRICLOG_FAST_ONBOARDING=true",
  "NEXT_PUBLIC_BRICLOG_SIGNUP_PHONE_OPTIONAL=false",
  "NEXT_PUBLIC_BRICLOG_SMS_DEV_MODE=true",
];

function ensureEnv() {
  let cur = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
  const keys = new Set(
    cur
      .split("\n")
      .map((l) => l.split("=")[0]?.trim())
      .filter(Boolean)
  );
  const add = BETA_LINES.filter((l) => !keys.has(l.split("=")[0]));
  if (add.length) {
    cur += `\n# BRICLOG setup:local\n${add.join("\n")}\n`;
    writeFileSync(envPath, cur);
    console.log("✓ .env.local 에 베타 옵션 추가:", add.map((l) => l.split("=")[0]).join(", "));
  } else {
    console.log("✓ .env.local 베타 옵션 이미 있음");
  }
  if (!keys.has("OPENAI_API_KEY") && !cur.includes("OPENAI_API_KEY=")) {
    console.warn("⚠ OPENAI_API_KEY 가 없으면 글은 구성안만 나옵니다.");
  }
  const hasGoogle =
    keys.has("GOOGLE_CSE_API_KEY") && keys.has("GOOGLE_CSE_CX");
  const hasSerp = keys.has("SERPAPI_API_KEY");
  if (!hasGoogle && !hasSerp) {
    console.warn(
      "⚠ GOOGLE_CSE_API_KEY+GOOGLE_CSE_CX 또는 SERPAPI_API_KEY 가 없으면 실시간 Google 검색 없이 LLM·입력 단서만 사용합니다."
    );
    console.warn("   → .env.example 참고");
  }
  if (!keys.has("NEXT_PUBLIC_SUPABASE_URL")) {
    console.warn("⚠ Supabase URL/키가 없으면 로그인이 안 됩니다.");
  }
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("\n=== BRICLOG 로컬 준비 ===\n");
ensureEnv();
console.log("\n빌드 중…\n");
run("npm", ["run", "build"]);
console.log(`
완료.

다음 한 줄만 실행하세요 (이 창은 닫지 말고):

  npm run start:3005

브라우저: http://localhost:3005

끌 때: 터미널에서 Ctrl+C
`);
