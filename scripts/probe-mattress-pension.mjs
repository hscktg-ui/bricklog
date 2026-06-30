/**
 * 매트리스·펜션 prod 검증 (post fix)
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { applyE2eTestCredentialsToEnv } from "../lib/qa/e2eTestCredentials.js";
import { getE2eBearerToken } from "./lib/e2eAuth.js";
import { applyV2AxisResearch } from "../lib/content/applyV2AxisResearch.js";
import { mergeWorkspaceBrandIntoInput } from "../lib/workspace/brandFormSync.js";
import { slimBlogApiPayload } from "../lib/generation/slimBlogApiPayload.js";
import { applySimpleWorkspaceDefaults } from "../lib/product/simpleWorkspaceDefaults.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.BASE_URL || "https://briclog.ai").replace(/\/$/, "");

const SCENARIOS = [
  {
    id: "mattress",
    raw: {
      brandName: "금성침대",
      region: "김포",
      topic: "김포 가구단지 매트리스 추천",
      industry: "침대·매트리스",
      storeFeatures: "매트리스 체험존·모션베드 시연·무이자 할부·배송 설치",
      blogLengthTier: "short",
    },
  },
  {
    id: "pension",
    raw: {
      brandName: "애월바다펜션",
      region: "제주 애월",
      topic: "비수기 장박 할인, 직접 다녀왔어요",
      industry: "펜션",
      storeFeatures: "오션뷰 객실·바비큐장·주차 무료·7박 할인",
      blogLengthTier: "short",
    },
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

async function research(fv, token) {
  const res = await fetch(`${BASE}/api/content/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      researchQuery: `${fv.brandName} ${fv.topic}`,
      researchTypes: fv.researchTypes || ["latest", "local", "keyword", "trend"],
      researchMode: "v2_axis",
      brandName: fv.brandName,
      region: fv.region,
      industry: fv.industry,
      topic: fv.topic,
    }),
    signal: AbortSignal.timeout(90_000),
  });
  return res.json();
}

const auth = await getE2eBearerToken();
if (!auth.ok) process.exit(1);

for (const scenario of SCENARIOS) {
  let input = applySimpleWorkspaceDefaults(
    mergeWorkspaceBrandIntoInput({
      ...scenario.raw,
      researchEnabled: true,
      skipAutoPipeline: true,
      v2AxisRequired: true,
      v2PipelineEnforced: true,
      v3EngineEnforced: true,
    })
  );
  const axis = await applyV2AxisResearch({
    pipelineInput: input,
    generateResearchAsync: (fv) => research(fv, auth.token),
    onStep: (s) => process.stdout.write(`  [${scenario.id}] ${s}\n`),
  });
  if (!axis.ok) {
    console.log(`✗ ${scenario.id} research: ${axis.userMessage}\n`);
    continue;
  }
  Object.assign(input, axis.input);
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/content/blog`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
    body: JSON.stringify(slimBlogApiPayload({ ...input })),
    signal: AbortSignal.timeout(180_000),
  });
  const body = await res.json();
  const ok = Boolean(body.blogContent?.sections?.length && !body.withheld);
  console.log(
    `${ok ? "✓" : "✗"} ${scenario.id} status=${res.status} mode=${body.mode} slow=${body.meta?.columnistSlowFallback} relaxed=${body.blogContent?._meta?.columnistFinishBenchRelaxed} code=${body.meta?.columnistFailDiagnostic?.code || "—"} ${Date.now() - t0}ms\n`
  );
  if (!ok) console.log(`   msg: ${body.userMessage?.slice(0, 80)}\n`);
}
