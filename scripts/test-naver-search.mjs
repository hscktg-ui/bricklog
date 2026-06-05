/**
 * 네이버 검색 API 스모크
 * node --import ./scripts/register-alias.mjs scripts/test-naver-search.mjs "에이스침대 오피모3"
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  isNaverSearchConfigured,
  fetchNaverLeadsForQueries,
  formatNaverLeadsForPrompt,
} from "../lib/research/searchSources/naverSearch.js";

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
  /* no .env.local */
}

const q = process.argv[2] || "에이스침대 오피모3";

async function main() {
  console.log("naver configured:", isNaverSearchConfigured());
  if (!isNaverSearchConfigured()) {
    console.log(
      "Set NAVER_CLIENT_ID + NAVER_CLIENT_SECRET in .env.local (developers.naver.com)"
    );
    process.exit(1);
  }
  const leads = await fetchNaverLeadsForQueries([q], {
    maxQueries: 1,
    perQuery: 5,
  });
  console.log("ok:", leads.ok, "provider:", leads.provider, "count:", leads.results?.length);
  if (leads.results?.[0]) {
    console.log("sample:", leads.results[0].title, "—", leads.results[0].snippet?.slice(0, 100));
  }
  console.log("\n" + formatNaverLeadsForPrompt(leads).slice(0, 600));
  process.exit(leads.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
