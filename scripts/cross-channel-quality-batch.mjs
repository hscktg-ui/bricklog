/**
 * 크로스채널 품질 배치 — 210건+ (blog·place·instagram × 업종 × 지역)
 * Run: npm run test:cross-channel-batch
 */
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { applyHumanityFinishPass } from "../lib/content/humanityFinishPass.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import {
  derivePlaceFromVerifiedBlog,
  deriveInstagramFromVerifiedBlog,
  stampBatchBlogAsChannelSource,
} from "../lib/product/deriveChannelFromVerifiedBlog.js";
import {
  buildResearchGroundedPlacePack,
  buildResearchGroundedInstagramPack,
} from "../lib/content/researchGroundedHumanPack.js";
import { assessChannelFirstDeliveryQuality, finishChannelPack } from "../lib/product/channelQualityStack.js";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "../lib/product/humanBeliefEngine.js";
import { scoreInformationYield } from "../lib/content/informationEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { GENERAL_CATEGORIES, SENSITIVE_CATEGORIES, REGIONS, TRAINING_PERSONAS } from "../lib/quality/training/constants.js";
import { applyBatchEvolutionFromReport } from "../lib/evolution/batchEvolutionFromReport.js";
import { saveBatchSnapshot, BATCH_SNAPSHOT_KEYS } from "../lib/ops/batchSummaryStore.js";
import { resolvePersonaEngineProfile } from "../lib/persona/personaEngineProfile.js";
import {
  finishLocalBlogPackForBatch,
  finishLocalChannelPackForBatch,
  batchBlogPassProxy,
  resolveBatchFinishInput,
  BATCH_BELIEF_FLOOR,
  BATCH_INFO_FLOOR,
  BATCH_CHANNEL_BELIEF_FLOOR,
  BATCH_CHANNEL_CHAR_MIN,
} from "../lib/product/localBatchFinish.js";
import { assessFirstDeliveryQuality } from "../lib/product/firstDeliveryQuality.js";
import { resolveLocalBatchBlogMinChars } from "../lib/content/missionProseGate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "artifacts", "cross-channel-batch");
const REPORT_JSONL = join(OUT_DIR, "batch-report.jsonl");
const SUMMARY_JSON = join(OUT_DIR, "latest-summary.json");

const TOPIC_SEEDS = [
  "시즌 프로모션",
  "신규 오픈",
  "예약·상담",
  "대표 메뉴·서비스",
  "방문 전 체크",
];

const CHANNELS = ["blog", "place", "instagram"];

function buildSubstantiveResearchFacts(region, industry, topic, brandName) {
  const topicShort = String(topic || "").split(/[,.]/)[0].slice(0, 28).trim();
  return [
    {
      fact: `${region} ${brandName} ${topicShort} — 평일 11시~21시 운영·주말 예약 권장`,
      source: "research",
    },
    {
      fact: `${brandName} 대표 프로그램·메뉴 체험 동선, 가족 단위 방문 시설 안내`,
      source: "research",
    },
    {
      fact: `${region} 일대 ${industry} 방문 시 주차·예약·시즌 이벤트 운영 시간 확인`,
      source: "research",
    },
  ];
}

function pushScenarioRow(out, industry, i, r, region) {
  const topic = `${TOPIC_SEEDS[(i + r) % TOPIC_SEEDS.length]} ${industry}`;
  const persona = TRAINING_PERSONAS[(i + r) % TRAINING_PERSONAS.length];
  const brandName = `${region.split(" ")[0] || region}${industry.replace(/\s/g, "").slice(0, 6)}`;
  const baseInput = {
    brandName,
    region,
    topic,
    mainKeyword: topic,
    industry,
    storeFeatures: `${brandName} 현장 체험·예약·시즌 운영 안내`,
    blogLengthTier: "medium",
    v4Speaker: persona.v4Speaker,
    contentPersona: persona.contentPersona,
    researchFacts: buildSubstantiveResearchFacts(region, industry, topic, brandName),
    v2PreWriteVerified: true,
    knowledgeExpansionReady: true,
  };
  for (const channel of CHANNELS) {
    out.push({
      id: `${industry.slice(0, 4)}_${r}_${channel}`,
      channel,
      label: `${industry} · ${region} · ${channel}`,
      input: baseInput,
    });
  }
}

function buildScenarios() {
  const out = [];
  const categories = [...GENERAL_CATEGORIES, ...SENSITIVE_CATEGORIES];

  for (let i = 0; i < categories.length; i++) {
    const industry = categories[i];
    const regionCount = i < GENERAL_CATEGORIES.length ? 5 : 2;
    for (let r = 0; r < regionCount; r++) {
      const region = REGIONS[(i + r) % REGIONS.length];
      pushScenarioRow(out, industry, i, r, region);
    }
  }
  return out;
}

function runBlog(scenario) {
  const input = {
    ...scenario.input,
    batchLocalFinish: true,
    personaEngineProfile: resolvePersonaEngineProfile({ input: scenario.input, ...scenario.input }),
  };
  let pack = buildMissionProseFallbackPack(input);
  pack = finishLocalBlogPackForBatch(pack, input);

  const beliefInput = resolveBatchFinishInput(input, pack);
  const full = getBlogFullText(pack);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const belief = scoreHumanBelief(full, beliefInput, pack);
  const info = scoreInformationYield(full, { input: beliefInput }, "blog");
  const sqv = pack._meta?.sqv?.score ?? pack._meta?.contentQualityValue ?? 0;
  const first = assessFirstDeliveryQuality(pack, input);
  const tier = resolveBlogLengthTier(input.blogLengthTier);
  const batchMin = resolveLocalBatchBlogMinChars(input.blogLengthTier, tier);
  const batchPass = batchBlogPassProxy(
    { belief: belief.score, info, chars },
    batchMin
  );
  const failReasons = [
    ...(pack._meta?.humanWritingDelivery?.reasons || []),
    ...(pack._meta?.publishReadiness?.failReasons || []),
    ...(first.reasons || []),
  ];

  const ok =
    (pack.sections?.length || 0) >= 3 &&
    batchPass &&
    sqv >= 50;

  return {
    ok,
    chars,
    tierMin: batchMin,
    sqv,
    belief: belief.score,
    infoYield: info.score,
    sections: pack.sections?.length || 0,
    failReasons: [...new Set(failReasons)].slice(0, 6),
    publishReady: pack._meta?.publishReady === true,
  };
}

function evaluateChannelPack(pack, channel, input) {
  const delivery = assessChannelFirstDeliveryQuality(pack, channel, input);
  const full = getChannelFullText(pack, channel);
  const belief = scoreHumanBelief(full, input, pack);
  const sqv = pack._meta?.sqv?.score ?? pack._meta?.contentQualityValue ?? 0;

  const ok =
    delivery.displayReady &&
    ((typeof pack._meta?.sqv?.score === "number" &&
      pack._meta?.sqv?.grade &&
      sqv >= 50) ||
      pack._meta?.channelNorthStarPack ||
      delivery.northStarFastPass);

  return {
    ok,
    chars: full.replace(/\s/g, "").length,
    belief: belief.score,
    sqv,
    failReasons: [
      ...(typeof pack._meta?.sqv?.score !== "number" ? ["channel_sqv_missing"] : []),
      ...(delivery.reasons || []),
    ],
    displayReady: delivery.displayReady,
  };
}

function runChannel(scenario) {
  const input = {
    ...scenario.input,
    personaEngineProfile: resolvePersonaEngineProfile({ input: scenario.input, ...scenario.input }),
  };
  const channel = scenario.channel === "instagram" ? "instagram" : "place";

  let blogPack = buildMissionProseFallbackPack(input);
  blogPack = finishLocalBlogPackForBatch(blogPack, input);
  blogPack = stampBatchBlogAsChannelSource(blogPack, input);
  if ((blogPack.sections?.length || 0) >= 3) {
    const deriveInput = { ...input, batchLocalFinish: true, sourceChannel: "blog" };
    const derived =
      channel === "place"
        ? derivePlaceFromVerifiedBlog(blogPack, deriveInput)
        : deriveInstagramFromVerifiedBlog(blogPack, deriveInput, "informative");
    const derivedFinished = finishLocalChannelPackForBatch(derived, channel, input);
    const derivedResult = evaluateChannelPack(derivedFinished, channel, input);
    if (derivedResult.ok) {
      return derivedResult;
    }
  }

  let pack =
    channel === "place"
      ? buildResearchGroundedPlacePack(input)
      : buildResearchGroundedInstagramPack(input, "informative");
  pack = finishLocalChannelPackForBatch(pack, channel, input);
  return evaluateChannelPack(pack, channel, input);
}

function runOne(scenario) {
  try {
    const result =
      scenario.channel === "blog" ? runBlog(scenario) : runChannel(scenario);
    return {
      id: scenario.id,
      channel: scenario.channel,
      label: scenario.label,
      industry: scenario.input.industry,
      region: scenario.input.region,
      ...result,
    };
  } catch (err) {
    return {
      id: scenario.id,
      channel: scenario.channel,
      label: scenario.label,
      ok: false,
      error: String(err?.message || err),
    };
  }
}

function loadJsonlResults() {
  if (!existsSync(REPORT_JSONL)) return [];
  const rows = [];
  for (const line of readFileSync(REPORT_JSONL, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      /* skip corrupt */
    }
  }
  return rows;
}

function buildSummary(results, startedAt) {
  const pass = results.filter((r) => r.ok).length;
  const failReasons = {};
  for (const r of results.filter((x) => !x.ok)) {
    if (r.error) {
      failReasons.error = (failReasons.error || 0) + 1;
      continue;
    }
    for (const reason of r.failReasons || []) {
      failReasons[reason] = (failReasons[reason] || 0) + 1;
    }
    if (!r.belief || r.belief < HUMAN_BELIEF_MIN_SCORE - 10) {
      failReasons.human_belief_low = (failReasons.human_belief_low || 0) + 1;
    }
    if (r.infoYield != null && r.infoYield < 72) {
      failReasons.information_yield_low = (failReasons.information_yield_low || 0) + 1;
    }
    if (r.chars != null && r.tierMin && r.chars < r.tierMin * 0.85) {
      failReasons.length_tier_under = (failReasons.length_tier_under || 0) + 1;
    }
  }

  const byChannel = {};
  for (const ch of CHANNELS) {
    const subset = results.filter((r) => r.channel === ch);
    byChannel[ch] = {
      total: subset.length,
      pass: subset.filter((r) => r.ok).length,
      passRate:
        Math.round(
          (subset.filter((r) => r.ok).length / Math.max(1, subset.length)) * 1000
        ) / 10,
    };
  }

  const finishedAt = new Date().toISOString();
  return {
    startedAt,
    finishedAt,
    generatedAt: finishedAt,
    total: results.length,
    pass,
    fail: results.length - pass,
    passRate: Math.round((pass / Math.max(1, results.length)) * 1000) / 10,
    byChannel,
    failReasons,
    failedSamples: results
      .filter((r) => !r.ok)
      .slice(0, 20)
      .map((r) => ({
        id: r.id,
        channel: r.channel,
        label: r.label,
        failReasons: r.failReasons,
        belief: r.belief,
        chars: r.chars,
      })),
  };
}

async function persistSummary(summary, { evolve = true } = {}) {
  writeFileSync(SUMMARY_JSON, JSON.stringify(summary, null, 2), "utf8");
  const persisted = await saveBatchSnapshot(BATCH_SNAPSHOT_KEYS.crossChannel, summary);
  if (persisted?.persisted === "supabase") {
    console.log("  persisted: supabase ops_batch_snapshots");
  }
  let evolution = { applied: false };
  if (evolve) {
    evolution = applyBatchEvolutionFromReport(summary);
  }
  return { persisted, evolution };
}

export async function runCrossChannelQualityBatch(options = {}) {
  mkdirSync(OUT_DIR, { recursive: true });
  const scenarios = buildScenarios();
  const resumeRows = options.resume ? loadJsonlResults() : [];
  const doneIds = new Set(resumeRows.map((r) => r.id).filter(Boolean));
  const startedAt =
    resumeRows.find((r) => r.ts)?.ts || new Date().toISOString();
  const results = [...resumeRows];
  const total = scenarios.length;
  const remaining = scenarios.filter((s) => !doneIds.has(s.id)).length;
  console.log(
    `cross-channel-batch: start ${total} scenarios @ ${startedAt}` +
      (options.resume ? ` (resume skip ${doneIds.size}, remain ${remaining})` : "")
  );

  let ran = 0;
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    if (doneIds.has(scenario.id)) continue;
    const row = runOne(scenario);
    results.push(row);
    ran += 1;
    if (options.append !== false) {
      appendFileSync(REPORT_JSONL, `${JSON.stringify({ ...row, ts: startedAt })}\n`, "utf8");
    }
    const doneCount = results.length;
    if (doneCount % 10 === 0 || doneCount === total || ran % 10 === 0) {
      const passSoFar = results.filter((r) => r.ok).length;
      console.log(
        `cross-channel-batch: ${doneCount}/${total} pass ${passSoFar}/${doneCount} (${Math.round(
          (passSoFar / Math.max(1, doneCount)) * 1000
        ) / 10}%)`
      );
    }
    if (doneCount % 20 === 0) {
      const checkpoint = buildSummary(results, startedAt);
      checkpoint.partial = true;
      writeFileSync(SUMMARY_JSON, JSON.stringify(checkpoint, null, 2), "utf8");
    }
  }

  const summary = buildSummary(results, startedAt);
  summary.partial = false;
  const { evolution } = await persistSummary(summary, { evolve: true });

  console.log(
    `cross-channel-batch: ${summary.pass}/${results.length} pass (${summary.passRate}%)`
  );
  for (const [ch, stat] of Object.entries(summary.byChannel)) {
    console.log(`  ${ch}: ${stat.pass}/${stat.total} (${stat.passRate}%)`);
  }
  console.log(`  summary: ${SUMMARY_JSON}`);
  if (evolution.applied) {
    console.log(`  evolution: applied (${evolution.forbiddenAdded} bans, ${evolution.hintsAdded} hints)`);
  }

  return { summary, evolution };
}

function loadEnvLocal() {
  try {
    for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue;
      const i = line.indexOf("=");
      if (i < 0) continue;
      const k = line.slice(0, i).trim();
      let v = line.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  } catch {
    /* ignore */
  }
}

const isMain = process.argv[1]?.includes("cross-channel-quality-batch");
if (isMain) {
  loadEnvLocal();
  const resume = process.argv.includes("--resume");
  if (process.argv.includes("--clear") && !resume) {
    writeFileSync(REPORT_JSONL, "", "utf8");
  }
  // --clear 는 jsonl 초기화만 하고, 실행 중에는 항상 append 해 중간 진행을 남긴다.
  const { summary } = await runCrossChannelQualityBatch({
    append: true,
    resume,
  });
  if (summary.pass < summary.total * 0.8) process.exitCode = 1;
}
