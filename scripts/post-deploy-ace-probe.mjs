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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT = join(root, "config", "blog-content-inspection.json");

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

const raw = {
  brandName: "에이스침대",
  region: "광교",
  topic: "로얄에이스 매트리스 라인업 소개",
  mainKeyword: "로얄에이스 매트리스",
  industry: "가구/침대",
  storeFeatures: "매트리스 전시·체험",
  blogLengthTier: "medium",
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
};

const input = mergeWorkspaceBrandIntoInput({ ...raw }, null);

async function generateResearchAsync(fv) {
  const res = await fetch(`${BASE}/api/content/research`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body: JSON.stringify({
      researchQuery: `${fv.brandName} ${fv.topic}`,
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

await applyV2AxisResearch({
  pipelineInput: input,
  generateResearchAsync,
  setResearchResult: () => {},
  onStep: (s) => console.log("research:", s),
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
const hookFloodCount = (full.match(/[^\n]{4,48}매장[^\n]{2,48}—/g) || []).length;
const igoseCount = (full.match(/[가-힣]이곳[가-힣]/g) || []).length;
const human = assessHumanWritingDelivery(pack, input);
const pub = resolvePublishReadiness(pack);
const editorPre = assertEditorPreOutput(pack, ctx, input);
const snippetLeak = detectSearchSnippetLeak(pack, input);

const row = {
  at: new Date().toISOString(),
  base: BASE,
  label: "에이스침대_광교",
  sectionCount: pack?.sections?.length || 0,
  chars: full.replace(/\s/g, "").length,
  title,
  opening500: full.replace(/\s+/g, " ").slice(0, 500),
  igoseCount,
  hookFloodCount,
  mechanicalTitle:
    isMechanicalListingTitle(title, ctx, input) ||
    titleHasTemplateSpam(title) ||
    titleEchoesTopicTwice(title, ctx, input),
  snippetLeakOk: snippetLeak.ok,
  snippetLeakHits: snippetLeak.hits?.slice(0, 3),
  humanReady: human.humanReady,
  publishLabel: pub.label,
  publishStatus: pub.status,
  failReasons: (pack?._meta?.failReasons || editorPre.reasons || []).slice(0, 8),
  humanReasons: (human.reasons || []).slice(0, 6),
  ms: Date.now() - t0,
  apiStatus: res.status,
  apiMode: body.mode,
};

mkdirSync(join(root, "config"), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({ at: row.at, base: BASE, results: [row] }, null, 2),
  "utf8"
);

console.log(JSON.stringify(row, null, 2));
