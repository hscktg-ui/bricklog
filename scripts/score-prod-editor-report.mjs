/**
 * Prod 1건 생성 + 30년 에디터 항목별 등급 리포트
 * Run: node --import ./scripts/register-alias.mjs scripts/score-prod-editor-report.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { loadEnvLocal } from "./lib/loadEnvLocal.mjs";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import {
  assessVisitReviewBenchmark,
  formatVisitReviewBenchmarkReport,
} from "../lib/product/visitReviewBenchmarkRubric.js";
import {
  collectSubstantiveResearchFacts,
  evaluateEditorGradeResearchGate,
  countConcreteFactsWovenInBody,
} from "../lib/product/editorGradeResearchGate.js";
import { assessUneditedPublishGrade } from "../lib/product/uneditedPublishGradeGate.js";
import { assessProfessionalEditorDelivery } from "../lib/product/professionalEditorGradeEngine.js";
import { getCustomerBlogSlaMs } from "../lib/config/briclogDefaults.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvLocal(ROOT);
applyE2eTestCredentialsToEnv(process.env);

const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");

const PERSONA = process.env.PROBE_PERSONA_JSON
  ? JSON.parse(process.env.PROBE_PERSONA_JSON)
  : {
      brandName: "여주목마",
      region: "여주",
      topic: "수영장 여름 시즌 오픈, 직접 다녀왔어요",
      mainKeyword: "여주목마 수영장",
      industry: "레저/체험",
      storeFeatures: "실외 수영장·물놀이, 식당·카페, 승마 체험, 가족 나들이",
      blogLengthTier: "short",
      researchEnabled: true,
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    };

function scoreToLetter(score, passMin = 85) {
  if (score >= 90) return "A";
  if (score >= passMin) return "A-";
  if (score >= 80) return "B+";
  if (score >= 76) return "B";
  if (score >= 70) return "B-";
  if (score >= 64) return "C";
  if (score >= 50) return "D";
  return "F";
}

function dimRow(label, score, max, note = "") {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  return {
    label,
    score,
    max,
    pct,
    grade: scoreToLetter(pct),
    note,
  };
}

async function authHeaders(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function generateResearchAsync(fv, token) {
  const res = await fetch(`${BASE}/api/content/research`, {
    method: "POST",
    headers: await authHeaders(token),
    body: JSON.stringify({
      researchQuery: `${fv.brandName} ${fv.topic}`,
      researchTypes: ["web", "brand"],
      researchMode: "v2_axis",
      brandName: fv.brandName,
      region: fv.region,
      topic: fv.topic,
      mainKeyword: fv.mainKeyword,
      industry: fv.industry,
    }),
    signal: AbortSignal.timeout(55_000),
  });
  return res.json();
}

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}

console.log(`\n=== Prod 등급 체크 · ${PERSONA.brandName} ===\n`);

let pipelineInput = mergeWorkspaceBrandIntoInput(PERSONA);
const researchT0 = Date.now();
const axis = await applyV2AxisResearch({
  pipelineInput,
  generateResearchAsync: (fv) => generateResearchAsync(fv, auth.token),
  onStep: (s) => console.log("  research:", s),
});
const researchMs = Date.now() - researchT0;
if (!axis.ok) {
  console.error(axis.userMessage);
  process.exit(1);
}
Object.assign(pipelineInput, axis.input);
console.log(`  조사 완료 ${Math.round(researchMs / 1000)}s · facts ${axis.factCount}\n`);

const scoreInput = { ...pipelineInput, researchFacts: pipelineInput.researchFacts || [] };
const payload = slimBlogApiPayload(pipelineInput);
const blogT0 = Date.now();
const res = await fetch(`${BASE}/api/content/blog`, {
  method: "POST",
  headers: await authHeaders(auth.token),
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(125_000),
});
const body = await res.json();
const blogMs = Date.now() - blogT0;
const totalMs = researchMs + blogMs;
const blog = body.blogContent || { sections: [] };
const chars = countBlogBodyCharsWithSpaces(blog);

const bench = blog?._meta?.visitReviewBenchmark || assessVisitReviewBenchmark(blog, scoreInput);
const editorGate = evaluateEditorGradeResearchGate(scoreInput);
const substantive = collectSubstantiveResearchFacts(scoreInput);
const woven = countConcreteFactsWovenInBody(getBlogFullText(blog), scoreInput);
const unedited = assessUneditedPublishGrade(blog, scoreInput);
const editorDelivery = assessProfessionalEditorDelivery(blog, scoreInput);
const dims = bench.dimensions || {};

const researchDim = dims.research || { score: 0, max: 15 };
const researchPct =
  researchDim.skipped && researchDim.total >= 2
    ? Math.round(((woven.woven || 0) / Math.max(woven.total, 1)) * 100)
    : Math.round(((researchDim.ratio ?? woven.woven / Math.max(woven.total, 1)) || 0) * 100);

const report = {
  persona: PERSONA.brandName,
  topic: PERSONA.topic,
  generatedAt: new Date().toISOString(),
  timing: {
    researchSec: Math.round(researchMs / 1000),
    blogSec: Math.round(blogMs / 1000),
    totalSec: Math.round(totalMs / 1000),
    slaSec: Math.round(getCustomerBlogSlaMs() / 1000),
    slaOk: totalMs <= getCustomerBlogSlaMs(),
  },
  delivery: {
    mode: body.mode,
    withheld: body.withheld,
    ok: body.ok,
    chars,
    sections: blog.sections?.length || 0,
  },
  grades: [
    dimRow("파이프라인·송출", body.mode === "columnist_sovereign" && !body.withheld ? 92 : body.withheld ? 40 : 55, 100,
      body.mode === "server_error" ? "server_error" : body.withheld ? "withheld" : body.mode),
    dimRow("구조(기승전결)", dims.structure?.score ?? 0, dims.structure?.max ?? 20),
    dimRow("현장·관찰", dims.field?.score ?? 0, dims.field?.max ?? 20),
    dimRow("문체·산문", dims.prose?.score ?? 0, dims.prose?.max ?? 15),
    dimRow("엔진 스팸 없음", dims.spam?.score ?? 0, dims.spam?.max ?? 20,
      (bench.hardFails || []).includes("engine_spam") ? "engine_spam" : ""),
    dimRow("조사 반영", researchDim.score ?? 0, researchDim.max ?? 15,
      `woven ${woven.woven}/${woven.total} · substantive ${substantive.length}`),
    dimRow("브랜드·지역", dims.brand?.score ?? 0, dims.brand?.max ?? 10),
    {
      label: "벤치마크 종합",
      score: bench.score,
      max: 100,
      pct: bench.score,
      grade: bench.grade || scoreToLetter(bench.score),
      note: bench.publishOk ? "publishOk" : `hardFails: ${(bench.hardFails || []).join(", ") || "none"}`,
    },
    {
      label: "조사 게이트",
      score: editorGate.ok ? 90 : Math.min(70, editorGate.substantiveCount * 25),
      max: 100,
      pct: editorGate.ok ? 90 : editorGate.substantiveCount * 25,
      grade: editorGate.ok
        ? editorGate.substantiveCount >= 3
          ? "A"
          : "A-"
        : scoreToLetter(editorGate.substantiveCount * 25),
      note: `${editorGate.substantiveCount} substantive facts`,
    },
    {
      label: "무편집 발행",
      score: unedited.score,
      max: 100,
      pct: unedited.score,
      grade: unedited.ok ? unedited.grade : scoreToLetter(unedited.score),
      note: unedited.ok ? "pass" : (unedited.reasons || []).join(", "),
    },
    {
      label: "30년 에디터 송출",
      score: editorDelivery.score,
      max: 100,
      pct: editorDelivery.score,
      grade: scoreToLetter(editorDelivery.score, 88),
      note: editorDelivery.ok ? editorDelivery.labelKo : (editorDelivery.reasons || []).join(", "),
    },
    {
      label: "신뢰·고객 노출",
      score: !body.withheld && bench.publishOk && body.ok !== false ? 90 : body.withheld ? 85 : 45,
      max: 100,
      pct: !body.withheld && bench.publishOk ? 90 : body.withheld ? 85 : 45,
      grade: body.withheld ? "A-" : !body.withheld && bench.publishOk ? "A" : "F",
      note: body.withheld ? "withheld(미노출)" : "노출됨",
    },
    {
      label: "SLA(2분)",
      score: totalMs <= getCustomerBlogSlaMs() ? 95 : Math.max(0, 100 - Math.round((totalMs - getCustomerBlogSlaMs()) / 1000) * 3),
      max: 100,
      pct: totalMs <= getCustomerBlogSlaMs() ? 95 : Math.max(0, 100 - Math.round((totalMs - getCustomerBlogSlaMs()) / 1000) * 3),
      grade: totalMs <= getCustomerBlogSlaMs() ? "A" : totalMs <= getCustomerBlogSlaMs() + 30_000 ? "B" : "D",
      note: `${Math.round(totalMs / 1000)}s / ${Math.round(getCustomerBlogSlaMs() / 1000)}s`,
    },
  ],
};

const outDir = join(ROOT, "artifacts", "editor-grade-report");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest.json"), JSON.stringify(report, null, 2), "utf8");

console.log("| 항목 | 점수 | 등급 | 비고 |");
console.log("|------|------|------|------|");
for (const row of report.grades) {
  const sc = row.max <= 20 ? `${row.score}/${row.max}` : `${row.score ?? row.pct}`;
  console.log(`| ${row.label} | ${sc} | **${row.grade}** | ${row.note || ""} |`);
}
console.log(`\n조사 ${report.timing.researchSec}s + 글 ${report.timing.blogSec}s = **${report.timing.totalSec}s** (SLA ${report.timing.slaSec}s ${report.timing.slaOk ? "✅" : "❌"})`);
console.log(`mode=${report.delivery.mode} withheld=${report.delivery.withheld} benchmark=${bench.score} publishOk=${bench.publishOk}`);
console.log("\n" + formatVisitReviewBenchmarkReport(bench, PERSONA.brandName));
console.log(`\nReport: artifacts/editor-grade-report/latest.json`);
