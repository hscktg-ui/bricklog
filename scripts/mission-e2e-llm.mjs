/**
 * LLM E2E 벤치 — 실 API 생성 품질
 */
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { isOpenAIConfigured } from "../lib/llm/llmProvider.js";
import { generateBlogWithLLMFirst } from "../lib/llm/contentOrchestrator.js";
import { scoreBriclogEngine, BRICLOG_ENGINE_PASS } from "../lib/product/briclogEngineScore.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { runGoldenRegression } from "./mission-golden-regression.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "artifacts", "mission-improvement", "e2e-llm-summary.json");

const FURNITURE_FACTS = [
  { fact: "파주 에이스침대 매장 오피모 전시·행사 진행" },
  { fact: "오피모 라인업 매트리스·모션베드 전시" },
  { fact: "행사 기간·대상 모델·할인율 매장 안내" },
  { fact: "인기 모델 재고 변동·선착순 조건" },
  { fact: "파주 매장 주차·대중교통·영업시간" },
  { fact: "매장 예약·상담·체험 가능" },
  { fact: "설치·배송·A/S 정책 매장 문의" },
];

const CAFE_FACTS = [
  { fact: "강남 모카하우스 봄 시즌 신메뉴 출시" },
  { fact: "대표 음료·디저트·원두 변경" },
  { fact: "매장 좌석·분위기·운영 시간" },
  { fact: "강남역·도보 동선·주차 안내" },
  { fact: "시즌 한정 프로모션·영업 시간" },
];

const HOSPITAL_FACTS = [
  { fact: "대구 수성 연세내과 건강검진 프로그램" },
  { fact: "예약·대기·검진 소요 시간" },
  { fact: "기본·종합 검진 패키지 차이" },
  { fact: "금식·준비물·결과 수령 안내" },
  { fact: "주차·대중교통·평일·주말 운영" },
];

export const E2E_SEEDS = [
  {
    id: "e2e-furniture",
    input: {
      brandName: "에이스침대",
      region: "파주",
      topic: "오피모 전시 소식",
      mainKeyword: "오피모 전시 소식",
      industry: "가구/침대",
      blogLengthTier: "medium",
      researchFacts: FURNITURE_FACTS,
      v2PreWriteVerified: true,
      knowledgeExpansionReady: true,
      v3PreWriteVerified: true,
    },
  },
  {
    id: "e2e-cafe",
    input: {
      brandName: "모카하우스",
      region: "강남",
      topic: "봄 시즌 메뉴",
      mainKeyword: "봄 시즌 메뉴",
      industry: "카페",
      blogLengthTier: "medium",
      researchFacts: CAFE_FACTS,
      v2PreWriteVerified: true,
      knowledgeExpansionReady: true,
      v3PreWriteVerified: true,
    },
  },
  {
    id: "e2e-hospital",
    input: {
      brandName: "연세내과",
      region: "대구 수성",
      topic: "건강검진 예약",
      mainKeyword: "건강검진 예약",
      industry: "병원",
      blogLengthTier: "medium",
      researchFacts: HOSPITAL_FACTS,
      v2PreWriteVerified: true,
      knowledgeExpansionReady: true,
      v3PreWriteVerified: true,
    },
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIdx = args.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) || 3 : 3;
  const localOnly = args.includes("--local-only");
  return { limit, localOnly };
}

async function runE2eOne(seed) {
  const started = Date.now();
  try {
    const result = await generateBlogWithLLMFirst(seed.input);
    const pack = result.blogContent;
    if (!pack?.sections?.length) {
      return {
        id: seed.id,
        ok: false,
        error: result.userMessage || "empty_pack",
        mode: result.mode,
        ms: Date.now() - started,
      };
    }
    const full = getBlogFullText(pack);
    const briclog = scoreBriclogEngine(pack, seed.input);
    const belief = scoreHumanBelief(full, seed.input, pack);
    const ok =
      briclog.total >= BRICLOG_ENGINE_PASS &&
      !briclog.issues.includes("naver_avoid_phrase") &&
      !briclog.issues.includes("checklist_voice") &&
      !/방문·예약\s*안내/.test(full) &&
      belief.ok;

    return {
      id: seed.id,
      ok,
      mode: result.mode,
      briclogScore: briclog.total,
      briclogOk: briclog.ok,
      belief: belief.score,
      beliefOk: belief.ok,
      sections: pack.sections?.length,
      ms: Date.now() - started,
      issues: briclog.issues,
      withheld: Boolean(result.withheld),
      v17: Boolean(pack._meta?.v17Engine || pack._meta?.v17FallbackPolish),
    };
  } catch (err) {
    return {
      id: seed.id,
      ok: false,
      error: String(err?.message || err),
      ms: Date.now() - started,
    };
  }
}

export async function runMissionE2eLlm(options = {}) {
  const { limit = 3, localOnly = false } = options;

  const golden = runGoldenRegression();

  if (localOnly || !isOpenAIConfigured()) {
    console.log(
      localOnly
        ? "\n(--local-only — LLM E2E skipped)"
        : "\n(OPENAI_API_KEY 없음 — LLM E2E skipped, golden only)"
    );
    return { golden, e2e: null, skipped: true };
  }

  mkdirSync(dirname(OUT), { recursive: true });
  const seeds = E2E_SEEDS.slice(0, limit);
  const results = [];
  for (const seed of seeds) {
    console.log(`\nE2E · ${seed.id} …`);
    const row = await runE2eOne(seed);
    results.push(row);
    console.log(
      `  ${row.ok ? "OK" : "FAIL"} · briclog=${row.briclogScore ?? "-"} · belief=${row.belief ?? "-"} · v17=${row.v17 ? "yes" : "no"} · ${row.ms}ms`
    );
    if (row.issues?.length) console.log(`      issues: ${row.issues.join(", ")}`);
  }

  const pass = results.filter((r) => r.ok).length;
  const summary = {
    startedAt: new Date().toISOString(),
    total: results.length,
    pass,
    passRate: Math.round((pass / Math.max(1, results.length)) * 1000) / 10,
    results,
    goldenPass: golden.pass,
    goldenTotal: golden.total,
  };
  writeFileSync(OUT, JSON.stringify(summary, null, 2), "utf8");
  console.log(`\ne2e-llm: ${pass}/${results.length} pass (${summary.passRate}%)`);
  console.log(`  summary: ${OUT}`);
  return { golden, e2e: summary, skipped: false };
}

if (process.argv[1]?.includes("mission-e2e-llm")) {
  const opts = parseArgs();
  runMissionE2eLlm(opts).then(({ golden, e2e, skipped }) => {
    if (golden.pass < golden.total) process.exit(1);
    if (!skipped && e2e && e2e.pass < e2e.total) process.exit(1);
  });
}
