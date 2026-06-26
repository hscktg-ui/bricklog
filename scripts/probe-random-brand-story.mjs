/**
 * Prod 랜덤 브랜드 1건 — 조사 → async blog → 이야기 본문 출력
 * Run: node --import ./scripts/register-alias.mjs scripts/probe-random-brand-story.mjs
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
loadEnvLocal(ROOT);
applyE2eTestCredentialsToEnv(process.env);

const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");

const PERSONA = {
  brandName: "청춘농장",
  region: "양평",
  topic: "딸기체험 수확 시즌 오픈, 직접 다녀왔어요",
  mainKeyword: "딸기체험",
  industry: "레저/체험",
  storeFeatures: "딸기 수확 체험, 가족 나들이",
  blogLengthTier: "medium",
  researchEnabled: true,
  skipAutoPipeline: true,
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
};

async function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
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
    signal: AbortSignal.timeout(90_000),
  });
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generateBlogAsync(payload, token) {
  const start = await fetch(`${BASE}/api/content/blog/async/start`, {
    method: "POST",
    headers: await authHeaders(token),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  const startBody = await start.json();
  if (!start.ok) throw new Error(startBody.userMessage || "async start failed");

  const jobId = startBody.jobId;
  const pollUrl = startBody.pollUrl || `/api/content/blog/async/${jobId}`;
  const runUrl = startBody.runUrl || `/api/content/blog/async/${jobId}/run`;

  await fetch(`${BASE}${runUrl}`, {
    method: "POST",
    headers: await authHeaders(token),
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(30_000),
  });

  const deadline = Date.now() + 130_000;
  while (Date.now() < deadline) {
    await sleep(startBody.pollIntervalMs || 2000);
    void fetch(`${BASE}${runUrl}`, {
      method: "POST",
      headers: await authHeaders(token),
      body: JSON.stringify({}),
    }).catch(() => null);
    const snap = await fetch(`${BASE}${pollUrl}`, {
      headers: await authHeaders(token),
      signal: AbortSignal.timeout(20_000),
    });
    const body = await snap.json();
    if (body.status === "done" || body.blogContent?.sections?.length) return body;
    if (body.status === "failed") {
      throw new Error(body.userMessage || body.error || "generation_failed");
    }
  }
  throw new Error("generation_timeout");
}

function formatStoryMarkdown(blog, meta) {
  const lines = [
    `# ${blog.representativeTitle || blog.title || "제목 없음"}`,
    "",
    `> 브랜드: ${PERSONA.brandName} · 지역: ${PERSONA.region} · 주제: ${PERSONA.topic}`,
    `> 생성: 조사 ${meta.researchMs}ms + 글 ${meta.blogMs}ms = ${meta.totalMs}ms · mode: ${meta.mode} · 섹션: ${blog.sections?.length || 0} · ${meta.chars}자`,
    "",
  ];
  for (const sec of blog.sections || []) {
    if (sec.heading) lines.push(`## ${sec.heading}`, "");
    if (sec.body) lines.push(sec.body, "");
  }
  if (blog.conclusion) {
    lines.push("## 마무리", "", blog.conclusion, "");
  }
  return lines.join("\n");
}

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}

console.log("Persona:", PERSONA.brandName, "—", PERSONA.topic);

let pipelineInput = mergeWorkspaceBrandIntoInput(PERSONA);
const researchT0 = Date.now();
const axis = await applyV2AxisResearch({
  pipelineInput,
  generateResearchAsync: (fv) => generateResearchAsync(fv, auth.token),
  onStep: (s) => console.log("research:", s),
});
const researchMs = Date.now() - researchT0;
console.log("axis ok:", axis.ok, "facts:", axis.factCount, "researchMs:", researchMs);
if (!axis.ok) {
  console.error(axis.userMessage);
  process.exit(1);
}
Object.assign(pipelineInput, axis.input);

const researchFacts = (pipelineInput.researchFacts || []).map((f) =>
  typeof f === "string" ? f : f?.fact || f?.text || String(f)
);

const payload = slimBlogApiPayload(pipelineInput);
const t0 = Date.now();
let body;
try {
  const res = await fetch(`${BASE}/api/content/blog`, {
    method: "POST",
    headers: await authHeaders(auth.token),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });
  body = await res.json();
  if (!res.ok && !body?.blogContent?.sections?.length) {
    throw new Error(body.userMessage || `http_${res.status}`);
  }
} catch (err) {
  console.error("blog fail:", err.message);
  process.exit(1);
}
const blogMs = Date.now() - t0;
const totalMs = researchMs + blogMs;
const blog = body.blogContent;
const chars = countBlogBodyCharsWithSpaces(blog);

const meta = {
  researchMs,
  blogMs,
  totalMs,
  mode: body.mode,
  columnistFirst: body.meta?.columnistFirstFastPath,
  benchmark: blog?._meta?.visitReviewBenchmark?.score,
  withheld: body.withheld,
  userMessage: body.userMessage,
  chars,
  sectionCount: blog?.sections?.length || 0,
  title: blog?.representativeTitle || blog?.title,
  topicInterpretation: pipelineInput.topicInterpretation || null,
  topicAfterInterpret: pipelineInput.topic,
  researchFactSample: researchFacts.slice(0, 12),
  researchFactCount: researchFacts.length,
};

const md = formatStoryMarkdown(blog, meta);
const outDir = join(ROOT, "artifacts", "random-brand-story");
mkdirSync(outDir, { recursive: true });
const outMd = join(outDir, "latest.md");
const outJson = join(outDir, "latest-summary.json");
writeFileSync(outMd, md, "utf8");
writeFileSync(
  outJson,
  JSON.stringify({ persona: PERSONA, meta, researchFacts, title: blog?.title, blog }, null, 2),
  "utf8"
);

console.log("\n--- META ---");
console.log(JSON.stringify(meta, null, 2));
console.log("\n--- STORY ---\n");
console.log(md);
