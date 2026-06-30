/**
 * 직원 피드백 핵심 시나리오 prod 검증 (5건)
 * Run: node --import ./scripts/register-alias.mjs scripts/probe-employee-feedback-prod.mjs
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
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { assessVisitReviewBenchmark } from "../lib/product/visitReviewBenchmarkRubric.js";
import { assessProfessionalEditorDelivery } from "../lib/product/professionalEditorGradeEngine.js";
import {
  collectSubstantiveResearchFacts,
  evaluateEditorGradeResearchGate,
} from "../lib/product/editorGradeResearchGate.js";
import { needsGenerationContextBeat } from "../lib/product/generationContextBeat.js";
import { getCustomerBlogSlaMs } from "../lib/config/briclogDefaults.js";
import { getBlogGenerationProbeTimeoutMs } from "../lib/config/briclogFastPipeline.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "artifacts", "employee-feedback-prod", "latest.json");

const SCENARIOS = [
  {
    id: "mattress",
    feedback: "침대·매트리스 업종 + 가구 비트",
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
    id: "pension",
    feedback: "4필드·현장 한 줄 + 후기형 주제",
    raw: {
      brandName: "애월바다펜션",
      region: "제주 애월",
      topic: "비수기 장박 할인, 직접 다녀왔어요",
      industry: "펜션",
      storeFeatures: "오션뷰 객실·바비큐장·주차 무료·7박 할인",
      blogLengthTier: "short",
    },
  },
  {
    id: "restaurant",
    feedback: "방문 후기형 + brand_intro 심플",
    raw: {
      brandName: "한상차림",
      region: "강남",
      topic: "점심 특선 리뉴얼, 직접 다녀왔어요",
      industry: "음식점",
      storeFeatures: "점심 특선 9800원·단체석 12인·예약·계절 반찬",
      blogLengthTier: "short",
    },
  },
  {
    id: "cafe_thin",
    feedback: "얇은 입력 → 팩트 부족 메시지 (N/M)",
    thin: true,
    expectWithhold: "research_density_gate",
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
    feedback: "얇은 입력 → context beat 필요",
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

mkdirSync(dirname(OUT), { recursive: true });
const report = { at: new Date().toISOString(), base: BASE, results: [] };

console.log(`\n=== 직원 피드백 prod 검증 (${BASE}) ===\n`);

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
    feedback: scenario.feedback,
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
    row.editorGate = { ok: gate.ok, count: gate.substantiveCount, min: gate.minRequired, msg: gate.userMessage };

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
        signal: AbortSignal.timeout(getBlogGenerationProbeTimeoutMs()),
      });
      body = await res.json();
      if (body.blogContent?.sections?.length && !body.withheld) break;
      if (attempt < MAX_ATTEMPTS) {
        process.stdout.write(`  [${scenario.id}] retry ${attempt + 1}/${MAX_ATTEMPTS} (${body.mode})\n`);
      }
    }
    row.ms = Date.now() - t0;
    row.slaOk = row.ms <= SLA_MS;
    row.mode = body.mode;
    row.withheld = Boolean(body.withheld);
    row.userMessage = body.userMessage || null;

    if (scenario.expectWithhold) {
      row.pass = body.mode === scenario.expectWithhold || /현재 \d+\/\d+개/.test(body.userMessage || "");
      row.feedbackOk = row.pass;
      report.results.push(row);
      console.log(
        `${row.pass ? "✓" : "✗"} ${scenario.id} (${scenario.feedback}): mode=${body.mode} msg=${(body.userMessage || "").slice(0, 60)}\n`
      );
      continue;
    }

    if (body.withheld || !body.blogContent?.sections?.length) {
      row.pass = false;
      row.error = body.userMessage || body.meta?.withholdReason;
      report.results.push(row);
      console.log(`✗ ${scenario.id}: ${row.error}\n`);
      continue;
    }

    const pack = body.blogContent;
    const bench = assessVisitReviewBenchmark(pack, input);
    const editor = assessProfessionalEditorDelivery(pack, input);
    row.pass = bench.publishOk && bench.score >= 76 && editor.ok;
    row.benchmark = { score: bench.score, grade: bench.grade };
    row.editor = { score: editor.score, ok: editor.ok };
    row.chars = countBlogBodyCharsWithSpaces(pack);
    row.substantiveFacts = collectSubstantiveResearchFacts(input).length;
    report.results.push(row);
    console.log(
      `${row.pass ? "✓" : "△"} ${scenario.id}: bench ${bench.score}(${bench.grade}) speaker=${row.v4Speaker} ${row.ms}ms\n`
    );
  } catch (err) {
    row.pass = false;
    row.error = err.message;
    row.ms = Date.now() - t0;
    report.results.push(row);
    console.log(`✗ ${scenario.id}: ${err.message}\n`);
  }
}

const pass = report.results.filter((r) => r.pass).length;
report.summary = { total: report.results.length, pass, passRate: Math.round((pass / report.results.length) * 100) };
writeFileSync(OUT, JSON.stringify(report, null, 2));

console.log("=== SUMMARY ===");
console.log(JSON.stringify(report.summary, null, 2));
console.log(`Report: ${OUT}\n`);

process.exit(pass === report.results.length ? 0 : 1);
