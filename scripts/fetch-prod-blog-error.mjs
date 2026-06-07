import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";

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
const persona = {
  brandName: "품질감사카페",
  region: "서울 강남",
  topic: "봄 시즌 브런치",
  industry: "카페",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
};
const pipelineInput = mergeWorkspaceBrandIntoInput(persona);
await applyV2AxisResearch({
  pipelineInput,
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

const res = await fetch(`${BASE}/api/content/blog`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.token}`,
  },
  body: JSON.stringify(pipelineInput),
});
const text = await res.text();
console.log("status", res.status);
console.log(text);
