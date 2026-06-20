/**
 * 미감사 업종 — 로컬 파이프라인 전문 샘플 (prod API 차단 우회)
 * node --import ./scripts/register-alias.mjs scripts/probe-untested-local-samples.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { assessHumanWritingDelivery } from "../lib/product/humanWritingDeliveryGate.js";
import { assessContentTrustReadable } from "../lib/quality/qualityTrustKpi.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(root, "artifacts", "category-samples");

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
];

try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const { applyV2AxisResearch } = await import("../lib/content/applyV2AxisResearch.js");
const { runResearch } = await import("../lib/research/runResearch.js");
const { generateBlogWithLLMFirst } = await import("../lib/llm/contentOrchestrator.js");

function packToMarkdown(pack, input) {
  const lines = [];
  if (pack?.title) lines.push(`# ${pack.title}`, "");
  for (const s of pack?.sections || []) {
    if (s.heading) lines.push(`## ${s.heading}`, "");
    if (s.body) lines.push(s.body, "");
  }
  if (pack?.conclusion) lines.push("---", "", pack.conclusion);
  return lines.join("\n").trim();
}

async function runScenario(scenario) {
  const axis = await applyV2AxisResearch({
    pipelineInput: { ...scenario.raw },
    generateResearchAsync: (input) =>
      runResearch({
        query: `${input.brandName} ${input.region} ${input.topic}`,
        types: ["web", "brand"],
        brandContext: {
          brandName: input.brandName,
          region: input.region,
          topic: input.topic,
          industry: input.industry,
        },
        mode: "v2_axis",
      }).then((research) => ({ research })),
  });
  if (!axis.ok) return { scenario, error: axis.userMessage || "research_failed" };

  const input = {
    ...scenario.raw,
    ...axis.pipelineInput,
    v2PreWriteVerified: true,
    _skipDefaultResearch: true,
  };

  const r = await generateBlogWithLLMFirst(input);
  let pack =
    finalizeContentQualityForDelivery(r.blogContent || {}, input, "blog") ||
    r.blogContent ||
    {};
  const evaluation = assessContentEvaluation(pack, input);
  const human = assessHumanWritingDelivery(pack, input);
  const trust = assessContentTrustReadable(pack, input);

  return {
    scenario,
    pack,
    input,
    mode: r.mode,
    withheld: r.withheld,
    chars: countBlogBodyCharsWithSpaces(pack),
    sections: pack.sections?.length || 0,
    evalScore: evaluation.score,
    evalPass: evaluation.pass,
    trustReadable: trust.readable,
    humanReady: human.humanReady,
    failReasons: (pack._meta?.failReasons || human.reasons || r.meta?.failReasons || []).slice(
      0,
      10
    ),
    researchFacts: axis.factCount,
  };
}

const filterIds = (process.env.PROBE_IDS || "salon,academy,craft")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const active = SCENARIOS.filter((s) => filterIds.includes(s.id));

mkdirSync(OUT_DIR, { recursive: true });
console.log(`\n=== LOCAL UNTESTED SAMPLES (${active.length})\n`);

const summary = [];
for (const scenario of active) {
  console.log(`→ ${scenario.label} …`);
  const t0 = Date.now();
  try {
    const result = await runScenario(scenario);
    const ms = Date.now() - t0;
    if (result.error) {
      console.log(`  FAIL: ${result.error}`);
      summary.push({ id: scenario.id, error: result.error, ms });
      continue;
    }
    const md = packToMarkdown(result.pack, result.input);
    const header = [
      `# ${scenario.label}`,
      "",
      `- 업종: ${scenario.raw.industry} · 브랜드: ${scenario.raw.brandName} (${scenario.raw.region})`,
      `- 조사 팩트: ${result.researchFacts} · mode: ${result.mode}`,
      `- ${result.sections}섹션 · ${result.chars}자 · eval=${result.evalScore} · trust=${result.trustReadable} · humanReady=${result.humanReady}`,
      `- fail: ${result.failReasons.join(", ") || "—"}`,
      result.withheld ? "- prod API 기준 withheld 가능" : "",
      "",
      "---",
      "",
      md,
    ]
      .filter(Boolean)
      .join("\n");
    const outPath = join(OUT_DIR, `${scenario.id}-local.md`);
    writeFileSync(outPath, header, "utf8");
    console.log(
      `  ${result.sections}섹 · ${result.chars}자 · eval=${result.evalScore} · trust=${result.trustReadable} (${ms}ms)`
    );
    summary.push({
      id: scenario.id,
      label: scenario.label,
      sections: result.sections,
      chars: result.chars,
      evalScore: result.evalScore,
      trustReadable: result.trustReadable,
      humanReady: result.humanReady,
      failReasons: result.failReasons,
      path: outPath,
      ms,
    });
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    summary.push({ id: scenario.id, error: e.message });
  }
}

writeFileSync(
  join(OUT_DIR, "local-summary.json"),
  `${JSON.stringify({ at: new Date().toISOString(), summary }, null, 2)}\n`,
  "utf8"
);
console.log(`\nDone → ${OUT_DIR}`);
