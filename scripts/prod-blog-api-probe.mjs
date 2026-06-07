import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");

try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}
applyE2eTestCredentialsToEnv(process.env);

const persona = {
  brandName: "품질감사카페",
  region: "서울 강남",
  topic: "봄 시즌 브런치 메뉴",
  mainKeyword: "브런치",
  industry: "카페",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
};

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth fail", auth.reason);
  process.exit(1);
}

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
      topic: fv.topic,
      mainKeyword: fv.mainKeyword,
      industry: fv.industry,
    }),
    signal: AbortSignal.timeout(120_000),
  });
  return res.json();
}

const pipelineInput = mergeWorkspaceBrandIntoInput(persona);
const axis = await applyV2AxisResearch({
  pipelineInput,
  generateResearchAsync,
  onStep: (s) => console.log("research:", s),
});
console.log("axis ok:", axis.ok, "facts:", axis.factCount);

const t0 = Date.now();
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
console.log("blog api", Date.now() - t0, "ms");
console.log(JSON.stringify({
  status: res.status,
  ok: body.ok,
  mode: body.mode,
  sections: body.blogContent?.sections?.length,
  llmAvailable: body.llmAvailable,
  userMessage: body.userMessage,
  error: body.error,
  failReasons: body.meta?.failReasons,
}, null, 2));
