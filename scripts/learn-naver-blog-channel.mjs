/**
 * 네이버 블로그 검색 학습 — 대량 채널 프로필 (기본 2,000건)
 * Run: npm run learn:naver-blog
 *      npm run learn:naver-blog -- --target 2000
 *      npm run learn:naver-blog -- --target 500 --fast
 */
import { mkdirSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { learnFromNaverBlogSearch } from "../lib/channel/naverBlogLearner.js";
import { buildNaverBlogLearnQueries } from "../lib/channel/naverBlogQueryCatalog.js";
import { isNaverSearchConfigured } from "../lib/research/searchSources/naverSearch.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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
  /* optional */
}

const OUT_DIR = join(root, "artifacts", "naver-blog-learning");
const PROFILE_JSON = join(OUT_DIR, "profile-latest.json");
const REPORT_JSON = join(OUT_DIR, "learn-report.json");
const SAMPLES_JSONL = join(OUT_DIR, "samples-latest.jsonl");
const PHRASES_JSON = join(OUT_DIR, "phrase-corpus.json");

function parseArgs(argv) {
  const args = { target: 2000, perQuery: 5, delayMs: 180, fast: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--target" && argv[i + 1]) {
      args.target = Math.max(50, parseInt(argv[++i], 10) || 2000);
    } else if (argv[i] === "--per-query" && argv[i + 1]) {
      args.perQuery = Math.min(10, Math.max(3, parseInt(argv[++i], 10) || 5));
    } else if (argv[i] === "--fast") {
      args.fast = true;
      args.delayMs = 80;
    } else if (argv[i] === "--delay" && argv[i + 1]) {
      args.delayMs = Math.max(0, parseInt(argv[++i], 10) || 180);
    }
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

  const queryCount = Math.ceil(args.target / args.perQuery) + 20;
  const queries = buildNaverBlogLearnQueries({ targetQueries: queryCount });

  console.log(
    `naver-blog-learn: target=${args.target} queries=${queries.length} perQuery=${args.perQuery} delay=${args.delayMs}ms`
  );

  writeFileSync(SAMPLES_JSONL, "", "utf8");

  const startedAt = Date.now();
  const result = await learnFromNaverBlogSearch({
    targetSamples: args.target,
    perQuery: args.perQuery,
    delayMs: args.delayMs,
    queries,
    onProgress: (p) => {
      const pct = Math.round((p.samples / p.targetSamples) * 100);
      process.stdout.write(
        `\r[${pct}%] samples=${p.samples}/${p.targetSamples} queries=${p.queriesDone}/${p.queriesTotal} errors=${p.errors}   `
      );
    },
  });

  const { samples, _learnMeta, ...profile } = result;

  for (const row of samples) {
    appendFileSync(SAMPLES_JSONL, `${JSON.stringify(row)}\n`, "utf8");
  }

  writeFileSync(PROFILE_JSON, JSON.stringify(profile, null, 2), "utf8");
  writeFileSync(
    PHRASES_JSON,
    JSON.stringify(
      {
        learnedAt: profile.learnedAt,
        phraseCorpus: profile.phraseCorpus,
        voicePhrases: profile.voicePhrases,
        categoryBreakdown: profile.categoryBreakdown,
      },
      null,
      2
    ),
    "utf8"
  );
  writeFileSync(
    REPORT_JSON,
    JSON.stringify(
      {
        ...profile.metrics,
        sampleCount: profile.sampleCount,
        queryCount: profile.queryCount,
        categoryCount: profile.categoryCount,
        categories: profile.categoryBreakdown,
        learnMeta: _learnMeta,
        elapsedSec: Math.round((Date.now() - startedAt) / 1000),
        topTitles: profile.topTitles,
        learnedAt: profile.learnedAt,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("\n");
  console.log(`samples: ${profile.sampleCount} (${profile.categoryCount} categories)`);
  console.log(
    `field ${profile.metrics.fieldRate}% · voice ${profile.metrics.voiceRate}% · checklist ${profile.metrics.checklistRate}%`
  );
  console.log(`api: ${_learnMeta?.apiCalls} calls · errors ${_learnMeta?.errors}`);
  console.log(`profile: ${PROFILE_JSON}`);
  console.log(`corpus: ${PHRASES_JSON}`);
  console.log(`samples: ${SAMPLES_JSONL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
