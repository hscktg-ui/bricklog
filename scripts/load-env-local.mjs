/**
 * .env.local → process.env (CLI 스크립트용)
 * OPENAI_API_KEY 중복 시 sk- 로 시작하는 유효 키 우선
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env.local");

if (existsSync(envPath)) {
  const openaiKeys = [];
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (m[1] === "OPENAI_API_KEY" && val.startsWith("sk-") && val.length >= 20) {
      openaiKeys.push(val);
      continue;
    }
    if (!process.env[m[1]]) {
      process.env[m[1]] = val;
    }
  }
  if (openaiKeys.length) {
    process.env.OPENAI_API_KEY = openaiKeys[0];
  }
}
