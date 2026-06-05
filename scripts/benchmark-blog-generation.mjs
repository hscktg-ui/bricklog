/**
 * BRICLOG 블로그 생성 실측 벤치 (stage timings)
 *
 * Run (full, needs keys):
 *   node --env-file=.env.local --import ./scripts/register-alias.mjs scripts/benchmark-blog-generation.mjs
 *
 * Quick smoke (heuristics + optional 1 LLM call):
 *   BRICLOG_BENCH_LIMIT=1 node --env-file=.env.local --import ./scripts/register-alias.mjs scripts/benchmark-blog-generation.mjs
 *
 * Env:
 *   OPENAI_API_KEY — research / blog LLM stages
 *   BRICLOG_BENCH_LIMIT=1 — skip full blog gen, cap depth cascade
 *   BRICLOG_BENCH_SKIP_BLOG=1 — research + heuristics only
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnvLocal();

const benchLimit = Number(process.env.BRICLOG_BENCH_LIMIT) > 0;
const skipBlog = process.env.BRICLOG_BENCH_SKIP_BLOG === "1" || benchLimit;

const SAMPLE = {
  brandName: "벤치카페",
  region: "파주",
  topic: "봄 시즌 디저트",
  mainKeyword: "봄 디저트",
  industry: "카페",
  storeFeatures: "수제 디저트",
  blogLengthTier: "short",
  writingSkillLevel: "civilian",
  v2AxisRequired: true,
  v2PipelineEnforced: true,
  researchEnabled: true,
  researchMode: "v2_axis",
};

/** @param {() => Promise<unknown>} fn */
async function timed(label, fn) {
  const t0 = performance.now();
  let ok = true;
  let detail = "";
  try {
    const result = await fn();
    if (result && typeof result === "object") {
      if ("ok" in result) ok = Boolean(result.ok);
      if (result.factCount != null) detail = `facts=${result.factCount}`;
      else if (result.mode) detail = `mode=${result.mode}`;
    }
    return { label, sec: (performance.now() - t0) / 1000, ok, detail };
  } catch (e) {
    return {
      label,
      sec: (performance.now() - t0) / 1000,
      ok: false,
      detail: String(e.message || e).slice(0, 120),
    };
  }
}

function printTable(rows) {
  console.log("\n| Stage | sec | ok | note |");
  console.log("|-------|-----|----|------|");
  for (const r of rows) {
    console.log(
      `| ${r.label} | ${r.sec.toFixed(2)} | ${r.ok ? "Y" : "N"} | ${r.detail || "-"} |`
    );
  }
  const sum = rows.reduce((a, r) => a + r.sec, 0);
  console.log(`\n합계(실측): ${sum.toFixed(2)}s`);
}

async function main() {
  const { isOpenAIConfigured } = await import("../lib/llm/llmProvider.js");
  const { runResearch } = await import("../lib/research/runResearch.js");
  const { applyV2AxisResearch } = await import("../lib/content/applyV2AxisResearch.js");
  const { generateBlogWithLLMFirst } = await import(
    "../lib/llm/contentOrchestrator.js"
  );
  const { scoreCoreContent } = await import("../lib/quality/coreQualityEngine.js");
  const { scoreHumanDeliveryHeuristics } = await import(
    "../lib/content/humanDeliveryRules.js"
  );
  const { resolveBlogLengthTier } = await import("../lib/constants.js");

  const openai = isOpenAIConfigured();
  console.log("=== BRICLOG blog generation benchmark (실측) ===");
  console.log(`OpenAI: ${openai ? "configured" : "missing — LLM stages skipped"}`);
  console.log(`BRICLOG_BENCH_LIMIT: ${benchLimit ? "1 (quick)" : "off"}`);
  console.log(`BRICLOG_BENCH_SKIP_BLOG: ${skipBlog ? "yes" : "no"}`);
  console.log(
    `Length tier short: ${JSON.stringify(resolveBlogLengthTier("short"))}`
  );

  const rows = [];

  if (openai) {
    rows.push(
      await timed("runResearch (v2_axis)", () =>
        runResearch({
          query: `${SAMPLE.brandName} ${SAMPLE.region} ${SAMPLE.topic}`,
          types: ["web"],
          brandContext: SAMPLE,
          mode: "v2_axis",
        })
      )
    );

    rows.push(
      await timed("applyV2AxisResearch", () =>
        applyV2AxisResearch({
          pipelineInput: { ...SAMPLE },
          generateResearchAsync: (inp) =>
            runResearch({
              query: inp.researchQuery || `${inp.brandName} ${inp.topic}`,
              types: inp.researchTypes || ["web"],
              brandContext: inp,
              mode: inp.researchMode || "v2_axis",
            }).then((research) => ({ research })),
          onStep: benchLimit ? () => {} : (s) => console.log("  depth:", s),
        })
      )
    );
  } else {
    rows.push({
      label: "runResearch (skipped)",
      sec: 0,
      ok: false,
      detail: "no OPENAI_API_KEY",
    });
  }

  if (openai && !skipBlog) {
    const axisRow = rows.find((r) => r.label === "applyV2AxisResearch");
    const axisInput =
      axisRow?.ok !== false
        ? {
            ...SAMPLE,
            v2PreWriteVerified: true,
            v2ResearchReady: true,
            researchFacts: [{ fact: "벤치", source: "bench" }],
            factsPrompt: "벤치 팩트",
          }
        : SAMPLE;
    rows.push(
      await timed("generateBlogWithLLMFirst", () =>
        generateBlogWithLLMFirst({
          ...axisInput,
          _skipDefaultResearch: true,
        })
      )
    );
  } else if (!openai) {
    rows.push({
      label: "generateBlogWithLLMFirst (skipped)",
      sec: 0,
      ok: false,
      detail: "no key",
    });
  } else {
    rows.push({
      label: "generateBlogWithLLMFirst (skipped)",
      sec: 0,
      ok: true,
      detail: "BRICLOG_BENCH_LIMIT or SKIP_BLOG",
    });
  }

  const mockPack = {
    sections: [
      {
        heading: "주말 오후",
        body: "비 오는 토요일, 창밖만 보다가 갑자기 당기는 마음. ".repeat(40),
      },
      {
        heading: "한 잔의 여유",
        body: "따뜻한 컵을 들고 조용히 앉아 있으니 부담이 덜해졌어요. ".repeat(35),
      },
    ],
    conclusion: "다음에도 그날의 기분을 떠올릴 것 같아요.",
  };
  const t0 = performance.now();
  const core = scoreCoreContent(mockPack, {
    ...SAMPLE,
    input: SAMPLE,
    brandName: SAMPLE.brandName,
  });
  const human = scoreHumanDeliveryHeuristics(mockPack, {
    input: SAMPLE,
    blogLengthTier: "short",
  });
  rows.push({
    label: "heuristic scoring (local)",
    sec: (performance.now() - t0) / 1000,
    ok: true,
    detail: `core=${core.total} human=${human.score} chars=${human.length.chars}`,
  });

  printTable(rows);

  console.log("\n참고: scripts/diagnose-generation-timing.mjs — 코드 기반 상한 추정");
  console.log(
    "최악 시나리오(재시도·연쇄 풀): diagnose 출력 + blog gen 재시도"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
