/**
 * 브라우저와 동일 — async start → run → poll prod 검증
 * Run: npm run test:probe-async-signup-sla
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
import {
  getCustomerBlogSlaMs,
  getAsyncBlogPollDeadlineMs,
  getDefaultAsyncPollIntervalMs,
} from "../lib/config/briclogDefaults.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");
const OUT_DIR = join(root, "artifacts", "async-signup-sla");
const SLA_MS = getCustomerBlogSlaMs();
const POLL_DEADLINE = getAsyncBlogPollDeadlineMs();
const POLL_INTERVAL = getDefaultAsyncPollIntervalMs();

const SCENARIO = {
  id: "cafe",
  label: "카페 · async 경로",
  raw: {
    brandName: "산책카페",
    region: "전주 한옥마을",
    topic: "봄 시즌 브런치",
    industry: "카페",
    storeFeatures: "루프탑 뷰 · 수제 베이글 · 반려견 동반",
    blogLengthTier: "short",
  },
};

try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}
applyE2eTestCredentialsToEnv(process.env);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(path, token, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
    signal: opts.signal || AbortSignal.timeout(opts.timeoutMs || 20_000),
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function generateResearchAsync(fv, token) {
  const { body } = await fetchJson("/api/content/research", token, {
    method: "POST",
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
    timeoutMs: 55_000,
  });
  return body;
}

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

let input = mergeWorkspaceBrandIntoInput({
  ...SCENARIO.raw,
  researchEnabled: true,
  skipAutoPipeline: true,
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
});
input = applySimpleWorkspaceDefaults(input);

console.log(`\n=== async signup (${BASE}) pollDeadline=${POLL_DEADLINE}ms ===\n`);

const t0 = Date.now();
const axis = await applyV2AxisResearch({
  pipelineInput: input,
  generateResearchAsync: (fv) => generateResearchAsync(fv, auth.token),
  onStep: (s) => process.stdout.write(`  ${s}\n`),
});
if (!axis.ok) {
  console.error("research fail", axis.userMessage);
  process.exit(1);
}
Object.assign(input, axis.input);

const payload = slimBlogApiPayload(input);
const { body: start } = await fetchJson("/api/content/blog/async/start", auth.token, {
  method: "POST",
  body: JSON.stringify(payload),
  timeoutMs: 20_000,
});
const jobId = start.jobId;
const pollUrl = start.pollUrl || `/api/content/blog/async/${jobId}`;
const runUrl = start.runUrl || `/api/content/blog/async/${jobId}/run`;

function fireRun(runUrl, token) {
  fetchJson(runUrl, token, {
    method: "POST",
    body: JSON.stringify({}),
    timeoutMs: 20_000,
  }).catch(() => null);
}

console.log(`  jobId=${jobId}`);

fireRun(runUrl, auth.token);

const deadline = Date.now() + POLL_DEADLINE;
let snap = null;
while (Date.now() < deadline) {
  await sleep(POLL_INTERVAL);
  const { body } = await fetchJson(pollUrl, auth.token, {
    method: "GET",
    timeoutMs: 15_000,
  });
  snap = body;
  if (body.status === "done" || body.blogContent?.sections?.length) break;
  if (body.status === "failed") break;
  if (Date.now() - t0 > 60_000 && Date.now() - t0 < 62_000) {
    fireRun(runUrl, auth.token);
  }
}

const ms = Date.now() - t0;
const ok = Boolean(snap?.blogContent?.sections?.length && !snap?.withheld);
const report = {
  at: new Date().toISOString(),
  base: BASE,
  jobId,
  ms,
  slaOk: ms <= SLA_MS,
  pollDeadlineMs: POLL_DEADLINE,
  status: snap?.status,
  mode: snap?.mode,
  sections: snap?.blogContent?.sections?.length || 0,
  pass: ok,
  userMessage: snap?.userMessage || null,
};

writeFileSync(join(OUT_DIR, "latest.json"), JSON.stringify(report, null, 2), "utf8");

console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 1);
