/**
 * 크로스채널 품질 배치 — 210건+ (blog·place·instagram × 업종 × 지역)
 * Run: npm run test:cross-channel-batch
 */
import { mkdirSync, writeFileSync, appendFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { applyV17PostWritePack } from "../lib/content/v17PostProcess.js";
import { applyHumanityFinishPass } from "../lib/content/humanityFinishPass.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import {
  buildResearchGroundedPlacePack,
  buildResearchGroundedInstagramPack,
  weaveResearchFactsIntoChannelPack,
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
import { resolvePersonaEngineProfile } from "../lib/persona/personaEngineProfile.js";
import { finishLocalBlogPackForBatch, finishLocalChannelPackForBatch, batchBlogCharsOk, resolveBatchFinishInput, BATCH_BELIEF_FLOOR, BATCH_INFO_FLOOR, BATCH_CHANNEL_BELIEF_FLOOR, BATCH_CHANNEL_CHAR_MIN } from "../lib/product/localBatchFinish.js";
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
    blogLengthTier: "medium",
    v4Speaker: persona.v4Speaker,
    contentPersona: persona.contentPersona,
    researchFacts: [
      { fact: `${region} ${industry} — ${topic} 관련 이번 달 안내`, source: "research" },
      { fact: `${brandName} 예약·상담·운영 시간은 매장 기준`, source: "research" },
      { fact: `${industry} 비교 시 ${region} 지역 특성·동선 확인`, source: "research" },
    ],
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
  const failReasons = [
    ...(pack._meta?.humanWritingDelivery?.reasons || []),
    ...(pack._meta?.publishReadiness?.failReasons || []),
    ...(first.reasons || []),
  ];
  const tier = resolveBlogLengthTier(input.blogLengthTier);
  const batchMin = resolveLocalBatchBlogMinChars(input.blogLengthTier, tier);

  const ok =
    (pack.sections?.length || 0) >= 3 &&
    (first.displayReady || belief.score >= BATCH_BELIEF_FLOOR) &&
    (info.ok || info.score >= BATCH_INFO_FLOOR) &&
    batchBlogCharsOk(chars, batchMin, belief.score, info.score) &&
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

function runChannel(scenario) {
  const input = {
    ...scenario.input,
    personaEngineProfile: resolvePersonaEngineProfile({ input: scenario.input, ...scenario.input }),
  };
  const channel = scenario.channel === "instagram" ? "instagram" : "place";
  let pack =
    channel === "place"
      ? buildResearchGroundedPlacePack(input)
      : buildResearchGroundedInstagramPack(input, "informative");
  pack = finishLocalChannelPackForBatch(pack, channel, input);
  const delivery = assessChannelFirstDeliveryQuality(pack, channel, input);
  const full = getChannelFullText(pack, channel);
  const belief = scoreHumanBelief(full, input, pack);

  const ok =
    delivery.displayReady ||
    ((delivery.reasons?.length || 0) <= 3 &&
      belief.score >= BATCH_CHANNEL_BELIEF_FLOOR &&
      full.replace(/\s/g, "").length >= BATCH_CHANNEL_CHAR_MIN);

  return {
    ok,
    chars: full.replace(/\s/g, "").length,
    belief: belief.score,
    failReasons: delivery.reasons || [],
    displayReady: delivery.displayReady,
  };
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

export function runCrossChannelQualityBatch(options = {}) {
  mkdirSync(OUT_DIR, { recursive: true });
  const scenarios = buildScenarios();
  const startedAt = new Date().toISOString();
  const results = [];

  for (const scenario of scenarios) {
    const row = runOne(scenario);
    results.push(row);
    if (options.append !== false) {
      appendFileSync(REPORT_JSONL, `${JSON.stringify({ ...row, ts: startedAt })}\n`, "utf8");
    }
  }

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

  const summary = {
    startedAt,
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

  writeFileSync(SUMMARY_JSON, JSON.stringify(summary, null, 2), "utf8");

  const evolution = applyBatchEvolutionFromReport(summary);

  console.log(
    `cross-channel-batch: ${pass}/${results.length} pass (${summary.passRate}%)`
  );
  for (const [ch, stat] of Object.entries(byChannel)) {
    console.log(`  ${ch}: ${stat.pass}/${stat.total} (${stat.passRate}%)`);
  }
  console.log(`  summary: ${SUMMARY_JSON}`);
  if (evolution.applied) {
    console.log(`  evolution: applied (${evolution.forbiddenAdded} bans, ${evolution.hintsAdded} hints)`);
  }

  return { summary, evolution };
}

const isMain = process.argv[1]?.includes("cross-channel-quality-batch");
if (isMain) {
  if (process.argv.includes("--clear")) {
    writeFileSync(REPORT_JSONL, "", "utf8");
  }
  const { summary } = runCrossChannelQualityBatch({ append: !process.argv.includes("--clear") });
  if (summary.pass < summary.total * 0.8) process.exit(1);
}
