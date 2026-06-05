/**
 * Google CSE 새 키·CX 검증 (설정 직후 1회 실행)
 * node --import ./scripts/register-alias.mjs scripts/verify-google-cse.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  const raw = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }
} catch {
  console.log("FAIL: .env.local 없음");
  process.exit(1);
}

const key = (process.env.GOOGLE_CSE_API_KEY || "").trim();
const cx = (process.env.GOOGLE_CSE_CX || "").trim();

console.log("GOOGLE_CSE_API_KEY:", key.length >= 10 ? `OK (${key.length}자)` : "비어 있음");
console.log("GOOGLE_CSE_CX:", cx.length >= 4 ? `OK (${cx})` : "비어 있음");

if (key.length < 10 || cx.length < 4) {
  process.exit(1);
}

const q = process.argv[2] || "test";
const res = await fetch(
  `https://www.googleapis.com/customsearch/v1?${new URLSearchParams({
    key,
    cx,
    q,
    num: "3",
    hl: "ko",
    gl: "kr",
  })}`
);
const data = await res.json();

console.log("HTTP:", res.status);
if (data.error) {
  console.log("오류:", data.error.message);
  if (data.error.message?.includes("Custom Search JSON API")) {
    console.log("→ Cloud Console에서 Custom Search API「사용」+ 이 API 키와 같은 프로젝트인지 확인");
  }
  process.exit(1);
}

const total = data.searchInformation?.totalResults ?? "0";
const first = data.items?.[0]?.title?.replace(/<[^>]+>/g, "") ?? "(없음)";
console.log("totalResults:", total);
console.log("첫 제목:", first);
console.log("PASS: Google CSE 연동 성공");
process.exit(0);
