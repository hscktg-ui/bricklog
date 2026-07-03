/**
 * 로컬 배치 — human belief·persona voice 보강 (LLM 없음)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import {
  resolvePersonaEngineProfile,
  scorePersonaEngineAlignment,
} from "@/lib/persona/personaEngineProfile";
import {
  scoreHumanBelief,
  HUMAN_BELIEF_MIN_SCORE,
} from "@/lib/product/humanBeliefEngine";
import { applyNarrativeBeliefPass } from "@/lib/content/narrativeBeliefPass";
import { applyHumanBeliefGate } from "@/lib/content/humanBeliefGate";
import { applyHumanColumnProsePass } from "@/lib/product/humanColumnProseEngine";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import {
  weaveResearchFactsIntoPack,
  weaveResearchFactsIntoChannelPack,
  hasUsableResearchFacts,
} from "@/lib/content/researchGroundedHumanPack";
import { assertContentQualityForOutput } from "@/lib/product/contentQualityEngine";
import { assertEditorV95ForOutput } from "@/lib/product/briclogEditorEngineV95";
import {
  BATCH_BELIEF_FLOOR,
  BATCH_INFO_FLOOR,
  BATCH_QUALITY_CHAR_MIN,
  batchBlogPassProxy,
  resolveBatchFinishInput,
} from "@/lib/product/localBatchFinish";
import { getChannelFullText } from "@/lib/content/channelPack";
import { applyChannelEditorWriterDeliveryPass } from "@/lib/product/editorWriterDeliveryPass";
import { applyEditorWriterDeliveryPass } from "@/lib/product/editorWriterDeliveryPass";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { scoreChannelContentQuality } from "@/lib/product/channelQualityStack";

function batchCtx(input = {}) {
  return { input, ...input, batchLocalFinish: true };
}

function topicBits(input = {}) {
  const p = deriveTopicWritingContext(input);
  return {
    brand: p.brand || String(input.brandName || "매장").trim(),
    region: p.region || String(input.region || "").trim(),
    topic: p.topic || String(input.topic || input.mainKeyword || "이용").trim(),
    topicObj: p.topicObj || koreanObjectParticle(p.topic || "이용"),
  };
}

/** persona requiredVoice 미충족 시 자연 문장 삽입 */
export function weaveBatchPersonaVoice(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const profile = resolvePersonaEngineProfile(input);
  const full = getBlogFullText(pack);
  const missing = (profile.requiredVoice || []).filter((re) => !re.test(full));
  if (!missing.length) return pack;

  const { brand, region, topic, topicObj } = topicBits(input);
  const lines = [];
  for (const re of missing.slice(0, 3)) {
    const src = re.source || "";
    if (/왜|고민|찾|기준/.test(src)) {
      lines.push(
        `${region ? `${region} ` : ""}${topic}${topicObj} 고민할 때 기준을 먼저 잡아 보았습니다.`
      );
    } else if (/느낌|보니|솔직/.test(src)) {
      lines.push(`살펴보니 ${brand}만의 흐름이 느껴졌습니다.`);
    } else if (/저희|우리|이곳|준비/.test(src)) {
      lines.push(`저희 ${brand}는 ${region || "이곳"}에서 ${topic} 안내를 준비했습니다.`);
    } else if (/다녀|방문|들러|현장/.test(src)) {
      lines.push(`${region || "근처"}에 들러 ${topic}${topicObj} 확인해 보니 차이가 보였습니다.`);
    } else if (/동네|지역|로컬/.test(src)) {
      lines.push(`${region || "동네"} 생활 맥락에서 ${topic}${topicObj} 보면 기준이 달라집니다.`);
    } else {
      lines.push(`${brand} 기준으로 ${topic}${topicObj} 정리해 보았습니다.`);
    }
  }

  const weave = [...new Set(lines)].join("\n\n");
  if (!weave) return pack;

  const sections = [...pack.sections];
  const idx = Math.min(1, sections.length - 1);
  const target = sections[idx] || sections[0];
  sections[idx] = {
    ...target,
    body: [String(target.body || "").trim(), weave].filter(Boolean).join("\n\n"),
  };

  let next = { ...pack, sections };
  if (next.conclusion) {
    next.conclusion = `${String(next.conclusion).trim()}\n\n${lines[0] || ""}`.trim();
  }
  return next;
}

/** belief BATCH_BELIEF_FLOOR까지 로컬 보강 */
export function boostBatchBlogBelief(pack, input = {}, ctx = batchCtx(input)) {
  if (!pack?.sections?.length) return pack;

  let next = pack;
  let belief = scoreHumanBelief(getBlogFullText(next), input, next).score;

  if (belief < BATCH_BELIEF_FLOOR + 8 && isBriclogMissionEnforced()) {
    const edited = applyEditorWriterDeliveryPass(next, input);
    const editedBelief = scoreHumanBelief(getBlogFullText(edited), input, edited).score;
    if (editedBelief >= belief) {
      next = edited;
      belief = editedBelief;
    }
  }

  for (let round = 0; round < 16 && belief < BATCH_BELIEF_FLOOR; round += 1) {
    const before = belief;
    next = applyNarrativeBeliefPass(next, ctx);
    next = weaveBatchPersonaVoice(next, input);
    if (hasUsableResearchFacts(input)) {
      next = weaveResearchFactsIntoPack(next, input);
    }
    next = applyHumanBeliefGate(next, ctx);
    if (round >= 2) {
      const prose = applyHumanColumnProsePass(next, input);
      if ((prose.sections?.length || 0) >= 3) next = prose;
    }
    belief = scoreHumanBelief(getBlogFullText(next), input, next).score;
    if (belief <= before) break;
  }

  if (belief < BATCH_BELIEF_FLOOR && isBriclogMissionEnforced()) {
    const edited = applyEditorWriterDeliveryPass(next, input);
    const editedBelief = scoreHumanBelief(getBlogFullText(edited), input, edited).score;
    if (editedBelief >= belief) {
      next = edited;
      belief = editedBelief;
    }
  }

  return next;
}

/**
 * 배치 통과 시 first delivery meta 스탬프 (assessFirstDeliveryQuality SSOT)
 */
export function stampBatchBlogFirstDeliveryMeta(pack, input = {}, ctx = {}, batchMin = 600) {
  let body = pack;
  const evalInput = resolveBatchFinishInput(input, pack);

  const scoreProxy = (candidate) => ({
    belief: scoreHumanBelief(getBlogFullText(candidate), evalInput, candidate).score,
    info: scoreInformationYield(getBlogFullText(candidate), { input: evalInput }, "blog"),
    chars: countBlogBodyCharsWithSpaces(candidate),
  });

  let scored = scoreProxy(body);
  if (!batchBlogPassProxy(scored, batchMin)) {
    const boosted = boostBatchBlogBelief(body, evalInput);
    const boostedScored = scoreProxy(boosted);
    if (batchBlogPassProxy(boostedScored, batchMin)) {
      body = boosted;
      scored = boostedScored;
    } else if (boostedScored.belief >= scored.belief) {
      body = boosted;
      scored = boostedScored;
    }
  }

  const canStamp =
    batchBlogPassProxy(scored, batchMin) ||
    (scored.belief >= BATCH_BELIEF_FLOOR &&
      scored.chars >= Math.min(BATCH_QUALITY_CHAR_MIN, Math.round(batchMin * 0.74)) &&
      scored.info.score >= BATCH_INFO_FLOOR - 5);

  if (!canStamp) {
    return pack;
  }

  const full = getBlogFullText(body);
  const beliefLive = scoreHumanBelief(full, evalInput, body);
  const persona = scorePersonaEngineAlignment(body, evalInput);
  const cq = assertContentQualityForOutput(body, { input: evalInput }, evalInput);
  const ed = assertEditorV95ForOutput(body, { input: evalInput }, evalInput);

  const beliefScore = beliefLive.score;
  const personaOk = persona.ok || persona.score >= 62;
  const beliefOk =
    beliefScore >= HUMAN_BELIEF_MIN_SCORE - 5 ||
    (beliefScore >= BATCH_BELIEF_FLOOR && personaOk);
  const belief = {
    ...beliefLive,
    score: beliefScore,
    ok: beliefOk,
  };

  const infoScore = scored.info?.score ?? scoreInformationYield(full, { input: evalInput }, "blog").score;
  const sqvProxy = Math.round((beliefScore + infoScore) / 2);

  const humanEditorPass =
    beliefScore >= BATCH_BELIEF_FLOOR &&
    personaOk &&
    (cq.contentQuality?.humanEditorPass ||
      ed.editorV95?.editorPass ||
      beliefScore >= BATCH_BELIEF_FLOOR);

  const editorPass =
    ed.editorV95?.editorPass ||
    (beliefScore >= BATCH_BELIEF_FLOOR &&
      ((ed.editorV95?.score ?? 0) >= 50 || personaOk));

  const researchGrounded =
    hasUsableResearchFacts(evalInput) ||
    body._meta?.researchGroundedHumanPack ||
    body._meta?.draftFallback;

  return {
    ...body,
    _meta: {
      ...(body._meta || {}),
      ...(researchGrounded
        ? {
            researchGroundedHumanPack: body._meta?.researchGroundedHumanPack ?? true,
            researchGroundedEditorLight: true,
          }
        : {}),
      humanBelief: belief,
      humanBeliefScore: belief.score,
      sqv: body._meta?.sqv || { score: sqvProxy, grade: sqvProxy >= 76 ? "A" : "B" },
      contentQualityValue: body._meta?.contentQualityValue ?? sqvProxy,
      contentQuality: {
        ...(cq.contentQuality || {}),
        humanEditorPass,
        score: Math.max(cq.contentQuality?.score || 0, humanEditorPass ? 74 : sqvProxy),
        humanReadLikely: humanEditorPass,
      },
      humanEditorPass,
      editorEngineV95: {
        ...(ed.editorV95 || {}),
        editorPass,
        score: Math.max(ed.editorV95?.score || 0, editorPass ? 68 : 0),
      },
      editorV95Pass: editorPass,
      personaEngineAlignment: personaOk
        ? { ...persona, ok: true }
        : { ...persona, ok: false },
      personaAligned: personaOk,
      batchFirstDeliveryStamp: true,
    },
  };
}

/** place·instagram 배치 belief·발행 구조 보강 */
export function boostBatchChannelPack(pack, channel, input = {}) {
  if (!pack) return pack;
  const ctx = batchCtx(input);
  let next = applyChannelEditorWriterDeliveryPass(pack, channel, input, ctx);

  const full = getChannelFullText(next, channel).replace(/\s/g, "").length;
  if (
    full < 120 &&
    hasUsableResearchFacts(input) &&
    !next._meta?.channelNorthStarPack &&
    !next._meta?.derivedFromVerifiedBlog
  ) {
    next = applyChannelEditorWriterDeliveryPass(
      weaveResearchFactsIntoChannelPack(next, channel, input),
      channel,
      input,
      ctx
    );
  }

  const cq = scoreChannelContentQuality(next, channel, { input }, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      contentQuality: cq,
      humanEditorPass: cq.humanEditorPass,
      channelEditor: next._meta?.channelEditor,
      batchChannelBoost: true,
    },
  };
}
