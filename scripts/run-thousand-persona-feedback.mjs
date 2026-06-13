/**
 * 1,000명 페르소나 — 생성·배송·품질 집계
 * Run: npm run run:thousand-feedback
 * Env: BRICLOG_PERSONA_CONCURRENCY=24 (default 16)
 */
import { appendFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  THOUSAND_USER_PERSONAS,
  THOUSAND_PERSONA_COUNT,
} from "../lib/qa/thousandUserPersonas.js";
import { normalizePipelineInput } from "../lib/contentPipeline.js";
import { resolvePersonaBlogPack } from "../lib/qa/resolvePersonaBlogPack.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { scoreTrainingContent } from "../lib/quality/training/scorer.js";
import { scoreCoreContent } from "../lib/quality/coreQualityEngine.js";
import { getQualityTarget } from "../lib/quality/qualityDefaults.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { isOpenAIConfigured, getLLMMode } from "../lib/llm/llmProvider.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const OUT_DIR = join(root, "artifacts", "thousand-persona-batch");
const SUMMARY_JSON = join(OUT_DIR, "latest-summary.json");
const REPORT_JSONL = join(OUT_DIR, "batch-report.jsonl");

const CONCURRENCY = Math.max(1, Number(process.env.BRICLOG_PERSONA_CONCURRENCY) || 16);
const TARGET = getQualityTarget();
const LIMIT = Math.min(
  THOUSAND_PERSONA_COUNT,
  Math.max(1, Number(process.env.BRICLOG_PERSONA_LIMIT) || THOUSAND_PERSONA_COUNT)
);

const INDUSTRY_INPUT = {
  cafe: { industry: "카페", purpose: "visitDrive", tone: "emotional" },
  flower: { industry: "꽃집", purpose: "season", tone: "emotional" },
  medical: {
    industry: "병원",
    purpose: "info",
    tone: "trust",
    sensitiveCategory: "medical",
    excludePhrases: "완치, 100%, 최고, 무조건",
  },
  beauty: { industry: "미용실", purpose: "visitDrive", tone: "trust" },
  academy: { industry: "학원", purpose: "info", tone: "informative" },
  restaurant: { industry: "음식점", purpose: "visitDrive", tone: "emotional" },
  retail: { industry: "패션", purpose: "visitDrive", tone: "emotional" },
  fitness: { industry: "피트니스", purpose: "info", tone: "trust" },
  professional: { industry: "마케팅", purpose: "info", tone: "trust" },
  lodging: { industry: "숙박", purpose: "visitDrive", tone: "emotional" },
};

function personaToInput(persona) {
  const brand = persona.brand || {};
  const ind = INDUSTRY_INPUT[persona.industry] || INDUSTRY_INPUT.cafe;
  return normalizePipelineInput({
    brandName: brand.brandName || "테스트매장",
    region: brand.region || "서울",
    topic: brand.topic || "매장 소개",
    mainKeyword: brand.mainKeyword || brand.topic || "로컬 매장",
    blogLengthTier: persona.blogLengthTier || "medium",
    v4Speaker: persona.v4Speaker,
    contentPersona: persona.contentPersona,
    ...ind,
  });
}

async function runPersona(persona) {
  const input = personaToInput(persona);
  const ctx = {
    brandName: input.brandName,
    region: input.region,
    main: input.mainKeyword,
    industry: input.industry,
    topic: input.topic,
    blogLengthTier: input.blogLengthTier,
    input,
  };

  const speaker =
    persona.v4Speaker ||
    (persona.journeyType.includes("guest") ? "brand_intro" : "real_use");

  const { pack: rawPack, mode } = await resolvePersonaBlogPack(input, {
    v4Speaker: speaker,
  });

  let pack = rawPack;
  let publishReady = false;
  let goldenScore = null;
  let humanVoiceMet = false;

  if (pack?.sections?.length) {
    try {
      pack = finalizeContentQualityForDelivery(pack, input, "blog");
      publishReady = pack._meta?.publishReady === true;
      goldenScore = pack._meta?.goldenGate?.score ?? null;
      humanVoiceMet = pack._meta?.humanVoiceMet === true;
    } catch {
      /* keep raw pack */
    }
  }

  const blogText = getBlogFullText(pack || {});
  const chars = blogText.replace(/\s/g, "").length;
  const training = scoreTrainingContent(pack || { sections: [] }, ctx, "blog");
  const core = scoreCoreContent(pack || { sections: [] }, ctx, "blog");
  const withheld = mode === "withheld" || !pack?.sections?.length;

  return {
    id: persona.id,
    baseId: persona.baseId,
    variantIndex: persona.variantIndex,
    industry: persona.industry,
    journeyType: persona.journeyType,
    v4Speaker: speaker,
    blogLengthTier: persona.blogLengthTier,
    mode,
    withheld,
    deliveryOk: !withheld,
    publishReady,
    goldenScore,
    humanVoiceMet,
    sections: pack?.sections?.length || 0,
    chars,
    bodyChars: countBlogBodyCharsWithSpaces(pack || {}),
    training: training.total,
    core: core.total,
    pass: training.total >= TARGET && core.total >= TARGET,
    blockers: training.blockers || [],
  };
}

async function poolMap(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i;
      i += 1;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

function aggregate(runs) {
  const blockerCounts = new Map();
  const byIndustry = {};
  const bySpeaker = {};
  const byTier = {};
  const modes = {};

  for (const r of runs) {
    for (const b of r.blockers) blockerCounts.set(b, (blockerCounts.get(b) || 0) + 1);
    byIndustry[r.industry] = byIndustry[r.industry] || {
      n: 0,
      deliveryOk: 0,
      publishReady: 0,
    };
    byIndustry[r.industry].n += 1;
    if (r.deliveryOk) byIndustry[r.industry].deliveryOk += 1;
    if (r.publishReady) byIndustry[r.industry].publishReady += 1;

    bySpeaker[r.v4Speaker] = bySpeaker[r.v4Speaker] || {
      n: 0,
      deliveryOk: 0,
      publishReady: 0,
    };
    bySpeaker[r.v4Speaker].n += 1;
    if (r.deliveryOk) bySpeaker[r.v4Speaker].deliveryOk += 1;
    if (r.publishReady) bySpeaker[r.v4Speaker].publishReady += 1;

    byTier[r.blogLengthTier] = byTier[r.blogLengthTier] || {
      n: 0,
      deliveryOk: 0,
    };
    byTier[r.blogLengthTier].n += 1;
    if (r.deliveryOk) byTier[r.blogLengthTier].deliveryOk += 1;

    modes[r.mode] = (modes[r.mode] || 0) + 1;
  }

  const delivered = runs.filter((r) => r.deliveryOk);
  const goldenScores = delivered
    .map((r) => r.goldenScore)
    .filter((s) => typeof s === "number");

  return {
    total: runs.length,
    deliveryOk: delivered.length,
    deliveryRate: Math.round((delivered.length / runs.length) * 1000) / 10,
    withheld: runs.filter((r) => r.withheld).length,
    publishReady: runs.filter((r) => r.publishReady).length,
    publishReadyRate: Math.round(
      (runs.filter((r) => r.publishReady).length / runs.length) * 1000
    ) / 10,
    humanVoiceMet: runs.filter((r) => r.humanVoiceMet).length,
    trainingPass: runs.filter((r) => r.pass).length,
    trainingPassRate: Math.round(
      (runs.filter((r) => r.pass).length / runs.length) * 1000
    ) / 10,
    avgTraining: Math.round(runs.reduce((a, r) => a + r.training, 0) / runs.length),
    avgCore: Math.round(runs.reduce((a, r) => a + r.core, 0) / runs.length),
    avgChars: Math.round(runs.reduce((a, r) => a + r.chars, 0) / runs.length),
    avgGolden:
      goldenScores.length > 0
        ? Math.round(goldenScores.reduce((a, s) => a + s, 0) / goldenScores.length)
        : null,
    modes,
    byIndustry,
    bySpeaker,
    byTier,
    topBlockers: [...blockerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([blocker, count]) => ({ blocker, count })),
    failedSamples: runs
      .filter((r) => !r.deliveryOk || !r.publishReady)
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        industry: r.industry,
        v4Speaker: r.v4Speaker,
        mode: r.mode,
        chars: r.chars,
        goldenScore: r.goldenScore,
        blockers: r.blockers.slice(0, 4),
      })),
  };
}

async function main() {
  process.env.BRICLOG_MISSION = process.env.BRICLOG_MISSION || "true";

  if (THOUSAND_USER_PERSONAS.length !== THOUSAND_PERSONA_COUNT) {
    console.error(
      `Expected ${THOUSAND_PERSONA_COUNT} personas, got`,
      THOUSAND_USER_PERSONAS.length
    );
    process.exit(1);
  }

  const personas = THOUSAND_USER_PERSONAS.slice(0, LIMIT);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(REPORT_JSONL, "", "utf8");

  console.log(`\n=== ${LIMIT} PERSONA DELIVERY RUN ===`);
  console.log(`LLM: ${isOpenAIConfigured() ? getLLMMode() : "off (template path)"}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Target score: ${TARGET}\n`);

  const started = Date.now();
  let done = 0;

  const runs = await poolMap(personas, CONCURRENCY, async (persona) => {
    const row = await runPersona(persona);
    appendFileSync(REPORT_JSONL, `${JSON.stringify(row)}\n`, "utf8");
    done += 1;
    if (done % 50 === 0 || done === personas.length) {
      process.stdout.write(`\r진행: ${done}/${personas.length}`);
    }
    return row;
  });

  console.log(`\n완료 ${((Date.now() - started) / 1000).toFixed(1)}s\n`);

  const summary = aggregate(runs);
  const report = {
    at: new Date().toISOString(),
    elapsedSec: Math.round((Date.now() - started) / 1000),
    personaCount: runs.length,
    target: TARGET,
    llmMode: isOpenAIConfigured() ? getLLMMode() : "template",
    summary,
  };

  writeFileSync(SUMMARY_JSON, JSON.stringify(report, null, 2), "utf8");

  console.log("Summary:", SUMMARY_JSON);
  console.log("JSONL:", REPORT_JSONL);
  console.log(JSON.stringify(summary, null, 2));

  if (summary.deliveryRate < 95) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
