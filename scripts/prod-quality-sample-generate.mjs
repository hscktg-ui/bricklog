/**
 * Prod E2E — Research First 품질 샘플 (꽃·가구 체어)
 * BASE_URL=https://briclog.ai node --import ./scripts/register-alias.mjs scripts/prod-quality-sample-generate.mjs
 */
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countPlaceholderContamination } from "../lib/content/placeholderContaminationEngine.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT_DIR = join(root, "artifacts", "prod-quality-samples");

const ONLY = (process.env.PROD_SAMPLE_ID || "").trim();

const SCENARIOS = [
  {
    id: "flower_summer",
    label: "그랩앤고플라워 · 여름 꽃 추천",
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
    id: "furniture_stressless",
    label: "에이스침대 · STRESSLESS MINT LB D200",
    raw: {
      brandName: "에이스침대",
      region: "경기도 용인",
      topic: "스트레스리스 다이닝체어 STRESSLESS MINT LB D200",
      mainKeyword: "스트레스리스 다이닝체어 STRESSLESS",
      industry: "가구",
      storeFeatures: "프랜차이즈 쇼룸, 스트레스리스 체어 전시",
      blogLengthTier: "short",
      v4Speaker: "plain_review",
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
      storeFeatures: fv.storeFeatures,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  return res.json();
}

function packToMarkdown(scenario, pack, meta) {
  const lines = [
    `# ${pack.title || scenario.label}`,
    "",
    `> 시나리오: ${scenario.label}`,
    `> eval: ${meta.evalScore} · placeholder: ${meta.placeholderHits} · chars: ${meta.chars}`,
    "",
  ];
  for (const s of pack.sections || []) {
    if (s.heading) lines.push(`## ${s.heading}`, "");
    lines.push(String(s.body || "").trim(), "");
  }
  if (pack.conclusion) {
    lines.push("## 마무리", "", String(pack.conclusion).trim(), "");
  }
  return lines.join("\n");
}

async function runScenario(scenario, token) {
  const input = { ...scenario.raw };
  const row = {
    id: scenario.id,
    label: scenario.label,
    ok: false,
    apiStatus: null,
    researchOk: false,
    ms: 0,
    evalScore: null,
    evalPass: false,
    placeholderHits: 0,
    chars: 0,
    sections: 0,
    withheld: false,
    error: null,
    failReasons: [],
    title: null,
    fullText: "",
    markdown: "",
  };

  const t0 = Date.now();
  try {
    const axis = await applyV2AxisResearch({
      pipelineInput: input,
      generateResearchAsync: (fv) => generateResearchAsync(fv, token),
      setResearchResult: () => {},
      onStep: () => {},
    });
    row.researchOk = axis.ok;
    if (!axis.ok) {
      row.error = axis.userMessage || axis.failReasons?.join(", ") || "research_failed";
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
      signal: AbortSignal.timeout(Number(process.env.PROD_GEN_TIMEOUT_MS) || 420_000),
    });
    const body = await res.json().catch(() => ({}));
    row.apiStatus = res.status;
    row.ms = Date.now() - t0;

    if (res.status !== 200 || body.ok === false) {
      row.error =
        body.userMessage || body.error?.message || body.message || `http_${res.status}`;
      row.failReasons = body.error?.reasons || body.reasons || [];
      return row;
    }

    const pack = body.blogContent || body.pack || {};
    const full = getBlogFullText(pack);
    row.title = pack.title;
    row.fullText = full;
    row.sections = pack.sections?.length || 0;
    row.chars = countBlogBodyCharsWithSpaces(pack);
    row.placeholderHits = countPlaceholderContamination(full).total;
    row.withheld = Boolean(pack._meta?.resetQualityWithheld || pack._meta?.contentEvalPass === false);

    process.env.BRICLOG_RESET_QUALITY = "true";
    const evaluation = assessContentEvaluation(pack, input);
    row.evalScore = evaluation.score;
    row.evalPass = evaluation.pass;
    row.failReasons = evaluation.hardReasons || [];

    row.ok =
      row.apiStatus === 200 &&
      row.sections >= 2 &&
      row.placeholderHits === 0 &&
      row.evalPass &&
      !row.withheld;

    row.markdown = packToMarkdown(scenario, pack, row);
    return row;
  } catch (e) {
    row.error = e?.message || String(e);
    row.ms = Date.now() - t0;
    return row;
  }
}

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("Auth failed:", auth.reason);
  process.exit(1);
}

const flagsRes = await fetch(`${BASE}/api/launch/flags`);
const flags = await flagsRes.json().catch(() => ({}));

const active = ONLY ? SCENARIOS.filter((s) => s.id === ONLY) : SCENARIOS;

const results = [];
for (const scenario of active) {
  console.error(`Running ${scenario.id}…`);
  const row = await runScenario(scenario, auth.token);
  results.push(row);
  if (row.markdown) {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(join(OUT_DIR, `${scenario.id}.md`), row.markdown, "utf8");
  }
}

const summary = {
  at: new Date().toISOString(),
  base: BASE,
  flags: flags.reset || flags,
  pass: results.filter((r) => r.ok).length,
  total: results.length,
  results: results.map(({ fullText, markdown, ...r }) => r),
};

writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2), "utf8");

console.log(JSON.stringify(summary, null, 2));

if (results.some((r) => !r.ok)) {
  process.exit(1);
}
