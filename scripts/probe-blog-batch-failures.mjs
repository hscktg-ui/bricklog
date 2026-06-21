import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { finishLocalBlogPackForBatch, batchBlogCharsOk, batchBlogPassProxy, BATCH_BELIEF_FLOOR, BATCH_INFO_FLOOR } from "../lib/product/localBatchFinish.js";
import { assessFirstDeliveryQuality } from "../lib/product/firstDeliveryQuality.js";
import { resolvePersonaEngineProfile } from "../lib/persona/personaEngineProfile.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { resolveLocalBatchBlogMinChars } from "../lib/content/missionProseGate.js";
import { scoreInformationYield } from "../lib/content/informationEngine.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { GENERAL_CATEGORIES, SENSITIVE_CATEGORIES, REGIONS, TRAINING_PERSONAS } from "../lib/quality/training/constants.js";

process.env.BRICLOG_MISSION = "true";

const TOPIC_SEEDS = ["시즌 프로모션", "신규 오픈", "예약·상담", "대표 메뉴·서비스", "방문 전 체크"];

function buildBlogScenarios() {
  const out = [];
  const categories = [...GENERAL_CATEGORIES, ...SENSITIVE_CATEGORIES];
  for (let i = 0; i < categories.length; i++) {
    const industry = categories[i];
    const regionCount = i < GENERAL_CATEGORIES.length ? 5 : 2;
    for (let r = 0; r < regionCount; r++) {
      const region = REGIONS[(i + r) % REGIONS.length];
      const topic = `${TOPIC_SEEDS[(i + r) % TOPIC_SEEDS.length]} ${industry}`;
      const persona = TRAINING_PERSONAS[(i + r) % TRAINING_PERSONAS.length];
      const brandName = `${region.split(" ")[0] || region}${industry.replace(/\s/g, "").slice(0, 6)}`;
      out.push({
        id: `${industry.slice(0, 4)}_${r}_blog`,
        input: {
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
        },
      });
    }
  }
  return out;
}

const stats = { pass: 0, empty: 0, len: 0, firstOnly: 0, belief: 0, info: 0, sqv: 0 };
const failSamples = [];

for (const s of buildBlogScenarios()) {
  const input = {
    ...s.input,
    batchLocalFinish: true,
    personaEngineProfile: resolvePersonaEngineProfile({ input: s.input, ...s.input }),
  };
  let pack = buildMissionProseFallbackPack(input);
  if (!pack?.sections?.length) {
    stats.empty += 1;
    failSamples.push({ id: s.id, why: "empty_pack", meta: pack?._meta?.withholdReason });
    continue;
  }
  pack = finishLocalBlogPackForBatch(pack, input);
  const tier = resolveBlogLengthTier("medium");
  const batchMin = resolveLocalBatchBlogMinChars("medium", tier);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const full = getBlogFullText(pack);
  const belief = scoreHumanBelief(full, input, pack).score;
  const info = scoreInformationYield(full, { input }, "blog");
  const sqv = pack._meta?.sqv?.score ?? 0;
  const first = assessFirstDeliveryQuality(pack, input);
  const lenOk = batchBlogCharsOk(chars, batchMin, belief, info.score);
  const batchPass = batchBlogPassProxy({ belief, info, chars }, batchMin);
  const ok =
    (pack.sections?.length || 0) >= 3 &&
    batchPass &&
    sqv >= 50;

  if (ok) {
    stats.pass += 1;
  } else {
    const why = [];
    if (!lenOk) stats.len += 1;
    if (!first.displayReady && belief < BATCH_BELIEF_FLOOR) stats.belief += 1;
    if (!first.displayReady && belief >= BATCH_BELIEF_FLOOR) stats.firstOnly += 1;
    if (!info.ok && info.score < BATCH_INFO_FLOOR) stats.info += 1;
    if (sqv < 50) stats.sqv += 1;
    if (why.length === 0) {
      if (!lenOk) why.push("len");
      if (!first.displayReady && belief < BATCH_BELIEF_FLOOR) why.push("belief");
      if (!info.ok && info.score < BATCH_INFO_FLOOR) why.push("info");
      if (sqv < 50) why.push("sqv");
    }
    failSamples.push({
      id: s.id,
      belief,
      chars,
      batchMin,
      first: first.reasons?.slice(0, 3),
      stamped: pack._meta?.batchFirstDeliveryStamp,
      displayReady: first.displayReady,
    });
  }
}

console.log(JSON.stringify({ total: 78, ...stats, passRate: Math.round((stats.pass / 78) * 1000) / 10, batchMin: resolveLocalBatchBlogMinChars("medium", resolveBlogLengthTier("medium")), failSamples: failSamples.slice(0, 15) }, null, 2));
