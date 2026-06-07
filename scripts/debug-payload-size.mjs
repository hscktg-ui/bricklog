import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  /* ignore */
}
applyE2eTestCredentialsToEnv(process.env);

const BASE = "https://briclog.ai";
const auth = await getE2eBearerToken();
const p = mergeWorkspaceBrandIntoInput({
  brandName: "품질감사카페",
  region: "서울 강남",
  topic: "봄 브런치",
  industry: "카페",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
});
await applyV2AxisResearch({
  pipelineInput: p,
  generateResearchAsync: async (fv) => {
    const res = await fetch(`${BASE}/api/content/research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        researchQuery: `${fv.brandName} ${fv.topic}`,
        researchTypes: ["web"],
        researchMode: "v2_axis",
        brandName: fv.brandName,
        region: fv.region,
        topic: fv.topic,
      }),
    });
    return res.json();
  },
});

const slim = {
  brandName: p.brandName,
  region: p.region,
  topic: p.topic,
  mainKeyword: p.mainKeyword,
  industry: p.industry,
  brandId: p.brandId,
  v2ResearchReady: p.v2ResearchReady,
  v2PreWriteVerified: p.v2PreWriteVerified,
  v2AxisVerified: p.v2AxisVerified,
  v2PipelineStage: p.v2PipelineStage,
  researchFacts: p.researchFacts,
  researchFactCount: p.researchFactCount,
  researchBrief: p.researchBrief,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
};

const full = JSON.stringify(p);
const slimJson = JSON.stringify(slim);
console.log("full bytes", full.length);
console.log("slim bytes", slimJson.length);

writeFileSync(join(root, "config", "blog-payload-slim.json"), slimJson);

for (const [label, body] of [
  ["slim", slimJson],
  ["minimal", JSON.stringify({ brandName: p.brandName, region: p.region, topic: p.topic, industry: p.industry, v2PipelineEnforced: true, v3EngineEnforced: true })],
]) {
  const res = await fetch(`${BASE}/api/content/blog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.token}`,
    },
    body,
  });
  const text = await res.text();
  console.log(label, res.status, text.slice(0, 200));
}
