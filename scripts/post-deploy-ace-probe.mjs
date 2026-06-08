import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { assessHumanWritingDelivery } from "../lib/product/humanWritingDeliveryGate.js";
import { resolvePublishReadiness } from "../lib/product/publishReadinessDisplay.js";
import { detectSearchSnippetLeak } from "../lib/product/brandJournalistDirective.js";
import {
  isMechanicalListingTitle,
  titleEchoesTopicTwice,
  titleHasTemplateSpam,
} from "../lib/content/humanTitleEngine.js";
import { assertEditorPreOutput } from "../lib/content/editorPreOutputGate.js";
import { computeContentQualityValue } from "../lib/product/contentQualityValue.js";
import {
  GENERIC_DISPLAY_PAD_RES,
  GENERIC_EXPERIENCE_VOICE_RES,
} from "../lib/content/displayBodyGuards.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "config", "blog-content-inspection.json");

const SCENARIOS = [
  {
    label: "에이스침대_광교",
    raw: {
      brandName: "에이스침대",
      region: "광교",
      topic: "로얄에이스 매트리스 라인업 소개",
      mainKeyword: "로얄에이스 매트리스",
      industry: "가구/침대",
      storeFeatures: "매트리스 전시·체험",
      blogLengthTier: "medium",
      v4Speaker: "plain_review",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
    minChars: 400,
  },
  {
    label: "에이스침대_파주_루체3",
    raw: {
      brandName: "에이스침대",
      region: "파주",
      topic: "루체3 전시소식",
      mainKeyword: "루체3 전시소식",
      industry: "가구/침대",
      storeFeatures: "루체3 전시·체험",
      blogLengthTier: "medium",
      v4Speaker: "brand_intro",
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    },
    minChars: 400,
    forbidVisitVoice: true,
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

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}
console.log("auth ok:", auth.email);

async function generateResearchAsync(fv) {
  const res = await fetch(`${BASE}/api/content/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
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

async function runScenario(scenario) {
  const input = mergeWorkspaceBrandIntoInput({ ...scenario.raw }, null);

  await applyV2AxisResearch({
    pipelineInput: input,
    generateResearchAsync,
    setResearchResult: () => {},
    onStep: (s) => console.log(`[${scenario.label}] research:`, s),
  });

  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/content/blog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify(slimBlogApiPayload(input)),
    signal: AbortSignal.timeout(280_000),
  });
  const body = await res.json();
  const pack = body.blogContent;
  const full = getBlogFullText(pack);
  const ctx = { input, ...input };
  const title = pack?.title || pack?.representativeTitle || "";
  const chars = full.replace(/\s/g, "").length;
  const human = assessHumanWritingDelivery(pack, input);
  const pub = resolvePublishReadiness(pack);
  const editorPre = assertEditorPreOutput(pack, ctx, input);
  const snippetLeak = detectSearchSnippetLeak(pack, input);
  const sqv = pack ? computeContentQualityValue(pack, input) : null;

  const visitVoiceHits = scenario.forbidVisitVoice
    ? GENERIC_EXPERIENCE_VOICE_RES.filter((re) => re.test(full)).length
    : 0;
  const padHits = GENERIC_DISPLAY_PAD_RES.filter((re) => re.test(full)).length;

  const pass =
    res.status !== 401 &&
    res.status !== 403 &&
    !/session expired|로그인/i.test(String(body.userMessage || body.error || "")) &&
    (body.withheld
      ? Boolean(body.userMessage)
      : body.ok && pack?.sections?.length >= 2 && chars >= scenario.minChars);

  const sqvMeta = body.meta?.sqv || pack?._meta?.sqv;
  const sqvV2Ok =
    sqvMeta?.version === "v2" &&
    Boolean(pack?._meta?.contentQualityDelivered) &&
    typeof body.meta?.contentQualityValue === "number";

  const row = {
    at: new Date().toISOString(),
    base: BASE,
    label: scenario.label,
    pass,
    sectionCount: pack?.sections?.length || 0,
    chars,
    title,
    opening400: full.replace(/\s+/g, " ").slice(0, 400),
    v4Speaker: scenario.raw.v4Speaker,
    sqv: sqv?.score ?? null,
    sqvGrade: sqv?.grade ?? null,
    sqvVersion: sqvMeta?.version ?? null,
    sqvV2Delivered: sqvV2Ok,
    contentQualityDelivered: Boolean(pack?._meta?.contentQualityDelivered),
    publishReady: sqv?.publishReady ?? null,
    outlineOnly: (body.meta?.failReasons || pack?._meta?.failReasons || []).includes(
      "outline_only_output"
    ),
    speakerArchetype: sqv?.personaId ?? pack?._meta?.humanBelief?.speakerArchetype,
    snippetLeakOk: snippetLeak.ok,
    humanReady: human.humanReady,
    publishLabel: pub.label,
    publishStatus: pub.status,
    failReasons: (body.meta?.failReasons || pack?._meta?.failReasons || editorPre.reasons || []).slice(0, 8),
    visitVoiceHits,
    padHits,
    ms: Date.now() - t0,
    apiStatus: res.status,
    apiMode: body.mode,
    apiOk: body.ok,
    withheld: Boolean(body.withheld),
    apiError: body.error || body.userMessage || body.userDetail || null,
  };

  console.log(JSON.stringify(row, null, 2));
  return row;
}

const results = [];
for (const scenario of SCENARIOS) {
  console.log("\n=== scenario:", scenario.label, "===");
  results.push(await runScenario(scenario));
}

mkdirSync(join(root, "config"), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({ at: new Date().toISOString(), base: BASE, results }, null, 2),
  "utf8"
);

const failed = results.filter((r) => !r.pass);
console.log("\n--- summary ---");
for (const r of results) {
  console.log(
    `${r.pass ? "PASS" : "FAIL"} ${r.label} | chars=${r.chars} sqv=${r.sqv} withheld=${r.withheld} status=${r.apiStatus}`
  );
}
if (failed.length) {
  console.error("FAIL:", failed.map((r) => r.label).join(", "));
  process.exit(1);
}
console.log("OK: prod smoke — all scenarios passed");
