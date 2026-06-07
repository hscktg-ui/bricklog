import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { generateBlogWithLLMFirst } from "../lib/llm/contentOrchestrator.js";
import { blockUnverifiedBlogApiResponse } from "../lib/content/v2PipelineGate.js";
import { prepareBrandFirstInput } from "../lib/memory/brandFirstPrewriteGate.js";
import { createClient } from "@supabase/supabase-js";
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

const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");

async function generateResearchAsync(fv) {
  const auth = await getE2eBearerToken();
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

const persona = {
  brandName: "품질감사카페",
  region: "서울 강남",
  topic: "봄 시즌 브런치 메뉴",
  mainKeyword: "브런치",
  industry: "카페",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  betaTestGuardEnforced: true,
};

const pipelineInput = mergeWorkspaceBrandIntoInput(persona);
const axis = await applyV2AxisResearch({
  pipelineInput,
  generateResearchAsync,
  onStep: () => {},
});
console.log("axis", axis.ok, axis.factCount);

let requestInput = { ...pipelineInput, billingPlan: "free" };

try {
  const auth = await getE2eBearerToken();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${auth.token}` } } }
  );
  const prepared = await prepareBrandFirstInput({
    supabase,
    userId: auth.userId || (await supabase.auth.getUser()).data?.user?.id,
    input: requestInput,
  });
  if (prepared.ok) requestInput = prepared.input;
  console.log("brandFirst", prepared.ok);
} catch (e) {
  console.log("brandFirst skip", e.message);
}

try {
  const raw = await generateBlogWithLLMFirst(requestInput);
  console.log("orchestrator ok", raw.ok, raw.mode, raw.blogContent?.sections?.length);
  const blocked = blockUnverifiedBlogApiResponse(raw, requestInput);
  console.log("blocked", blocked.ok, blocked.mode, blocked.blogContent?.sections?.length);
} catch (err) {
  console.error("ORCHESTRATOR_THROW", err?.stack || err);
  try {
    const { buildDeliverableBlogFallback, enrichMinimalBlogInput } = await import(
      "../lib/llm/blogDeliveryFallback.js"
    );
    const enriched = enrichMinimalBlogInput({
      ...requestInput,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    });
    const { pack } = buildDeliverableBlogFallback({
      input: enriched,
      prep: { ok: false, reason: "server_error" },
      failures: ["server_error"],
    });
    const blocked = blockUnverifiedBlogApiResponse(
      { ok: false, mode: "server_error", llmAvailable: false, blogContent: pack },
      enriched
    );
    console.log("fallback ok", blocked.blogContent?.sections?.length, blocked.mode);
  } catch (fallbackErr) {
    console.error("FALLBACK_THROW", fallbackErr?.stack || fallbackErr);
  }
}
