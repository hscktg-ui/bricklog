/**
 * Prod blog API — 아직 prod 풀 감사 안 한 업종 키워드
 * Run: BASE_URL=https://briclog.ai node --import ./scripts/register-alias.mjs scripts/probe-untested-blog-categories.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { assessHumanWritingDelivery } from "../lib/product/humanWritingDeliveryGate.js";
import { resolvePublishReadiness } from "../lib/product/publishReadinessDisplay.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { countPlaceholderContamination } from "../lib/content/placeholderContaminationEngine.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { assessContentTrustReadable } from "../lib/quality/qualityTrustKpi.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "config", "blog-category-probe-report.json");

/** prod blog-content-inspection / user-journey 에 없던 업종 */
const SCENARIOS = [
  {
    id: "salon",
    label: "미용실 · 시즌 컬러",
    raw: {
      brandName: "레이어드살롱",
      region: "홍대",
      topic: "시즌 컬러 이벤트",
      mainKeyword: "홍대 염색",
      industry: "미용실",
      storeFeatures: "시즌 컬러·펌 전문",
      blogLengthTier: "short",
      v4Speaker: "real_use",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "academy",
    label: "학원 · 여름 특강",
    raw: {
      brandName: "수학플러스",
      region: "대구 동성로",
      topic: "여름방학 특강 모집",
      mainKeyword: "대구 수학학원",
      industry: "학원",
      storeFeatures: "소수정예·내신 대비",
      blogLengthTier: "short",
      v4Speaker: "expert_info",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "interior",
    label: "인테리어 · 리모델링",
    raw: {
      brandName: "우드앤라이트",
      region: "판교",
      topic: "거실 리모델링 상담",
      mainKeyword: "판교 인테리어",
      industry: "인테리어/리모델링",
      storeFeatures: "거실·주방 리모델링",
      blogLengthTier: "short",
      v4Speaker: "column",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "flower",
    label: "꽃집 · 어버이날",
    raw: {
      brandName: "플로라하우스",
      region: "부산 해운대",
      topic: "어버이날 꽃다발 예약",
      mainKeyword: "해운대 꽃집",
      industry: "꽃집",
      storeFeatures: "예약·픽업·배달",
      blogLengthTier: "short",
      v4Speaker: "plain_review",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "craft",
    label: "공방 · 원데이 클래스",
    raw: {
      brandName: "도자기온",
      region: "이천",
      topic: "원데이 클래스 오픈",
      mainKeyword: "도자기 클래스",
      industry: "공방",
      storeFeatures: "도자기 체험·소품",
      blogLengthTier: "short",
      v4Speaker: "essay",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "salon_retry",
    label: "미용실 · 시즌 컬러 (재시도)",
    raw: {
      brandName: "레이어드살롱",
      region: "홍대",
      topic: "시즌 컬러 이벤트",
      mainKeyword: "홍대 염색",
      industry: "미용실",
      storeFeatures: "시즌 컬러·펌 전문",
      blogLengthTier: "short",
      v4Speaker: "real_use",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "pension",
    label: "펜션 · 비수기 할인",
    raw: {
      brandName: "애월바다펜션",
      region: "제주 애월",
      topic: "비수기 장박 할인",
      mainKeyword: "제주 펜션",
      industry: "펜션",
      storeFeatures: "오션뷰·바비큐",
      blogLengthTier: "short",
      v4Speaker: "local_blogger",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "restaurant",
    label: "음식점 · 점심 특선",
    raw: {
      brandName: "한상차림",
      region: "강남",
      topic: "점심 특선 리뉴얼",
      mainKeyword: "강남 한식",
      industry: "음식점",
      storeFeatures: "한정식·단체석",
      blogLengthTier: "short",
      v4Speaker: "plain_review",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "flower_summer",
    label: "무인꽃집 · 여름 꽃 추천",
    raw: {
      brandName: "그랩앤고플라워",
      region: "파주 운정",
      topic: "여름 꽃 추천",
      mainKeyword: "여름 꽃 추천",
      industry: "꽃집",
      storeFeatures: "24시간 무인, 만원 꽃다발, 무인 픽업",
      blogLengthTier: "short",
      v4Speaker: "plain_review",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
  {
    id: "shop",
    label: "온라인 쇼핑몰 · 여름 출시",
    raw: {
      brandName: "데일리핏몰",
      region: "서울",
      topic: "여름 운동복 출시",
      mainKeyword: "운동복 추천",
      industry: "온라인 쇼핑몰",
      storeFeatures: "운동복·요가웨어",
      blogLengthTier: "short",
      v4Speaker: "column",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
  },
];

try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}
applyE2eTestCredentialsToEnv(process.env);

function excerpt(text, max = 280) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

async function generateResearchAsync(fv, token) {
  const res = await fetch(`${BASE}/api/content/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      researchQuery: `${fv.brandName} ${fv.region} ${fv.topic}`,
      researchTypes: ["web", "brand"],
      researchMode: "v2_axis",
      brandName: fv.brandName,
      region: fv.region,
      industry: fv.industry,
      mainKeyword: fv.mainKeyword,
      topic: fv.topic,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  return res.json();
}

async function runScenario(scenario, token) {
  const input = mergeWorkspaceBrandIntoInput({ ...scenario.raw }, null);
  const row = {
    id: scenario.id,
    label: scenario.label,
    industry: scenario.raw.industry,
    topic: scenario.raw.topic,
    mainKeyword: scenario.raw.mainKeyword,
    pass: false,
    apiStatus: null,
    ms: 0,
    researchMs: 0,
    sections: 0,
    chars: 0,
    mode: null,
    humanReady: false,
    deliveryGrade: null,
    publishLabel: null,
    placeholderHits: 0,
    evalScore: null,
    evalPass: false,
    trustReadable: false,
    contentWithheld: false,
    failReasons: [],
    openingExcerpt: "",
    error: null,
  };

  const t0 = Date.now();
  try {
    const tResearch = Date.now();
    const axis = await applyV2AxisResearch({
      pipelineInput: input,
      generateResearchAsync: (fv) => generateResearchAsync(fv, token),
      setResearchResult: () => {},
      onStep: () => {},
    });
    row.researchMs = Date.now() - tResearch;
    if (!axis.ok) {
      row.error = axis.userMessage || "axis_research_failed";
      row.ms = Date.now() - t0;
      return row;
    }

    const res = await fetch(`${BASE}/api/content/blog`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(slimBlogApiPayload(input)),
      signal: AbortSignal.timeout(280_000),
    });
    const body = await res.json().catch(() => ({}));
    row.apiStatus = res.status;
    row.ms = Date.now() - t0;
    row.mode = body.mode || null;

    if (res.status !== 200 || body.ok === false) {
      row.error =
        body.userMessage ||
        body.error?.message ||
        body.message ||
        `http_${res.status}`;
      row.errorDetail = body.error || null;
      return row;
    }

    const pack = body.blogContent || body.pack || {};
    const full = getBlogFullText(pack);
    row.sections = pack.sections?.length || 0;
    row.chars = countBlogBodyCharsWithSpaces(pack);
    row.openingExcerpt = excerpt(full.split("\n").find((l) => l.trim().length > 40) || full);
    row.placeholderHits = countPlaceholderContamination(full).total;

    process.env.BRICLOG_RESET_QUALITY = "true";
    const evaluation = assessContentEvaluation(pack, input);
    const trust = assessContentTrustReadable(pack, input);
    row.evalScore = evaluation.score;
    row.evalPass = evaluation.pass;
    row.trustReadable = trust.readable;
    row.contentWithheld = Boolean(
      pack._meta?.resetQualityWithheld ||
        pack._meta?.contentEvalPass === false ||
        body.withheld
    );
    row.evalHardFail = evaluation.hardFail;
    row.evalBreakdown = evaluation.breakdown;

    const human = assessHumanWritingDelivery(pack, input);
    const publish = resolvePublishReadiness(pack);
    row.humanReady = human.humanReady;
    row.deliveryGrade = pack._meta?.deliveryGrade || null;
    row.publishLabel = publish.label;
    row.failReasons = (pack._meta?.failReasons || human.reasons || []).slice(0, 8);
    row.pass =
      row.sections >= 2 &&
      row.chars >= 800 &&
      row.apiStatus === 200 &&
      row.trustReadable &&
      row.placeholderHits === 0;
    return row;
  } catch (e) {
    row.error = e?.message || String(e);
    row.ms = Date.now() - t0;
    return row;
  }
}

const filterIds = (process.env.PROBE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const activeScenarios = filterIds.length
  ? SCENARIOS.filter((s) => filterIds.includes(s.id))
  : SCENARIOS;

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}

console.log(`\n=== BLOG CATEGORY PROBE (${activeScenarios.length} scenarios) ===`);
console.log(`base: ${BASE}\n`);

const results = [];
for (const scenario of activeScenarios) {
  console.log(`→ ${scenario.label} (${scenario.raw.industry}) …`);
  const row = await runScenario(scenario, auth.token);
  results.push(row);
  const status = row.error
    ? `FAIL ${row.error}`
    : `${row.sections}섹션 · ${row.chars}자 · grade=${row.deliveryGrade || "?"} · eval=${row.evalScore} · placeholder=${row.placeholderHits} · trust=${row.trustReadable}`;
  console.log(`  ${status}`);
  if (row.openingExcerpt) console.log(`  "${row.openingExcerpt.slice(0, 120)}…"`);
}

const report = {
  at: new Date().toISOString(),
  base: BASE,
  note: "Prod blog API — 업종 미감사 (카페·가구 제외)",
  passCount: results.filter((r) => r.pass && !r.error).length,
  trustReadableCount: results.filter((r) => r.trustReadable && !r.error).length,
  evalPassCount: results.filter((r) => r.evalPass && !r.error).length,
  kpiTarget: 0.9,
  trustRate: results.length
    ? results.filter((r) => r.trustReadable && !r.error).length / results.length
    : 0,
  total: results.length,
  results,
};

mkdirSync(join(root, "config"), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`\nReport: ${OUT}`);
console.log(`pass: ${report.passCount}/${report.total}`);
console.log(
  `trust KPI: ${report.trustReadableCount}/${report.total} (${Math.round(report.trustRate * 100)}%, target 90%)`
);
