/**
 * 로컬 배치·크로스채널 SSOT — LLM 없이 blog/place/insta 품질 finish
 */
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";
import {
  expandLocalBlogPackForBatch,
  expandRescueBlogPackToTarget,
  resolveLocalBatchBlogMinChars,
} from "@/lib/content/missionProseGate";
import { applyLocalEditorBeliefPass } from "@/lib/content/humanBeliefGate";
import {
  applySpeakerVoiceLockPack,
  repairThinSectionsAfterVoiceLock,
} from "@/lib/persona/speakerVoiceLock";
import { weaveResearchFactsIntoPack } from "@/lib/content/researchGroundedHumanPack";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { getBlogFullText } from "@/utils/qualityCheck";
import { scoreHumanBelief } from "@/lib/product/humanBeliefEngine";
import { BRICLOG_BASELINE_V2 } from "@/lib/product/briclogUltimateV20";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { expandPackByInformation } from "@/lib/content/informationExpansionEngine";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import { sanitizeVerbatimTopicInPack } from "@/lib/content/informationUnitEngine";
import { applyNarrativeBeliefPass } from "@/lib/content/narrativeBeliefPass";
import { finishChannelPack, finishChannelPackForBatch, assessChannelFirstDeliveryQuality } from "@/lib/product/channelQualityStack";
import { weaveResearchFactsIntoChannelPack } from "@/lib/content/researchGroundedHumanPack";
import { getChannelFullText } from "@/lib/content/channelPack";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";
import { applyRegionColumnNaturalizePass } from "@/lib/content/regionColumnNaturalizeEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { stampCoreRulesOnDelivery } from "@/lib/product/briclogCoreRules";
import {
  stampBatchBlogFirstDeliveryMeta,
  boostBatchChannelPack,
  boostBatchBlogBelief,
  weaveBatchPersonaVoice,
} from "@/lib/product/batchBeliefBoost";
import { applyEditorWriterLengthPass } from "@/lib/product/editorWriterDeliveryPass";

export const BATCH_BELIEF_FLOOR = BRICLOG_BASELINE_V2.humanBeliefMinScore - 29;
export const BATCH_INFO_FLOOR = 60;
export const BATCH_QUALITY_CHAR_MIN = 600;
export const BATCH_CHANNEL_BELIEF_FLOOR = 44;
export const BATCH_CHANNEL_CHAR_MIN = 95;

const BATCH_FORBIDDEN_HEADING_SNIPPETS = [
  "브랜드 이해",
  "제품군",
  "라인업",
  "비교 포인트",
  "행사·기간",
  "설치 안내",
  "AS 안내",
  "A/S 안내",
  "체크리스트",
  "FAQ",
  "확인할 것",
  "알아둘 것",
  "알아보게 된 이유",
  "고를 때 체크 포인트",
  "성분·보관",
  "찾게 되는가",
  "한눈에 보기",
];

function buildBatchCtx(input = {}) {
  return {
    input,
    ...input,
    batchLocalFinish: true,
    skipDeliveryFinalize: true,
    skipLengthRefill: true,
  };
}

function sanitizeBatchSectionHeadings(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const region = String(input.region || "").trim();
  const brand = String(input.brandName || "").trim();
  const sections = pack.sections.map((section, idx) => {
    const heading = String(section?.heading || "");
    const forbidden = BATCH_FORBIDDEN_HEADING_SNIPPETS.some((snippet) =>
      heading.includes(snippet)
    );
    if (!forbidden) return section;
    const topicBit = String(input.topic || input.mainKeyword || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 18);
    return {
      ...section,
      heading: `${region ? `${region} ` : ""}${brand || "매장"}${topicBit ? ` · ${topicBit}` : ""}`.slice(
        0,
        42
      ),
    };
  });
  return { ...pack, sections };
}

function scoreChannelBatch(pack, channel, input) {
  const full = getChannelFullText(pack, channel);
  const belief = scoreHumanBelief(full, input, pack).score;
  const chars = full.replace(/\s/g, "").length;
  const delivery = assessChannelFirstDeliveryQuality(pack, channel, input);
  const pass =
    delivery.displayReady ||
    (delivery.reasons.length <= 3 &&
      belief >= BATCH_CHANNEL_BELIEF_FLOOR &&
      chars >= BATCH_CHANNEL_CHAR_MIN);
  return { belief, chars, pass, delivery };
}

function scoreBatchPack(pack, input, ctx) {
  const full = getBlogFullText(pack);
  return {
    full,
    belief: scoreHumanBelief(full, input, pack).score,
    info: scoreInformationYield(full, ctx, "blog"),
    chars: countBlogBodyCharsWithSpaces(pack),
  };
}

function resolveBatchSoftLenMin(batchMin) {
  return Math.min(BATCH_QUALITY_CHAR_MIN, Math.round(batchMin * 0.59));
}

export function batchBlogCharsOk(chars, batchMin, belief, infoScore) {
  const softLenMin = resolveBatchSoftLenMin(batchMin);
  const softBeliefPath =
    belief >= BATCH_BELIEF_FLOOR &&
    infoScore >= BATCH_INFO_FLOOR - 5 &&
    chars >= softLenMin - 12;
  return (
    chars >= batchMin * 0.68 ||
    chars >= batchMin * 0.85 ||
    softBeliefPath ||
    (belief >= BATCH_BELIEF_FLOOR + 4 &&
      infoScore >= BATCH_INFO_FLOOR - 8 &&
      chars >= softLenMin - 24)
  );
}

export function batchBlogPassProxy(scored, batchMin) {
  const infoScore = scored.info.score;
  const infoOk =
    scored.info.ok ||
    infoScore >= BATCH_INFO_FLOOR ||
    (infoScore >= 55 && scored.belief >= 62);
  return (
    scored.belief >= BATCH_BELIEF_FLOOR &&
    infoOk &&
    batchBlogCharsOk(scored.chars, batchMin, scored.belief, infoScore)
  );
}

/** persona fallback 적용 시 belief 채점용 input (배치 전용) */
export function resolveBatchFinishInput(input = {}, pack = null) {
  const override = pack?._meta?.batchFinishPersona;
  if (!override) return input;
  return { ...input, ...override };
}

function batchCompositeScore(scored, batchMin) {
  const pass = batchBlogPassProxy(scored, batchMin);
  return (
    scored.belief +
    scored.info.score +
    Math.min(30, Math.round(scored.chars / 80)) +
    (pass ? 50 : 0)
  );
}

function cloneMeta(base = {}, scored, batchMin) {
  const sqvScore = Math.round((scored.belief + scored.info.score) / 2);
  return {
    ...base,
    humanBeliefScore: scored.belief,
    humanBelief: { score: scored.belief, ok: scored.belief >= BATCH_BELIEF_FLOOR },
    localBatchFinish: true,
    batchQualityShort: batchBlogCharsOk(
      scored.chars,
      batchMin,
      scored.belief,
      scored.info.score
    ),
    sqv: { score: sqvScore },
    contentQualityValue: sqvScore,
    informationYield: scored.info.score,
    lengthTierMet: batchBlogPassProxy(scored, batchMin),
  };
}

/** dedup + topic scrub — salvage는 belief·info 동시 개선일 때만 */
function repairBatchInformationYield(pack, input, ctx, batchMin) {
  let scored = scoreBatchPack(pack, input, ctx);
  const needsRepair =
    scored.info.score < BATCH_INFO_FLOOR ||
    (scored.info.reasons || []).includes("duplicate_killer_fail");
  if (!needsRepair) {
    return pack;
  }

  let next = applyDuplicateKiller(pack, ctx, "blog");
  next = sanitizeVerbatimTopicInPack(next, input, "blog", { force: true });
  next = applyDuplicateKiller(next, ctx, "blog");

  scored = scoreBatchPack(next, input, ctx);
  if (scored.info.score >= BATCH_INFO_FLOOR) {
    return next;
  }

  const expanded = expandPackByInformation(next, ctx, input, {
    channel: "blog",
    minChars: Math.max(BATCH_QUALITY_CHAR_MIN, Math.round(batchMin * 0.4)),
    salvageForce: true,
  });
  let expandedScore = scoreBatchPack(expanded, input, ctx);
  if (
    expandedScore.info.score >= scored.info.score &&
    expandedScore.belief >= Math.max(BATCH_BELIEF_FLOOR, scored.belief - 6)
  ) {
    next = expanded;
    scored = expandedScore;
  }

  if (scored.info.score < BATCH_INFO_FLOOR) {
    next = weaveResearchFactsIntoPack(next, input);
    scored = scoreBatchPack(next, input, ctx);
    if (scored.info.score >= BATCH_INFO_FLOOR) {
      return next;
    }

    const rescued = expandRescueBlogPackToTarget(
      next,
      input,
      Math.max(
        resolveBatchSoftLenMin(batchMin) + 24,
        countBlogBodyCharsWithSpaces(next) + 96,
        BATCH_QUALITY_CHAR_MIN
      )
    );
    const rescueScore = scoreBatchPack(rescued, input, ctx);
    if (
      rescueScore.info.score >= scored.info.score &&
      rescueScore.belief >= BATCH_BELIEF_FLOOR - 8
    ) {
      next = rescued;
    }
  }

  return next;
}

/** 배치 통과 직전 near-miss — info·분량만 부족한 5% 케이스 salvage */
function finalBatchNearMissSalvage(pack, input, ctx, batchMin) {
  let next = pack;
  const targetChars = Math.max(
    resolveBatchSoftLenMin(batchMin) + 28,
    Math.round(batchMin * 0.72)
  );

  for (let round = 0; round < 4; round += 1) {
    const scored = scoreBatchPack(next, input, ctx);
    if (batchBlogPassProxy(scored, batchMin)) {
      return next;
    }

    let progressed = false;
    const infoLow =
      !scored.info.ok &&
      scored.info.score < BATCH_INFO_FLOOR &&
      !(scored.info.score >= 55 && scored.belief >= 62);
    const lenLow = !batchBlogCharsOk(
      scored.chars,
      batchMin,
      scored.belief,
      scored.info.score
    );

    if (infoLow && scored.belief >= BATCH_BELIEF_FLOOR - 12) {
      let repaired = repairBatchInformationYield(next, input, ctx, batchMin);
      repaired = weaveResearchFactsIntoPack(repaired, input);
      repaired = expandPackByInformation(repaired, ctx, input, {
        channel: "blog",
        minChars: Math.max(targetChars, countBlogBodyCharsWithSpaces(repaired) + 64),
        salvageForce: true,
      });
      const repairedScore = scoreBatchPack(repaired, input, ctx);
      if (
        batchBlogPassProxy(repairedScore, batchMin) ||
        repairedScore.info.score > scored.info.score
      ) {
        next = repaired;
        progressed = true;
      }
    }

    if (!progressed && lenLow && scored.belief >= BATCH_BELIEF_FLOOR - 8) {
      let lengthened = applyEditorWriterLengthPass(next, input);
      if (countBlogBodyCharsWithSpaces(lengthened) < targetChars) {
        lengthened = expandRescueBlogPackToTarget(lengthened, input, targetChars);
      }
      const lenScore = scoreBatchPack(lengthened, input, ctx);
      if (
        batchBlogPassProxy(lenScore, batchMin) ||
        (lenScore.chars > scored.chars && lenScore.belief >= scored.belief - 8)
      ) {
        next = lengthened;
        progressed = true;
      }
    }

    if (!progressed) break;
  }

  return next;
}

/** belief·info OK인데 분량만 부족 — salvage coverage로 보강 */
function enrichBatchPackLength(pack, input, ctx, batchMin) {
  let scored = scoreBatchPack(pack, input, ctx);
  if (batchBlogCharsOk(scored.chars, batchMin, scored.belief, scored.info.score)) {
    return pack;
  }
  if (
    scored.belief < BATCH_BELIEF_FLOOR - 2 ||
    scored.info.score < BATCH_INFO_FLOOR - 8
  ) {
    return pack;
  }

  let next = expandPackByInformation(pack, ctx, input, {
    channel: "blog",
    minChars: Math.max(BATCH_QUALITY_CHAR_MIN, Math.round(batchMin * 0.45)),
    salvageForce: true,
  });
  let nextScore = scoreBatchPack(next, input, ctx);
  if (
    nextScore.belief >= BATCH_BELIEF_FLOOR - 2 &&
    nextScore.info.score >= BATCH_INFO_FLOOR - 3 &&
    nextScore.chars > scored.chars
  ) {
    scored = nextScore;
    pack = next;
  }

  if (!batchBlogCharsOk(scored.chars, batchMin, scored.belief, scored.info.score)) {
    const rescued = expandRescueBlogPackToTarget(
      pack,
      input,
      Math.max(BATCH_QUALITY_CHAR_MIN, Math.round(batchMin * 0.45))
    );
    const rescueScore = scoreBatchPack(rescued, input, ctx);
    if (
      rescueScore.chars >= scored.chars &&
      rescueScore.belief >= BATCH_BELIEF_FLOOR - 2 &&
      rescueScore.info.score >= BATCH_INFO_FLOOR - 3
    ) {
      pack = rescued;
    }
  }

  return pack;
}

/** 배치 게이트 직전 — info·분량·belief edge salvage (최대 3라운드) */
function salvageBatchBlogForGate(pack, input, ctx, batchMin) {
  let next = pack;
  for (let round = 0; round < 3; round += 1) {
    const scored = scoreBatchPack(next, input, ctx);
    const gateOk =
      scored.belief >= BATCH_BELIEF_FLOOR &&
      (scored.info.ok || scored.info.score >= BATCH_INFO_FLOOR) &&
      batchBlogCharsOk(scored.chars, batchMin, scored.belief, scored.info.score);
    if (gateOk) break;

    let progressed = false;
    if (
      scored.info.score < BATCH_INFO_FLOOR &&
      scored.belief >= BATCH_BELIEF_FLOOR - 8
    ) {
      const repaired = repairBatchInformationYield(next, input, ctx, batchMin);
      if (repaired !== next) {
        next = repaired;
        progressed = true;
      }
    }
    if (
      !progressed &&
      scored.belief >= BATCH_BELIEF_FLOOR - 2 &&
      scored.info.score >= BATCH_INFO_FLOOR - 10 &&
      !batchBlogCharsOk(scored.chars, batchMin, scored.belief, scored.info.score)
    ) {
      const enriched = enrichBatchPackLength(next, input, ctx, batchMin);
      if (enriched !== next) {
        next = enriched;
        progressed = true;
      } else {
        const rescued = expandRescueBlogPackToTarget(
          next,
          input,
          Math.max(BATCH_QUALITY_CHAR_MIN, Math.round(batchMin * 0.35))
        );
        const rescueScore = scoreBatchPack(rescued, input, ctx);
        if (
          rescueScore.chars > scored.chars &&
          rescueScore.belief >= BATCH_BELIEF_FLOOR - 3 &&
          batchBlogCharsOk(
            rescueScore.chars,
            batchMin,
            rescueScore.belief,
            rescueScore.info.score
          )
        ) {
          next = rescued;
          progressed = true;
        }
      }
    }
    if (!progressed && scored.belief < BATCH_BELIEF_FLOOR) {
      const rescued = rescueBatchBelief(next, input, ctx);
      if (rescued !== next) {
        next = rescued;
        progressed = true;
      }
    }
    if (!progressed) break;
  }

  const scored = scoreBatchPack(next, input, ctx);
  return {
    ...next,
    _meta: cloneMeta(next._meta, scored, batchMin),
  };
}

/** raw belief BATCH_BELIEF_FLOOR 미만 — batch belief boost → narrative fallback */
function rescueBatchBelief(pack, input, ctx) {
  const scored = scoreBatchPack(pack, input, ctx);
  if (scored.belief >= BATCH_BELIEF_FLOOR) {
    return pack;
  }

  let boosted = boostBatchBlogBelief(pack, input);
  boosted = weaveBatchPersonaVoice(boosted, input);
  let after = scoreBatchPack(boosted, input, ctx);
  if (
    after.belief >= scored.belief &&
    after.info.score >= scored.info.score - 8
  ) {
    return boosted;
  }

  const narrated = applyNarrativeBeliefPass(pack, ctx);
  after = scoreBatchPack(narrated, input, ctx);
  if (after.belief >= scored.belief && after.info.score >= scored.info.score - 5) {
    return narrated;
  }
  if (boosted.belief > scored.belief && boosted.belief >= after.belief) return boosted;
  return after.belief > scored.belief ? narrated : pack;
}

function finishOneSeed(pack, input, ctx, batchMin, options = {}) {
  const customerDelivery = options.customerDelivery === true;
  const batchCtx = buildBatchCtx(input);
  let next = pack;
  next = applyHumanityFinishPass(next, batchCtx, "blog");
  next = weaveResearchFactsIntoPack(next, input);
  if (!ctx.batchLocalFinish) {
    next = applySpeakerVoiceLockPack(next, input);
    next = repairThinSectionsAfterVoiceLock(next, input);
  }

  if ((next.sections?.length || 0) < 3) {
    next = ensureMinBlogSections(next, { input }, input, 3);
  }

  const candidates = [];
  const pushCandidate = (candidate) => {
    if (candidate?.sections?.length >= 3) {
      candidates.push(candidate);
    }
  };

  pushCandidate(next);
  const preExpand = next;
  const beliefBeforeExpand = scoreBatchPack(preExpand, input, ctx).belief;

  let expanded = expandLocalBlogPackForBatch(preExpand, input, batchMin);
  if (countBlogBodyCharsWithSpaces(expanded) < batchMin) {
    const rescued = expandRescueBlogPackToTarget(expanded, input, batchMin);
    if (countBlogBodyCharsWithSpaces(rescued) >= countBlogBodyCharsWithSpaces(expanded)) {
      expanded = rescued;
    }
  }

  const beliefAfterExpand = scoreBatchPack(expanded, input, ctx).belief;
  const beliefFloor = Math.max(
    BATCH_BELIEF_FLOOR,
    beliefBeforeExpand - 5
  );
  if (
    customerDelivery ||
    (beliefAfterExpand >= beliefFloor && beliefAfterExpand >= beliefBeforeExpand - 8)
  ) {
    pushCandidate(expanded);
  } else {
    pushCandidate(preExpand);
  }

  let repaired = repairBatchInformationYield(
    beliefAfterExpand >= beliefFloor ? expanded : preExpand,
    input,
    ctx,
    batchMin
  );
  repaired = applyLocalEditorBeliefPass(repaired);
  if ((repaired.sections?.length || 0) < 3) {
    repaired = ensureMinBlogSections(repaired, { input }, input, 3);
  }
  pushCandidate(repaired);

  let best = candidates[0] || pack;
  let bestScore = -1;
  for (const candidate of candidates) {
    const scored = scoreBatchPack(candidate, input, ctx);
    const composite = batchCompositeScore(scored, batchMin);
    if (composite > bestScore) {
      bestScore = composite;
      best = candidate;
    }
  }

  best = rescueBatchBelief(best, input, ctx);
  best = enrichBatchPackLength(best, input, ctx, batchMin);
  best = sanitizeBatchSectionHeadings(best, input);

  const scored = scoreBatchPack(best, input, ctx);
  return {
    ...best,
    _meta: cloneMeta(best._meta, scored, batchMin),
  };
}

/**
 * @param {object} pack
 * @param {object} input
 * @param {{ targetChars?: number, customerDelivery?: boolean }} [options]
 */
export function finishLocalBlogPackForBatch(pack, input = {}, options = {}) {
  if (!pack?.sections?.length) return pack;
  const ctx = buildBatchCtx(input);
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const batchMin =
    options.targetChars ??
    resolveLocalBatchBlogMinChars(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER, tier);

  let result = finishOneSeed(pack, input, ctx, batchMin, options);
  let scored = scoreBatchPack(result, input, ctx);

  if (scored.belief < BATCH_BELIEF_FLOOR) {
    const visitVoice = input.v4Speaker === "plain_review" || input.v4Speaker === "real_use";
    const altPersonas = [
      { v4Speaker: "brand_intro", contentPersona: "brand_story" },
      { v4Speaker: "expert_info", contentPersona: "info_intro" },
      ...(visitVoice
        ? []
        : [{ v4Speaker: "plain_review", contentPersona: "visit_review" }]),
      ...(input.v4Speaker === "local_blogger"
        ? [{ v4Speaker: "magazine", contentPersona: "info_intro" }]
        : []),
    ];

    for (const personaAlt of altPersonas) {
      const altInput = {
        ...input,
        ...personaAlt,
        batchLocalFinish: true,
        personaEngineProfile: resolvePersonaEngineProfile({
          input,
          ...input,
          ...personaAlt,
        }),
      };
      const altPack = buildMissionProseFallbackPack(altInput);
      if (!altPack?.sections?.length) continue;

      const altCtx = buildBatchCtx(altInput);
      const altResult = finishOneSeed(altPack, altInput, altCtx, batchMin);
      const altScored = scoreBatchPack(altResult, altInput, altCtx);
      const origComposite = batchCompositeScore(scored, batchMin);
      const altComposite = batchCompositeScore(altScored, batchMin);
      const altPasses = batchBlogPassProxy(altScored, batchMin);
      const origPasses = batchBlogPassProxy(scored, batchMin);
      if (
        (altPasses && !origPasses) ||
        altComposite > origComposite
      ) {
        result = {
          ...altResult,
          _meta: {
            ...cloneMeta(altResult._meta, altScored, batchMin),
            batchFinishPersona: {
              v4Speaker: altInput.v4Speaker,
              contentPersona: altInput.contentPersona,
              personaEngineProfile: altInput.personaEngineProfile,
            },
          },
        };
        scored = altScored;
        if (altPasses) break;
      }
    }
  }

  if (isBriclogMissionEnforced()) {
    result = applyRegionColumnNaturalizePass(result, input);
  }

  result = salvageBatchBlogForGate(result, input, ctx, batchMin);
  const postSalvage = scoreBatchPack(result, input, ctx);
  if (postSalvage.belief < BATCH_BELIEF_FLOOR) {
    result = rescueBatchBelief(result, input, ctx);
    result = {
      ...result,
      _meta: cloneMeta(result._meta, scoreBatchPack(result, input, ctx), batchMin),
    };
  }

  if (
    isBriclogMissionEnforced() &&
    countBlogBodyCharsWithSpaces(result) <
      Math.round(batchMin * 0.74)
  ) {
    const lengthened = applyEditorWriterLengthPass(result, input);
    const lengthenedScored = scoreBatchPack(lengthened, input, ctx);
    if (
      lengthenedScored.belief >= postSalvage.belief - 4 &&
      lengthenedScored.chars >= postSalvage.chars
    ) {
      result = lengthened;
    }
  }

  const preStampScored = scoreBatchPack(result, input, ctx);
  if (preStampScored.belief < BATCH_BELIEF_FLOOR + 2) {
    const finalBoost = boostBatchBlogBelief(result, input);
    const finalScored = scoreBatchPack(finalBoost, input, ctx);
    if (batchCompositeScore(finalScored, batchMin) >= batchCompositeScore(preStampScored, batchMin)) {
      result = finalBoost;
    }
  }

  result = stampBatchBlogFirstDeliveryMeta(result, input, ctx, batchMin);

  const postStamp = scoreBatchPack(result, input, ctx);
  if (postStamp.belief < BATCH_BELIEF_FLOOR && postStamp.belief >= BATCH_BELIEF_FLOOR - 8) {
    let rescued = boostBatchBlogBelief(result, input, ctx);
    rescued = weaveBatchPersonaVoice(rescued, input);
    const rescuedScored = scoreBatchPack(rescued, input, ctx);
    if (rescuedScored.belief > postStamp.belief) {
      result = stampBatchBlogFirstDeliveryMeta(rescued, input, ctx, batchMin);
    }
  }

  result = finalBatchNearMissSalvage(result, input, ctx, batchMin);
  const nearMissScored = scoreBatchPack(result, input, ctx);
  return {
    ...result,
    _meta: cloneMeta(result._meta, nearMissScored, batchMin),
  };
}

/**
 * @param {object} pack
 * @param {"place"|"instagram"} channel
 * @param {object} input
 */
export function finishLocalChannelPackForBatch(pack, channel, input = {}) {
  if (!pack) return pack;
  const ctx = buildBatchCtx(input);
  const northStarChannel =
    pack._meta?.channelNorthStarPack || pack._meta?.derivedFromVerifiedBlog;
  let next = northStarChannel
    ? pack
    : weaveResearchFactsIntoChannelPack(pack, channel, input);
  next = boostBatchChannelPack(next, channel, input);
  const minChars = channel === "instagram" ? 240 : 180;
  let textLen = getChannelFullText(next, channel).replace(/\s/g, "").length;
  if (!northStarChannel) {
    for (let round = 0; round < 3 && textLen < minChars; round += 1) {
      next = expandPackByInformation(next, ctx, input, {
        channel,
        minChars,
        salvageForce: true,
      });
      textLen = getChannelFullText(next, channel).replace(/\s/g, "").length;
    }
  }

  const batchFinished = finishChannelPackForBatch(channel, next, ctx);
  const batchScore = scoreChannelBatch(batchFinished, channel, input);
  if (batchScore.pass) {
    return stampCoreRulesOnDelivery(batchFinished, input, channel);
  }

  const fullFinished = finishChannelPack(channel, next, ctx);
  const fullScore = scoreChannelBatch(fullFinished, channel, input);
  if (fullScore.pass && fullScore.belief >= batchScore.belief) {
    return stampCoreRulesOnDelivery(fullFinished, input, channel);
  }
  if (batchScore.belief >= fullScore.belief) {
    return stampCoreRulesOnDelivery(batchFinished, input, channel);
  }
  return stampCoreRulesOnDelivery(fullFinished, input, channel);
}
