/**
 * 사용자 관점 품질 감사 — prod API + 클라이언트 동일 경로(조사→생성)
 * Run: BASE_URL=https://briclog.ai node scripts/user-journey-quality-audit.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { ensureBlogDelivery } from "../lib/generation/ensureBlogDelivery.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { assessCompletionReadiness } from "../lib/product/completionStandard.js";
import { assessHumanWritingDelivery } from "../lib/product/humanWritingDeliveryGate.js";
import { scoreCoreContent } from "../lib/quality/coreQualityEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolvePublishReadiness } from "../lib/product/publishReadinessDisplay.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "config", "user-journey-quality-report.json");
const SLA_MS = Number(process.env.USER_JOURNEY_SLA_MS) || 300_000;

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  } catch {
    /* ignore */
  }
  applyE2eTestCredentialsToEnv(process.env);
}

async function generateResearchAsync(formValues) {
  const auth = await getE2eBearerToken();
  const res = await fetch(`${BASE}/api/content/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      researchQuery: `${formValues.brandName} ${formValues.topic || formValues.mainKeyword}`,
      researchTypes: ["web", "brand"],
      researchMode: "v2_axis",
      brandName: formValues.brandName,
      region: formValues.region,
      industry: formValues.industry,
      mainKeyword: formValues.mainKeyword || formValues.topic,
      topic: formValues.topic,
      brandId: formValues.brandId,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json().catch(() => ({}));
  return { research: data?.research || data, ...data };
}

async function fetchBlogApi(pipelineInput) {
  const auth = await getE2eBearerToken();
  const res = await fetch(`${BASE}/api/content/blog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(pipelineInput),
    signal: AbortSignal.timeout(280_000),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function excerpt(text, max = 320) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function auditPack(pack, input) {
  const full = getBlogFullText(pack);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const completion = assessCompletionReadiness(pack, input);
  const human = assessHumanWritingDelivery(pack, input);
  const publish = resolvePublishReadiness(pack);
  let core = null;
  try {
    core = scoreCoreContent(pack, input, { input });
  } catch {
    core = { total: null, pass: false };
  }
  const meta = pack?._meta || {};
  return {
    sectionCount: pack?.sections?.length || 0,
    chars,
    title: pack?.title || pack?.representativeTitle || null,
    openingExcerpt: excerpt(full.split("\n").find((l) => l.trim().length > 40) || full),
    completionReady: completion.completeDraft,
    displayReady: completion.displayReady,
    humanReady: human.humanReady,
    publishStatus: publish.status,
    publishLabel: publish.label,
    coreScore: core?.total ?? null,
    qualityScore: meta.qualityScore?.total ?? null,
    generationMode: meta.generationMode || null,
    missionFallback: Boolean(meta.missionProseFallback || meta.missionFallbackUi),
    softPass: Boolean(meta.softPass),
    failReasons: (meta.failReasons || []).slice(0, 6),
  };
}

loadEnvLocal();

const persona = {
  brandName: "품질감사카페",
  region: "서울 강남",
  topic: "봄 시즌 브런치 메뉴 오픈",
  mainKeyword: "브런치",
  industry: "카페",
  storeFeatures: "수제 브런치·로스팅 원두",
  blogLengthTier: "medium",
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
};

const report = {
  at: new Date().toISOString(),
  base: BASE,
  persona,
  phases: {},
  delivery: null,
  quality: null,
  verdict: "fail",
  userExperience: [],
  errors: [],
};

const t0 = Date.now();
let pipelineInput = mergeWorkspaceBrandIntoInput(
  { ...persona },
  null
);

try {
  const tResearch = Date.now();
  const axis = await applyV2AxisResearch({
    pipelineInput,
    generateResearchAsync,
    setResearchResult: () => {},
    onStep: (label) => {
      report.phases.lastResearchStep = label;
    },
  });
  report.phases.researchMs = Date.now() - tResearch;
  report.phases.axisOk = axis.ok;
  if (!axis.ok) {
    report.errors.push(axis.userMessage || "axis_research_failed");
    report.userExperience.push(
      `조사 단계에서 멈춤: ${axis.userMessage || "축 미입력"}`
    );
    throw new Error(axis.userMessage || "axis failed");
  }

  const tDeliver = Date.now();
  const delivered = await ensureBlogDelivery(pipelineInput, {
    setPipelineStep: (s) => {
      report.phases.lastDeliveryStep = s;
    },
  });
  report.phases.deliveryMs = Date.now() - tDeliver;
  report.phases.totalMs = Date.now() - t0;

  const pack = delivered.blogContent;
  report.delivery = {
    ok: delivered.ok,
    mode: delivered.mode,
    withheld: delivered.withheld,
    softPass: delivered.softPass,
    userMessage: delivered.userMessage,
    sectionCount: pack?.sections?.length || 0,
    llmAvailable: delivered.llmAvailable,
    pipelineVerified: Boolean(
      delivered.meta?.v2PipelineVerified || delivered.meta?.v3PipelineVerified
    ),
  };

  if (!pack?.sections?.length) {
    report.errors.push(delivered.userMessage || "no_sections");
    report.userExperience.push(
      `생성 후 본문 없음 — 사용자는 「${delivered.userMessage || "결과 없음"}」만 봄`
    );
  } else {
    report.quality = auditPack(pack, pipelineInput);
    report.userExperience.push(
      `본문 ${report.quality.sectionCount}섹션 · ${report.quality.chars}자 · 발행준비 ${report.quality.publishLabel}`
    );
    if (report.quality.missionFallback) {
      report.userExperience.push(
        "자동 보강 편집본(미션 fallback) — LLM 본문이 아닐 수 있음"
      );
    }
    if (!report.quality.humanReady) {
      report.userExperience.push(
        `사람 글 체감 미달: ${(report.quality.failReasons || []).join(", ") || "human_belief"}`
      );
    }
  }

  const apiProbe = await fetchBlogApi(pipelineInput);
  report.phases.blogApi = {
    status: apiProbe.status,
    mode: apiProbe.body?.mode,
    sectionCount: apiProbe.body?.blogContent?.sections?.length || 0,
    ok: apiProbe.body?.ok,
    userMessage: apiProbe.body?.userMessage,
  };

  const okContent =
    pack?.sections?.length >= 2 &&
    report.quality?.chars >= 400;
  const okSla = report.phases.totalMs <= SLA_MS;
  const okPublish =
    report.quality?.publishStatus === "ready" ||
    report.quality?.humanReady;

  if (okContent && okSla) {
    report.verdict = okPublish ? "pass" : "pass_with_quality_gaps";
  } else if (pack?.sections?.length) {
    report.verdict = "partial";
  }
} catch (err) {
  report.phases.totalMs = Date.now() - t0;
  report.errors.push(err.message);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

console.log("\n=== USER JOURNEY QUALITY AUDIT ===");
console.log("base:", BASE);
console.log("verdict:", report.verdict);
console.log("totalMs:", report.phases.totalMs);
if (report.delivery) {
  console.log("delivery:", JSON.stringify(report.delivery));
}
if (report.quality) {
  console.log("quality:", JSON.stringify(report.quality, null, 2));
}
if (report.userExperience.length) {
  console.log("\n사용자 체감:");
  for (const line of report.userExperience) console.log(" -", line);
}
if (report.errors.length) {
  console.log("\nerrors:", report.errors);
}
console.log("\nReport:", OUT);

process.exit(
  report.verdict === "pass" || report.verdict === "pass_with_quality_gaps"
    ? 0
    : 1
);
