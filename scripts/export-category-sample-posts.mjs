/**
 * 미감사 업종 — prod blog API 샘플 전문 저장
 * PROBE_IDS=academy,craft,pension,shop node --import ./scripts/register-alias.mjs scripts/export-category-sample-posts.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { assessHumanWritingDelivery } from "../lib/product/humanWritingDeliveryGate.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { assessContentTrustReadable } from "../lib/quality/qualityTrustKpi.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT_DIR = join(root, "artifacts", "category-samples");

const SCENARIOS = [
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
process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

function packToMarkdown(pack, input) {
  const lines = [];
  if (pack?.title) lines.push(`# ${pack.title}`, "");
  for (const s of pack?.sections || []) {
    if (s.heading) lines.push(`## ${s.heading}`, "");
    if (s.body) lines.push(s.body, "");
  }
  if (pack?.conclusion) {
    lines.push("---", "", pack.conclusion);
  }
  lines.push(
    "",
    `<!-- brand=${input.brandName} region=${input.region} industry=${input.industry} -->`
  );
  return lines.join("\n").trim();
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
  const axis = await applyV2AxisResearch({
    pipelineInput: input,
    generateResearchAsync: (fv) => generateResearchAsync(fv, token),
    setResearchResult: () => {},
    onStep: () => {},
  });
  if (!axis.ok) {
    return { scenario, error: axis.userMessage || "research_failed" };
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
  if (res.status !== 200 || body.ok === false) {
    return {
      scenario,
      error: body.userMessage || body.message || `http_${res.status}`,
      mode: body.mode,
    };
  }

  const pack = body.blogContent || body.pack || {};
  process.env.BRICLOG_RESET_QUALITY = "true";
  const evaluation = assessContentEvaluation(pack, input);
  const trust = assessContentTrustReadable(pack, input);
  const human = assessHumanWritingDelivery(pack, input);

  return {
    scenario,
    pack,
    input,
    mode: body.mode,
    chars: countBlogBodyCharsWithSpaces(pack),
    sections: pack.sections?.length || 0,
    evalScore: evaluation.score,
    evalPass: evaluation.pass,
    trustReadable: trust.readable,
    humanReady: human.humanReady,
    failReasons: (pack._meta?.failReasons || human.reasons || []).slice(0, 8),
    withheld: Boolean(body.withheld),
    userMessage: body.userMessage || null,
  };
}

const filterIds = (process.env.PROBE_IDS || "academy,craft,pension,shop")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const active = SCENARIOS.filter((s) => filterIds.includes(s.id));

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });
console.log(`\n=== CATEGORY SAMPLE EXPORT (${active.length}) base=${BASE}\n`);

const summary = [];
for (const scenario of active) {
  console.log(`→ ${scenario.label} …`);
  const t0 = Date.now();
  const result = await runScenario(scenario, auth.token);
  const ms = Date.now() - t0;

  if (result.error) {
    console.log(`  FAIL: ${result.error} (${ms}ms)`);
    summary.push({
      id: scenario.id,
      label: scenario.label,
      error: result.error,
      ms,
    });
    writeFileSync(
      join(OUT_DIR, `${scenario.id}.md`),
      `# ${scenario.label}\n\n생성 실패: ${result.error}\n`,
      "utf8"
    );
    continue;
  }

  const md = packToMarkdown(result.pack, result.input);
  const outPath = join(OUT_DIR, `${scenario.id}.md`);
  const meta = [
    `# ${scenario.label}`,
    "",
    `- 업종: ${scenario.raw.industry}`,
    `- mode: ${result.mode}`,
    `- 섹션: ${result.sections} · ${result.chars}자`,
    `- eval: ${result.evalScore} (pass=${result.evalPass})`,
    `- trustReadable: ${result.trustReadable} · humanReady: ${result.humanReady}`,
    `- fail: ${(result.failReasons || []).join(", ") || "—"}`,
    result.withheld ? `- withheld: ${result.userMessage || "yes"}` : "",
    "",
    "---",
    "",
    md,
  ]
    .filter(Boolean)
    .join("\n");

  writeFileSync(outPath, meta, "utf8");
  console.log(
    `  OK ${result.sections}섹션 · ${result.chars}자 · eval=${result.evalScore} · trust=${result.trustReadable} (${ms}ms)`
  );
  console.log(`  saved: ${outPath}`);
  summary.push({
    id: scenario.id,
    label: scenario.label,
    sections: result.sections,
    chars: result.chars,
    evalScore: result.evalScore,
    trustReadable: result.trustReadable,
    humanReady: result.humanReady,
    failReasons: result.failReasons,
    ms,
    path: outPath,
  });
}

writeFileSync(
  join(OUT_DIR, "summary.json"),
  `${JSON.stringify({ at: new Date().toISOString(), base: BASE, summary }, null, 2)}\n`,
  "utf8"
);
console.log(`\nDone. ${OUT_DIR}`);
