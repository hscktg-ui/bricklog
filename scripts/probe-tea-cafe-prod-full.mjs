/**
 * 프로덕션 — 클라이언트와 동일(조사 후 API) 경로
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";

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

const { applyV2AxisResearch } = await import("../lib/content/applyV2AxisResearch.js");
const { runResearch } = await import("../lib/research/runResearch.js");
const { ensureBlogDelivery } = await import("../lib/generation/ensureBlogDelivery.js");
const { resolveBlogUiDelivery } = await import("../lib/generation/postVerifySalvage.js");

const INPUT = {
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 시즌 티 메뉴와 다실 분위기",
  mainKeyword: "경주 티카페",
  industry: "티카페",
  blogLengthTier: "medium",
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
};

const axis = await applyV2AxisResearch({
  pipelineInput: INPUT,
  generateResearchAsync: (input) =>
    runResearch({
      query: `${input.brandName} ${input.region} ${input.topic}`,
      types: ["web"],
      brandContext: {
        brandName: input.brandName,
        region: input.region,
        topic: input.topic,
        industry: input.industry,
      },
      mode: "v2_axis",
    }).then((research) => ({ research })),
});

if (!axis.ok) {
  console.error("axis fail", axis);
  process.exit(1);
}

const pipelineInput = { ...INPUT, ...axis.pipelineInput };
console.log("facts:", pipelineInput.researchFacts?.length);

const auth = await getE2eBearerToken();
if (!auth.ok) {
  console.error("auth failed", auth.reason);
  process.exit(1);
}

const payload = slimBlogApiPayload(pipelineInput);
console.log("slim facts:", payload.researchFacts?.length, "v2PreWrite:", payload.v2PreWriteVerified);

const t0 = Date.now();
const res = await fetch(`${BASE}/api/content/blog`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.token}`,
  },
  body: JSON.stringify(payload),
});
const api = await res.json();
console.log("\n=== API direct ===");
console.log(
  JSON.stringify(
    {
      elapsedMs: Date.now() - t0,
      httpStatus: res.status,
      ok: api.ok,
      withheld: api.withheld,
      mode: api.mode,
      userMessage: api.userMessage,
      sections: api.blogContent?.sections?.length ?? 0,
      chars: api.blogContent ? getBlogFullText(api.blogContent).replace(/\s/g, "").length : 0,
      failReasons: api.meta?.failReasons?.slice(0, 6),
    },
    null,
    2
  )
);

const t1 = Date.now();
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes("/api/content/blog")) {
    return {
      ok: res.ok,
      status: res.status,
      json: async () => api,
    };
  }
  return originalFetch(url, init);
};

const delivered = await ensureBlogDelivery(pipelineInput, {
  setPipelineStep: (s) => console.log("  step:", s),
});
globalThis.fetch = originalFetch;

const ui = resolveBlogUiDelivery(delivered.blogContent, pipelineInput, delivered);
console.log("\n=== ensureBlogDelivery + UI ===");
console.log(
  JSON.stringify(
    {
      elapsedMs: Date.now() - t1,
      ok: delivered.ok,
      withheld: delivered.withheld,
      mode: delivered.mode,
      userMessage: delivered.userMessage,
      sections: delivered.blogContent?.sections?.length ?? 0,
      chars: delivered.blogContent
        ? getBlogFullText(delivered.blogContent).replace(/\s/g, "").length
        : 0,
      uiOk: ui.ok,
      uiMsg: ui.userMessage,
    },
    null,
    2
  )
);

const outDir = join(root, "artifacts", "probe-tea-cafe");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "meta-prod-full.json"), JSON.stringify({ api, delivered, uiOk: ui.ok }, null, 2));

process.exit(delivered.blogContent?.sections?.length ? 0 : 1);
