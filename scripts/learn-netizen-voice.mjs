/**
 * 네티즌·스레드·커뮤니티 말투 학습 + experience-voice 프로필 병합
 * Run: npm run learn:netizen-voice
 */
import { readFileSync, mkdirSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { learnFromNetizenVoiceSearch } from "../lib/channel/netizenVoiceLearner.js";
import { buildNetizenLearnQueries } from "../lib/channel/netizenVoiceQueryCatalog.js";
import { isNaverSearchConfigured } from "../lib/research/searchSources/naverSearch.js";
import { mergeNetizenIntoExperienceProfile } from "../lib/content/experienceVoiceMerge.js";

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
  /* */
}

const OUT_DIR = join(root, "artifacts", "netizen-voice-learning");
const NETIZEN_JSON = join(OUT_DIR, "profile-latest.json");
const SAMPLES_JSONL = join(OUT_DIR, "samples-latest.jsonl");
const EXP_JSON = join(root, "artifacts", "experience-voice-learning", "profile-latest.json");

function parseArgs(argv) {
  const args = { target: 350, perQuery: 6, delayMs: 120, merge: true };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--target" && argv[i + 1]) args.target = Math.max(50, parseInt(argv[++i], 10) || 350);
    else if (argv[i] === "--delay" && argv[i + 1]) args.delayMs = Math.max(0, parseInt(argv[++i], 10) || 120);
    else if (argv[i] === "--no-merge") args.merge = false;
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

  const queries = buildNetizenLearnQueries(Math.ceil(args.target / args.perQuery) + 10);
  writeFileSync(SAMPLES_JSONL, "", "utf8");

  console.log(`netizen-voice-learn: target=${args.target} queries=${queries.length}`);

  const result = await learnFromNetizenVoiceSearch({
    targetSamples: args.target,
    perQuery: args.perQuery,
    delayMs: args.delayMs,
    queries,
    onProgress: (p) => {
      process.stdout.write(
        `\r[${Math.round((p.samples / p.targetSamples) * 100)}%] samples=${p.samples}/${p.targetSamples}   `
      );
    },
  });

  const { samples, _learnMeta, ...profile } = result;
  for (const row of samples) {
    appendFileSync(SAMPLES_JSONL, `${JSON.stringify(row)}\n`, "utf8");
  }
  writeFileSync(NETIZEN_JSON, JSON.stringify(profile, null, 2), "utf8");

  console.log("\n");
  console.log("samples:", profile.sampleCount, "rates:", profile.rates);
  console.log("patterns:", profile.patternCounts);
  console.log("api:", _learnMeta?.apiCalls, "errors:", _learnMeta?.errors);
  console.log("written:", NETIZEN_JSON);

  if (args.merge) {
    let exp = {};
    if (existsSync(EXP_JSON)) {
      exp = JSON.parse(readFileSync(EXP_JSON, "utf8"));
    }
    const merged = mergeNetizenIntoExperienceProfile(exp, profile);
    mkdirSync(join(root, "artifacts", "experience-voice-learning"), { recursive: true });
    writeFileSync(EXP_JSON, JSON.stringify(merged, null, 2), "utf8");
    console.log("merged into:", EXP_JSON);
    console.log(
      "merged role buckets:",
      Object.fromEntries(
        Object.entries(merged.roleBuckets || {}).map(([k, v]) => [k, (v || []).length])
      )
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
