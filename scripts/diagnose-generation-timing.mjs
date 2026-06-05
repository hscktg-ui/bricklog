/**
 * 블로그 생성 체감 시간 — 단계별 상한 추정 + 선택적 실측
 *
 * 추정만: node scripts/diagnose-generation-timing.mjs
 * 실측:   node --env-file=.env.local --import ./scripts/register-alias.mjs scripts/diagnose-generation-timing.mjs --bench
 * 빠른:   BRICLOG_BENCH_LIMIT=1 node ... scripts/diagnose-generation-timing.mjs --bench
 */

const STAGES = [
  {
    id: "client_research_api",
    label: "클라이언트 1차 조사 (/api/content/research)",
    sec: "10–90",
    note: "runResearch + 네이버 + (선택) Gemini + OpenAI 합성",
  },
  {
    id: "depth_cascade",
    label: "연쇄 조사 (최대 2라운드 × 4축)",
    sec: "20–120",
    note: "각 패스 OpenAI 1400tok · 네이버 캐시 재사용 · Gemini 1회만",
  },
  {
    id: "v3_brief",
    label: "V3 전략·브리프",
    sec: "1–3",
    note: "로컬 엔진",
  },
  {
    id: "blog_api",
    label: "블로그 생성 (/api/content/blog)",
    sec: "45–180",
    note: "OpenAI 최대 6회 재작성 + Core 95점",
  },
  {
    id: "quality_review",
    label: "출고 품질 검수 (95 미만 수정)",
    sec: "30–90",
    note: "최대 2회 추가 LLM",
  },
  {
    id: "retry",
    label: "타임아웃 시 API 1회 재시도",
    sec: "0–280",
    note: "fetchBlogWithRetry",
  },
];

const worstCaseSec = 90 + 120 + 3 + 180 + 90;
const typicalSec = 25 + 40 + 2 + 70 + 35;

function printEstimates() {
  console.log("=== BRICLOG 블로그 생성 시간 (추정) ===\n");
  for (const s of STAGES) {
    console.log(`· ${s.label}`);
    console.log(`  ${s.sec}초 — ${s.note}\n`);
  }
  console.log(
    `일반적 합계(순차): 약 ${Math.round(typicalSec / 60)}분 (${typicalSec}초)`
  );
  console.log(
    `최악(재시도·연쇄 풀가동): 약 ${Math.round(worstCaseSec / 60)}–${Math.round((worstCaseSec + 280) / 60)}분`
  );
  console.log("\n3~4분이 나오는 주된 이유:");
  console.log("1) 조사 1회 + 연쇄 조사(여러 번 OpenAI)");
  console.log("2) 본문 생성 시 95점까지 최대 6회 재작성");
  console.log("3) 출고 검수 95점까지 최대 2회 추가 호출");
  console.log("\n적용된 완화: 연쇄 max 2라운드·4축, depth 토큰 축소, Gemini 1회");
  console.log(
    "\n실측: node --env-file=.env.local --import ./scripts/register-alias.mjs scripts/benchmark-blog-generation.mjs"
  );
}

async function runBench() {
  const { spawn } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");
  const script = join(dirname(fileURLToPath(import.meta.url)), "benchmark-blog-generation.mjs");
  const child = spawn(
    process.execPath,
    [
      "--import",
      join(dirname(fileURLToPath(import.meta.url)), "register-alias.mjs"),
      script,
    ],
    {
      stdio: "inherit",
      env: process.env,
      cwd: process.cwd(),
    }
  );
  await new Promise((res, rej) => {
    child.on("exit", (code) => (code === 0 ? res() : rej(new Error(`bench exit ${code}`))));
  });
}

const bench = process.argv.includes("--bench");
if (bench) {
  await runBench();
} else {
  printEstimates();
}
