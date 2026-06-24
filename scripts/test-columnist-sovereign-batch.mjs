/**
 * Columnist Sovereign — 200~300 키워드 조합 배치 (라우팅·송출법·품질)
 *
 * Run:
 *   npm run test:columnist-sovereign-batch
 *   BRICLOG_BATCH_LIMIT=250 BRICLOG_BATCH_LIVE=20  — prod LLM 샘플 20건
 */
import { mkdirSync, writeFileSync, appendFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { GENERAL_CATEGORIES, SENSITIVE_CATEGORIES, REGIONS } from "../lib/quality/training/constants.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import {
  isColumnistSovereignEligible,
  isColumnistSovereignEnabled,
  needsColumnistSovereignUpgrade,
} from "../lib/product/columnistSovereignEngine.js";
import {
  assertColumnistDeliveryLaw,
  isColumnistSovereignPack,
} from "../lib/product/columnistDeliveryLaw.js";
import { hasEngineSpamInPack } from "../lib/product/columnistEngineSpam.js";
import {
  assessVisitReviewBenchmark,
} from "../lib/product/visitReviewBenchmarkRubric.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { isOpenAIConfigured } from "../lib/llm/llmProvider.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "artifacts", "columnist-sovereign-batch");
const SUMMARY_JSON = join(OUT_DIR, "latest-summary.json");
const REPORT_JSONL = join(OUT_DIR, "batch-report.jsonl");

loadEnvLocal(ROOT);
process.env.BRICLOG_MISSION = "true";

const BATCH_LIMIT = Math.min(
  300,
  Math.max(200, Number(process.env.BRICLOG_BATCH_LIMIT) || 250)
);
const LIVE_LIMIT = Math.min(
  BATCH_LIMIT,
  Math.max(0, Number(process.env.BRICLOG_BATCH_LIVE) || 0)
);
const LIVE_CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.BRICLOG_BATCH_CONCURRENCY) || 6));
const BASE_URL = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");

const EXTRA_REGIONS = [
  "여주",
  "평창",
  "강릉",
  "전주",
  "수원",
  "춘천",
  "속초",
  "경주",
  "목포",
  "안양",
];

const ALL_REGIONS = [...new Set([...REGIONS, ...EXTRA_REGIONS])];

const TOPIC_POOL = [
  "국수나무 돈까스 소개",
  "실외 수영장 오픈 솔직후기",
  "봄 시즌 브런치 메뉴",
  "신메뉴 출시 안내",
  "가족 나들이 코스",
  "주말 예약 팁",
  "대표 시그니처 메뉴",
  "겨울 시즌 프로모션",
  "직접 다녀온 후기",
  "오픈 기념 이벤트",
  "체험 프로그램 안내",
  "단체 이용 문의",
  "카페 신규 원두 소개",
  "꽃다발 추천 가이드",
  "시술 후기 솔직 정리",
  "입시 설명회 안내",
  "쇼룸 전시 오픈",
  "매트리스 체험 후기",
  "펜션 조식 메뉴",
  "애견 동반 이용",
  "실내 수영장 오픈",
  "승마 체험 프로그램",
  "양떼목장 봄 체험",
  "디저트 신상품",
  "헬스 PT 체험",
  "인테리어 상담 후기",
  "법률 상담 예약 안내",
  "세무 절세 팁",
  "부동산 매물 안내",
  "보험 설계 상담",
];

const INDUSTRIES = [...GENERAL_CATEGORIES, ...SENSITIVE_CATEGORIES, "레저/체험", "목장", "펜션"];

const BRAND_SUFFIX = ["하우스", "스튜디오", "랩", "마켓", "공방", "스튜디오", "하우스", "목장", "카페", "살롱"];

function buildResearchFacts(region, industry, topic, brandName) {
  return [
    { fact: `${region} ${brandName} — ${topic} 관련 이번 시즌 운영 안내`, source: "research" },
    { fact: `${industry} 특성상 ${region} 지역 방문 동선·예약 방식 확인`, source: "research" },
    { fact: `대표 메뉴·체험 구성은 시즌에 따라 달라질 수 있음`, source: "research" },
  ];
}

function buildScenarios(limit = 250) {
  const out = [];
  let idx = 0;
  for (let ri = 0; ri < ALL_REGIONS.length && out.length < limit; ri++) {
    for (let ii = 0; ii < INDUSTRIES.length && out.length < limit; ii++) {
      for (let ti = 0; ti < TOPIC_POOL.length && out.length < limit; ti++) {
        const region = ALL_REGIONS[ri];
        const industry = INDUSTRIES[ii];
        const topic = TOPIC_POOL[ti];
        const regionShort = region.split(" ")[0] || region;
        const brandName = `${regionShort}${BRAND_SUFFIX[(ri + ii + ti) % BRAND_SUFFIX.length]}`;
        const id = `csb_${String(idx + 1).padStart(4, "0")}`;
        const input = {
          brandName,
          region,
          topic,
          mainKeyword: topic.split(" ")[0] || brandName,
          industry,
          blogLengthTier: ti % 3 === 0 ? "short" : ti % 3 === 1 ? "medium" : "short",
          v4Speaker: ti % 2 === 0 ? "plain_review" : "real_use",
          researchFacts: buildResearchFacts(region, industry, topic, brandName),
          v2PreWriteVerified: true,
          knowledgeExpansionReady: true,
        };
        const titleVariants = [
          `${region} ${brandName} 솔직 후기, ${topic}`,
          `${brandName} ${topic} 직접 다녀온 후기`,
          `${region}에서 ${topic} 찾다 ${brandName} 다녀왔어요`,
        ];
        out.push({
          id,
          label: `${industry} · ${region} · ${topic.slice(0, 20)}`,
          input,
          title: titleVariants[idx % titleVariants.length],
        });
        idx += 1;
      }
    }
  }
  return out.slice(0, limit);
}

function simulateTemplatePack(scenario) {
  const { input, title } = scenario;
  return {
    title,
    representativeTitle: title,
    sections: [
      {
        heading: `${input.topic}, 왜 지금 는지`,
        body: `${input.topic} 알아보던 중 ${input.region} ${input.brandName}가 눈에 들어왔어요. 대표 서비스 방문·상담 전 덜 헷갈릴까요?`,
      },
      {
        heading: "비교 기준",
        body: `${input.region} ${input.brandName} 현장 매장 현장 쇼룸 근처 쇼룸 목적별로 나눠 보면 기준이 조금씩 보였어요.`,
      },
      {
        heading: "매장·상담에서 확인할 것",
        body: `${input.brandName} 안내를 비교해 보니 고를 때 기준이 조금씩 보였어요.`,
      },
    ],
    conclusion: `${input.region} ${input.brandName} 방문·체험 일정만 잡아도.`,
    _meta: { missionProseFallback: true },
  };
}

function runLocalGate(scenario) {
  const { input, title } = scenario;
  const inputWithTitle = { ...input, title, representativeTitle: title };
  const template = simulateTemplatePack(scenario);
  const fallback = buildMissionProseFallbackPack(inputWithTitle);
  const eligible = isColumnistSovereignEligible(inputWithTitle, template);
  const needsUpgrade = needsColumnistSovereignUpgrade(template, inputWithTitle);
  const law = assertColumnistDeliveryLaw(template, inputWithTitle);
  const benchmark = assessVisitReviewBenchmark(template, inputWithTitle);
  const fallbackWithheld =
    !fallback?.sections?.length &&
    (fallback._meta?.withholdReason === "columnist_sovereign_required" ||
      fallback._meta?.withholdReason === "visit_review_sovereign_required" ||
      fallback._meta?.researchFirstWithheld);

  const pass =
    eligible &&
    needsUpgrade &&
    law.shouldWithhold &&
    !benchmark.publishOk &&
    hasEngineSpamInPack(template) &&
    (isOpenAIConfigured() ? fallbackWithheld : true);

  return {
    pass,
    eligible,
    needsUpgrade,
    lawWithhold: law.shouldWithhold,
    benchmarkScore: benchmark.score,
    fallbackWithheld,
    fallbackReason: fallback._meta?.withholdReason,
  };
}

async function runProdLive(scenario, token) {
  const { input } = scenario;
  const payload = {
    ...input,
    researchEnabled: true,
    skipAutoPipeline: true,
  };
  const t0 = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/content/blog`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(240_000),
    });
    const body = await res.json();
    const blog = body.blogContent;
    const elapsedMs = Date.now() - t0;
    if (!blog?.sections?.length) {
      return {
        pass: false,
        phase: "live",
        httpStatus: res.status,
        elapsedMs,
        withheld: body.withheld,
        mode: body.mode,
        reason: body.userMessage || body.meta?.withholdReason || "empty",
      };
    }
    const benchmark = assessVisitReviewBenchmark(blog, input);
    const spam = hasEngineSpamInPack(blog);
    const sovereign = isColumnistSovereignPack(blog);
    const pass =
      !spam &&
      benchmark.score >= 65 &&
      (sovereign || body.meta?.columnistSovereign || body.mode === "columnist_sovereign");
    return {
      pass,
      phase: "live",
      httpStatus: res.status,
      elapsedMs,
      mode: body.mode,
      generationMode: blog._meta?.generationMode || body.meta?.generationMode,
      benchmarkScore: benchmark.score,
      grade: benchmark.grade,
      spam,
      sovereign,
      chars: getBlogFullText(blog).replace(/\s/g, "").length,
      title: blog.title?.slice(0, 60),
    };
  } catch (err) {
    return {
      pass: false,
      phase: "live",
      elapsedMs: Date.now() - t0,
      reason: err.message || "fetch_error",
    };
  }
}

async function poolMap(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function writeReport(row) {
  appendFileSync(REPORT_JSONL, `${JSON.stringify(row)}\n`, "utf8");
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(REPORT_JSONL, "", "utf8");

  const scenarios = buildScenarios(BATCH_LIMIT);
  console.log(`Columnist batch: ${scenarios.length} combos (live sample: ${LIVE_LIMIT})`);

  const localResults = [];
  for (const scenario of scenarios) {
    const result = runLocalGate(scenario);
    const row = {
      id: scenario.id,
      phase: "local_gate",
      label: scenario.label,
      ...result,
      at: new Date().toISOString(),
    };
    writeReport(row);
    localResults.push(row);
  }

  const localPass = localResults.filter((r) => r.pass).length;
  console.log(`Local gate: ${localPass}/${localResults.length} pass`);

  let liveResults = [];
  if (LIVE_LIMIT > 0 && isOpenAIConfigured()) {
    const auth = await getE2eBearerToken();
    if (!auth.ok) {
      console.warn("Live skip: auth", auth.reason);
    } else {
      const liveScenarios = scenarios
        .filter((_, i) => i % Math.ceil(scenarios.length / LIVE_LIMIT) === 0)
        .slice(0, LIVE_LIMIT);
      console.log(`Prod live: ${liveScenarios.length} requests (concurrency ${LIVE_CONCURRENCY})…`);
      liveResults = await poolMap(liveScenarios, LIVE_CONCURRENCY, async (scenario) => {
        const row = {
          id: scenario.id,
          label: scenario.label,
          ...(await runProdLive(scenario, auth.token)),
          at: new Date().toISOString(),
        };
        writeReport(row);
        process.stdout.write(row.pass ? "." : "F");
        return row;
      });
      console.log("");
      const livePass = liveResults.filter((r) => r.pass).length;
      console.log(`Prod live: ${livePass}/${liveResults.length} pass`);
    }
  } else if (LIVE_LIMIT > 0) {
    console.log("Live skip: OPENAI not configured locally (set BRICLOG_BATCH_LIVE with prod auth)");
  }

  const summary = {
    at: new Date().toISOString(),
    version: "columnist-sovereign-batch-v1",
    batchLimit: BATCH_LIMIT,
    liveLimit: LIVE_LIMIT,
    local: {
      total: localResults.length,
      pass: localPass,
      passRate: Math.round((localPass / localResults.length) * 1000) / 10,
      failSamples: localResults.filter((r) => !r.pass).slice(0, 8).map((r) => ({
        id: r.id,
        label: r.label,
        eligible: r.eligible,
        needsUpgrade: r.needsUpgrade,
        fallbackReason: r.fallbackReason,
      })),
    },
    live: liveResults.length
      ? {
          total: liveResults.length,
          pass: liveResults.filter((r) => r.pass).length,
          passRate:
            Math.round(
              (liveResults.filter((r) => r.pass).length / liveResults.length) * 1000
            ) / 10,
          avgBenchmark:
            Math.round(
              liveResults.reduce((s, r) => s + (r.benchmarkScore || 0), 0) / liveResults.length
            ),
          failSamples: liveResults.filter((r) => !r.pass).slice(0, 5),
        }
      : null,
    columnistSovereignEnabled: isColumnistSovereignEnabled(),
    openaiConfigured: isOpenAIConfigured(),
  };

  writeFileSync(SUMMARY_JSON, JSON.stringify(summary, null, 2), "utf8");
  console.log(JSON.stringify(summary, null, 2));

  const localOk = localPass === localResults.length;
  const liveOk = !liveResults.length || liveResults.every((r) => r.pass);
  process.exit(localOk && liveOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
