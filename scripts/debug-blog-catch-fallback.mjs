import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { buildDeliverableBlogFallback, enrichMinimalBlogInput } from "../lib/llm/blogDeliveryFallback.js";
import { blockUnverifiedBlogApiResponse } from "../lib/content/v2PipelineGate.js";
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
const persona = {
  brandName: "품질감사카페",
  region: "서울 강남",
  topic: "봄 시즌 브런치",
  industry: "카페",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  betaTestGuardEnforced: true,
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

const savedInput = pipelineInput;
try {
  throw new Error("OPENAI_NOT_CONFIGURED");
} catch (err) {
  console.log("main err", err.message);
  try {
    const enriched = enrichMinimalBlogInput({
      ...savedInput,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
      betaTestGuardEnforced: true,
    });
    const { pack } = buildDeliverableBlogFallback({
      input: enriched,
      prep: { ok: false, reason: "server_error" },
      failures: ["server_error"],
    });
    console.log("pack sections", pack?.sections?.length);
    const blocked = blockUnverifiedBlogApiResponse(
      {
        ok: false,
        mode: "server_error",
        llmAvailable: false,
        blogContent: pack,
      },
      enriched
    );
    console.log("blocked", blocked.ok, blocked.mode, blocked.blogContent?.sections?.length);
    JSON.stringify(blocked);
    console.log("json ok", JSON.stringify(blocked).length);
  } catch (fallbackErr) {
    console.error("FALLBACK_THROW", fallbackErr?.stack || fallbackErr);
  }
}
