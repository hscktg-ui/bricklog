/**
 * Prod 10건 — 직원 피드백 반영 전후 비교용 배치
 * Run: node --import ./scripts/register-alias.mjs scripts/probe-ten-post-batch.mjs
 */
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { applySimpleWorkspaceDefaults } from "../lib/product/simpleWorkspaceDefaults.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import {
  assessVisitReviewBenchmark,
} from "../lib/product/visitReviewBenchmarkRubric.js";
import { assessProfessionalEditorDelivery } from "../lib/product/professionalEditorGradeEngine.js";
import { assessUnifiedBlogDelivery } from "../lib/product/unifiedDeliveryGate.js";
import {
  collectSubstantiveResearchFacts,
  evaluateEditorGradeResearchGate,
} from "../lib/product/editorGradeResearchGate.js";
import { getCustomerBlogSlaMs } from "../lib/config/briclogDefaults.js";
import {
  getBlogGenerationProbeTimeoutMs,
  getProbeBatchGapMs,
} from "../lib/config/briclogFastPipeline.js";
import { summarizeEngineHealthFromBatch } from "./engine-health-report.mjs";
import { needsGenerationContextBeat } from "../lib/product/generationContextBeat.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT_DIR = join(root, "artifacts", "ten-post-batch");
const BASELINE_PATH = join(OUT_DIR, "baseline-pre-ux.json");

const SCENARIOS = [
  {
    id: "pension",
    label: "펜션 · 장박 할인",
    raw: {
      brandName: "애월바다펜션",
      region: "제주 애월",
      topic: "비수기 장박 할인, 직접 다녀왔어요",
      mainKeyword: "제주 펜션",
      industry: "펜션",
      storeFeatures: "오션뷰 객실·바비큐장·주차 무료·7박 할인",
      blogLengthTier: "short",
    },
  },
  {
    id: "mattress",
    label: "침대·매트리스 · 김포",
    raw: {
      brandName: "금성침대",
      region: "김포",
      topic: "김포 가구단지 매트리스 추천",
      mainKeyword: "김포 매트리스",
      industry: "침대·매트리스",
      storeFeatures: "매트리스 체험존·모션베드 시연·무이자 할부·배송 설치",
      blogLengthTier: "short",
    },
  },
  {
    id: "restaurant",
    label: "음식점 · 점심 특선",
    raw: {
      brandName: "한상차림",
      region: "강남",
      topic: "점심 특선 리뉴얼, 직접 다녀왔어요",
      mainKeyword: "강남 한식",
      industry: "음식점",
      storeFeatures: "점심 특선 9800원·단체석 12인·예약·계절 반찬",
      blogLengthTier: "short",
    },
  },
  {
    id: "leisure",
    label: "레저 · 여주목마",
    raw: {
      brandName: "여주목마",
      region: "여주",
      topic: "수영장 여름 시즌 오픈, 직접 다녀왔어요",
      mainKeyword: "여주목마 수영장",
      industry: "레저/체험",
      storeFeatures: "실외 수영장·물놀이·승마 체험·가족 나들이",
      blogLengthTier: "short",
    },
  },
  {
    id: "cafe",
    label: "카페 · 브런치",
    raw: {
      brandName: "모닝브루",
      region: "서울 강남",
      topic: "봄 시즌 브런치 메뉴",
      mainKeyword: "강남 브런치",
      industry: "카페",
      storeFeatures: "시즌 브런치·원두 로스팅·창가 좌석",
      blogLengthTier: "short",
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
      industry: "인테리어",
      storeFeatures: "3D 설계·맞춤 상담·조명·수납",
      blogLengthTier: "short",
    },
  },
  {
    id: "flower",
    label: "꽃집 · 어버이날",
    raw: {
      brandName: "꽃담",
      region: "부산 해운대",
      topic: "어버이날 꽃다발 예약",
      mainKeyword: "해운대 꽃집",
      industry: "꽃집",
      storeFeatures: "당일 제작·픽업·맞춤 포장",
      blogLengthTier: "short",
    },
  },
  {
    id: "salon",
    label: "미용실 · 시즌 컬러",
    raw: {
      brandName: "레이어드살롱",
      region: "서울 홍대",
      topic: "5월 컬러 이벤트",
      mainKeyword: "홍대 염색",
      industry: "미용실",
      storeFeatures: "시즌 컬러·두피 케어·디자이너 상담",
      blogLengthTier: "short",
    },
  },
  {
    id: "cafe_thin",
    label: "카페 · 3칸만 (얇은 입력)",
    thin: true,
    raw: {
      brandName: "산책카페",
      region: "전주",
      topic: "한옥마을 카페 데이트",
      industry: "카페",
      blogLengthTier: "short",
    },
  },
  {
    id: "mattress_thin",
    label: "매트리스 · 3칸만 (얇은 입력)",
    thin: true,
    raw: {
      brandName: "드림슬립",
      region: "수원",
      topic: "매트리스 체험 후기",
      industry: "침대·매트리스",
      blogLengthTier: "short",
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
process.env.BRICLOG_RESET_QUALITY = "true";

const SLA_MS = getCustomerBlogSlaMs();
const MAX_ATTEMPTS = Math.max(1, Number(process.env.PROBE_MAX_ATTEMPTS) || 3);
const BATCH_GAP_MS = getProbeBatchGapMs();
const PROBE_TIMEOUT_MS = getBlogGenerationProbeTimeoutMs();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateResearchAsync(fv, token) {
  const res = await fetch(`${BASE}/api/content/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      researchQuery: `${fv.brandName} ${fv.topic}`,
      researchTypes: fv.researchTypes || ["latest", "local", "keyword", "trend"],
      researchMode: "v2_axis",
      brandName: fv.brandName,
      region: fv.region,
      industry: fv.industry,
      mainKeyword: fv.mainKeyword || fv.topic,
      topic: fv.topic,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  return res.json();
}

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
const report = {
  at: new Date().toISOString(),
  base: BASE,
  version: "ten-post-batch-v1",
  slaMs: SLA_MS,
  simpleWorkspaceDefaults: true,
  results: [],
};

let baseline = null;
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
} catch {
  baseline = {
    note: "pre-ux-deploy reference (artifacts)",
    randomBrandStory: { benchmark: 100, grade: "A", slaOk: true, editorGateOk: true },
    editorCategoryEval: { restaurant: { benchmark: 94, grade: "A" }, pension: { benchmark: 100, grade: "A" }, interior: { benchmark: 97, grade: "A" } },
    crossChannelBatch: { passRate: 81.6, blogPassRate: 97.4 },
  };
}

console.log(`\n=== 10건 prod 배치 (${BASE}) gap=${BATCH_GAP_MS}ms ===\n`);

const PRE_SLOW_PATH = join(OUT_DIR, "latest-pre-slow-fallback.json");
try {
  writeFileSync(PRE_SLOW_PATH, readFileSync(join(OUT_DIR, "latest.json"), "utf8"));
} catch {
  /* no prior run */
}

for (const scenario of SCENARIOS) {
  let input = mergeWorkspaceBrandIntoInput({
    ...scenario.raw,
    researchEnabled: true,
    skipAutoPipeline: true,
    v2AxisRequired: true,
    v2PipelineEnforced: true,
    v3EngineEnforced: true,
  });
  input = applySimpleWorkspaceDefaults(input);

  const row = {
    id: scenario.id,
    label: scenario.label,
    thin: Boolean(scenario.thin),
    needsContextBeat: needsGenerationContextBeat(input),
    v4Speaker: input.v4Speaker,
    researchTypes: input.researchTypes,
  };
  const t0 = Date.now();

  try {
    const axis = await applyV2AxisResearch({
      pipelineInput: input,
      generateResearchAsync: (fv) => generateResearchAsync(fv, auth.token),
      onStep: (s) => process.stdout.write(`  [${scenario.id}] ${s}\n`),
    });
    if (!axis.ok) throw new Error(axis.userMessage || "research_failed");
    Object.assign(input, axis.input);

    const gate = evaluateEditorGradeResearchGate(input);
    row.editorGate = { ok: gate.ok, count: gate.substantiveCount, min: gate.minRequired };

    let body = null;
    let res = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      row.attempts = attempt;
      res = await fetch(`${BASE}/api/content/blog`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify(
          slimBlogApiPayload({ ...input, regenVariation: attempt > 1 ? Date.now() + attempt : undefined })
        ),
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      body = await res.json();
      if (body.blogContent?.sections?.length && !body.withheld) break;
      if (attempt < MAX_ATTEMPTS) {
        process.stdout.write(`  [${scenario.id}] retry ${attempt + 1}/${MAX_ATTEMPTS} (${body.mode})\n`);
      }
    }
    row.ms = Date.now() - t0;
    row.slaOk = row.ms <= SLA_MS;
    row.apiStatus = res.status;
    row.withheld = Boolean(body.withheld);
    row.mode = body.mode;
    row.columnistSlowFallback = Boolean(body.meta?.columnistSlowFallback);
    row.columnistFailDiagnostic = body.meta?.columnistFailDiagnostic || null;

    if (body.withheld || !body.blogContent?.sections?.length) {
      row.pass = false;
      row.error = body.userMessage || body.meta?.withholdReason || `http_${res.status}`;
      report.results.push(row);
      const diag = row.columnistFailDiagnostic?.code ? ` [${row.columnistFailDiagnostic.code}]` : "";
      console.log(`✗ ${scenario.label}: ${row.error}${diag} (${row.ms}ms)\n`);
      if (BATCH_GAP_MS > 0) await sleep(BATCH_GAP_MS);
      continue;
    }

    const pack = body.blogContent;
    const bench = assessVisitReviewBenchmark(pack, input);
    const editor = assessProfessionalEditorDelivery(pack, input);
    const substantive = collectSubstantiveResearchFacts(input);

    const unified = assessUnifiedBlogDelivery(pack, input);

    row.pass = unified.pass;
    row.unified = {
      pass: unified.pass,
      reasons: unified.reasons,
    };
    row.chars = countBlogBodyCharsWithSpaces(pack);
    row.sections = pack.sections?.length || 0;
    row.title = (pack.title || pack.representativeTitle || "").slice(0, 80);
    row.benchmark = { score: bench.score, grade: bench.grade, publishOk: bench.publishOk, hardFails: bench.hardFails || [] };
    row.editor = { score: editor.score, ok: editor.ok };
    row.substantiveFacts = substantive.length;
    row.generationMode = pack._meta?.generationMode || body.meta?.generationMode;
    row.deliveryValue = body.meta?.deliveryValue || pack._meta?.deliveryValueExposure || null;
    row.deliveryValueChecksOk = Boolean(
      row.deliveryValue?.checks?.filter((c) => c.id === "research" && c.ok).length
    );

    report.results.push(row);
    const mark = row.pass ? "✓" : "△";
    console.log(
      `${mark} ${scenario.label}: bench ${bench.score}(${bench.grade}) editor ${editor.score} ${row.ms}ms sla=${row.slaOk ? "OK" : "SLOW"} mode=${row.mode}${row.columnistSlowFallback ? " slow-fb" : ""}\n`
    );
  } catch (err) {
    row.ms = Date.now() - t0;
    row.pass = false;
    row.error = err.message;
    report.results.push(row);
    console.log(`✗ ${scenario.label}: ${err.message}\n`);
  }
  if (BATCH_GAP_MS > 0) await sleep(BATCH_GAP_MS);
}

const passed = report.results.filter((r) => r.pass).length;
const withheld = report.results.filter((r) => r.withheld || r.error).length;
const avgBench =
  report.results.filter((r) => r.benchmark?.score).reduce((s, r) => s + r.benchmark.score, 0) /
  Math.max(1, report.results.filter((r) => r.benchmark?.score).length);
const avgMs =
  report.results.filter((r) => r.ms).reduce((s, r) => s + r.ms, 0) /
  Math.max(1, report.results.filter((r) => r.ms).length);
const slaPass = report.results.filter((r) => r.slaOk).length;

report.summary = {
  total: report.results.length,
  pass: passed,
  passRate: Math.round((passed / report.results.length) * 1000) / 10,
  withheldOrError: withheld,
  avgBenchmark: Math.round(avgBench * 10) / 10,
  avgMs: Math.round(avgMs),
  slaPass,
  slaPassRate: Math.round((slaPass / report.results.length) * 1000) / 10,
  maxAttempts: MAX_ATTEMPTS,
};

report.comparison = {
  baseline,
  delta: {
    passRateVsCrossChannelBlog: `${report.summary.passRate}% vs ${baseline.crossChannelBatch?.blogPassRate ?? "?"}% (cross-channel blog, Jun 23)`,
    avgBenchmarkVsRandomStory: `${report.summary.avgBenchmark} vs ${baseline.randomBrandStory?.benchmark ?? 100} (random-brand-story)`,
  },
};

writeFileSync(join(OUT_DIR, "latest.json"), JSON.stringify(report, null, 2), "utf8");
writeFileSync(join(OUT_DIR, "latest-summary.json"), JSON.stringify(report.summary, null, 2), "utf8");

const healthDir = join(root, "artifacts", "engine-health");
mkdirSync(healthDir, { recursive: true });
const health = summarizeEngineHealthFromBatch(report);
writeFileSync(join(healthDir, "latest-summary.json"), JSON.stringify(health, null, 2), "utf8");

console.log("\n=== SUMMARY ===");
console.log(JSON.stringify(report.summary, null, 2));
console.log("\nReport:", join(OUT_DIR, "latest.json"));
process.exit(passed >= 8 ? 0 : 1);
