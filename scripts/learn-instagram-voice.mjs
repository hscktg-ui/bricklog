/**
 * 인스타그램 캡션 톤 학습 — 네이버 API (web+blog)
 * Run: npm run learn:instagram-voice
 */
import { mkdirSync, writeFileSync, readFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { learnFromChannelVoiceSearch } from "../lib/channel/channelVoiceLearner.js";
import { buildInstagramLearnQueries } from "../lib/channel/channelVoiceQueryCatalog.js";
import { isNaverSearchConfigured } from "../lib/research/searchSources/naverSearch.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

try {
  const raw = readFileSync(join(root, ".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }
} catch {
  /* optional */
}

const OUT_DIR = join(root, "artifacts", "instagram-voice-learning");
const PROFILE_JSON = join(OUT_DIR, "profile-latest.json");
const SAMPLES_JSONL = join(OUT_DIR, "samples-latest.jsonl");

function parseArgs(argv) {
  const args = { target: 400, perQuery: 6, delayMs: 140 };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--target" && argv[i + 1]) args.target = Math.max(50, parseInt(argv[++i], 10) || 400);
    else if (argv[i] === "--delay" && argv[i + 1]) args.delayMs = Math.max(0, parseInt(argv[++i], 10) || 140);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  mkdirSync(OUT_DIR, { recursive: true });

  if (!isNaverSearchConfigured()) {
    console.error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 필요 (.env.local)");
    process.exit(1);
  }

  const queries = buildInstagramLearnQueries(Math.ceil(args.target / args.perQuery) + 8);
  writeFileSync(SAMPLES_JSONL, "", "utf8");

  console.log(`instagram-voice-learn: target=${args.target} queries=${queries.length}`);

  const result = await learnFromChannelVoiceSearch("instagram", {
    targetSamples: args.target,
    perQuery: args.perQuery,
    delayMs: args.delayMs,
    queries,
    onProgress: (p) => {
      process.stdout.write(
        `\r[${Math.round((p.samples / p.targetSamples) * 100)}%] samples=${p.samples}/${p.targetSamples} errors=${p.errors}   `
      );
    },
  });

  const { samples, _learnMeta, ...profile } = result;
  for (const row of samples) {
    appendFileSync(SAMPLES_JSONL, `${JSON.stringify(row)}\n`, "utf8");
  }
  writeFileSync(PROFILE_JSON, JSON.stringify(profile, null, 2), "utf8");

  console.log("\n");
  console.log("samples:", profile.sampleCount, "rates:", profile.rates);
  console.log("hooks:", profile.hookExamples?.length || 0);
  console.log("api:", _learnMeta?.apiCalls, "errors:", _learnMeta?.errors);
  console.log("written:", PROFILE_JSON);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
