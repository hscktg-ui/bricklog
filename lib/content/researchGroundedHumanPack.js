/**
 * 조사·화자 기반 사람 칼럼 — mission 템플릿 폴백 대체
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { getChannelFullText } from "@/lib/content/channelPack";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";
import {
  isResearchGroundedDeliveryPack,
  resolveEffectiveBlogLengthMin,
  resolveResearchGroundedDeliveryTargetChars,
} from "@/lib/content/missionProseGate";
import {
  deriveTopicWritingContext,
  isVisitReviewTopicInput,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { collectMergedResearchFactsFromInput } from "@/lib/product/researchReadiness";
import {
  collectSubstantiveResearchFacts,
  MIN_SUBSTANTIVE_FACTS_A,
  MIN_SUBSTANTIVE_FACTS_SOFT,
} from "@/lib/product/editorGradeResearchGate";
import { buildHumanStoryProblemOpeningLead } from "@/lib/product/humanStoryEngine";
import { buildTopicArcSectionHeadings } from "@/lib/content/humanColumnPolishEngine";
import { buildMissionConclusionLine } from "@/lib/product/missionProseEngine";
import {
  resolvePersonaEngineProfile,
  scorePersonaEngineAlignment,
} from "@/lib/persona/personaEngineProfile";
import { applyVisitReviewTopicPackGate } from "@/lib/content/visitReviewTopicGate";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import {
  buildNorthStarInstagramPack,
  buildNorthStarPlacePack,
} from "@/lib/product/channelVisitNorthStar";
import { humanizePlaceNoticePack } from "@/lib/content/placeNoticeHumanize";
import {
  deepenDensityFirstPack,
  polishMissionProsePack,
  isMissionBrochurePad,
} from "@/lib/product/missionProseEngine";
import { factTextsFromList } from "@/lib/content/v2ResearchFacts";
import { isPublishableChannelPack } from "@/lib/content/outlinePackGuard";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { defaultTopicFacet } from "@/lib/content/topicFacetEngine";
import { applyPersonaEngineMetaPass } from "@/lib/persona/personaEngineProfile";
import { stripGlobalExactDuplicateSentences } from "@/lib/content/duplicateKillerEngine";
import { softenFormalKoreanEnding } from "@/lib/content/templateBoilerplateEngine";
import { assertContentQualityForOutput } from "@/lib/product/contentQualityEngine";
import { assertEditorV95ForOutput } from "@/lib/product/briclogEditorEngineV95";
import { applyHumanColumnProsePass } from "@/lib/product/humanColumnProseEngine";
import { isFlowerRecommendationTopic } from "@/lib/product/flowerRecommendationProseEngine";
import { buildFlowerRecommendationEditorialPack } from "@/lib/product/flowerNarrativeProse";
import { scoreHumanBelief } from "@/lib/product/humanBeliefEngine";
import { isPollutedResearchFactText } from "@/lib/content/researchFactSanitize";
import { textContainsUnverifiedSearchLeak } from "@/lib/product/brandJournalistDirective";
import { isSubstantiveSectionBody } from "@/lib/content/sectionWriterBodies";
import {
  isPromptOnlyResearchFactText,
  isDisplayBodyForbidden,
} from "@/lib/content/displayBodyGuards";

function shouldUseVisitFieldFactTone(input = {}, profile = {}) {
  return profile.archetype === "field_review" && isVisitReviewTopicInput(input);
}

function shouldApplyHumanColumnToResearchPack(input = {}, profile = {}) {
  return shouldUseVisitFieldFactTone(input, profile);
}

const PROMPT_ONLY_RE =
  /지역명은\s*자연스럽게|방문·체험·비교를\s*전제|공식·매장\s*안내\s*기준|원문\s*복사\s*금지|입력\s*우선/;
const MECHANICAL_FACT_RE =
  /있는데요|많은\s*고객님이\s*추천|국내\s*1위|프리미엄\s*침대\s*라인|여기\s*관련해서/;

/** 플레이스는 항상 사장님 공지 — 방문후기 톤 금지. 인스타는 고객 시점·field_review일 때만 */
function useVisitReviewToneForChannel(input = {}, channel = "blog") {
  if (channel === "place") return false;
  if (!isVisitReviewTopicInput(input)) return false;
  if (channel === "blog") return true;
  const profile = resolvePersonaEngineProfile(input);
  if (profile?.archetype === "field_review") return true;
  return input.contentPerspective === "customer";
}

const RESEARCH_FACT_META_SUFFIX_RES = [
  /\s*—\s*현장에서\s*확인한\s*운영\s*포인트\s*$/,
  /\s*—\s*방문·시즌\s*맥락\s*$/,
  /\s*—\s*(?:근처\s*|이\s*지역\s*)?매장\s*체험·행사\s*조건\s*$/,
  /\s*—\s*이번\s*글의\s*핵심\s*주제\s*$/,
  /\s*—\s*공식·매장\s*안내와\s*맞춰\s*메모해\s*뒀?어요\.?\s*$/,
  /\s*—\s*.+?(?:운영|상담)\s*맥락\s*$/,
  /\s*—\s*.+?학원·특강·내신\s*상담\s*맥락\s*$/,
];

function stripResearchFactMetaSuffix(raw = "") {
  let t = String(raw || "").trim();
  for (const re of RESEARCH_FACT_META_SUFFIX_RES) {
    t = t.replace(re, "").trim();
  }
  return t;
}

function isLowYieldMetaResearchFact(text = "", input = {}) {
  const profile = resolvePersonaEngineProfile(input);
  if (profile.archetype === "field_review") return false;
  if (RESEARCH_FACT_META_SUFFIX_RES.some((re) => re.test(text))) return true;
  const core = stripResearchFactMetaSuffix(cleanFactText(text));
  if (!core || core.replace(/\s/g, "").length < 12) return true;
  if (/^(?:근처\s*)?매장\s*체험·행사\s*조건$/.test(core)) return true;
  if (/운영\s*맥락|상담\s*맥락|학원·특강·내신/.test(core)) return true;
  if (/^이번\s*글의\s*핵심\s*주제$/.test(core)) return true;
  return false;
}

function isBlockedResearchFact(raw, input = {}) {
  const text = String(typeof raw === "string" ? raw : raw?.fact || "").trim();
  const source = typeof raw === "object" ? raw?.source : "";
  if (!text || text.length < 6 || PROMPT_ONLY_RE.test(text)) return true;
  if (/—\s*지역\s*연관\s*검색|지역\s*검색·방문\s*맥락|검색·조사용\s*단서/.test(text)) return true;
  if (isPromptOnlyResearchFactText(text, source)) return true;
  if (isPollutedResearchFactText(text, input, source)) return true;
  if (isDisplayBodyForbidden(text, input)) return true;
  if (MECHANICAL_FACT_RE.test(text)) return true;
  if (textContainsUnverifiedSearchLeak(text, input)) return true;
  if (isLowYieldMetaResearchFact(text, input)) return true;
  const hadMetaSuffix = RESEARCH_FACT_META_SUFFIX_RES.some((re) => re.test(text));
  const core = stripResearchFactMetaSuffix(cleanFactText(text));
  if (hadMetaSuffix && (!core || core.replace(/\s/g, "").length < 10)) return true;
  if (/^(?:근처\s*)?매장\s*체험·행사\s*조건$/.test(core)) return true;
  if (/운영\s*맥락|상담\s*맥락/.test(core)) return true;
  return false;
}

export function hasUsableResearchFacts(input = {}) {
  if (isBriclogResetQualityEnforced()) {
    const substantive = collectSubstantiveResearchFacts(input);
    const min =
      String(input.storeFeatures || "").trim().length >= 8 ||
      String(input.includePhrases || "").trim().length >= 8
        ? MIN_SUBSTANTIVE_FACTS_SOFT
        : MIN_SUBSTANTIVE_FACTS_A;
    if (substantive.length >= min) return true;
  }
  const facts = collectMergedResearchFactsFromInput(input).filter(
    (f) => !isBlockedResearchFact(f, input)
  );
  return facts.length >= 1;
}

function cleanFactText(raw = "") {
  return String(raw || "")
    .replace(/\[.*?\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.\s*$/, "");
}

function isBrokenHumanizedFactLine(line = "") {
  const t = String(line || "").trim();
  if (!t || t.replace(/\s/g, "").length < 16) return true;
  if (/—\s*(?:근처|매장|이번)/.test(t)) return true;
  if (/등록·운영\s*기준/.test(t)) return true;
  if (/모집는|안내는\s*[^.]{0,12}—/.test(t)) return true;
  if (isMissionBrochurePad(t)) return true;
  return false;
}

function pickHumanizedFactLine(pool = [], slot = 0) {
  for (let i = 0; i < pool.length; i += 1) {
    const line = pool[(slot + i) % pool.length];
    if (line && !isBrokenHumanizedFactLine(line)) return line;
  }
  return "";
}

export function humanizeResearchFact(fact, p, input, slot = 0, profile = {}) {
  const text = cleanFactText(typeof fact === "string" ? fact : fact?.fact || "");
  if (!text || isBlockedResearchFact(fact, input)) return "";

  const useFieldVoice =
    profile.archetype === "field_review" || shouldUseVisitFieldFactTone(input, profile);
  const core = stripResearchFactMetaSuffix(text);
  if (!core || core.replace(/\s/g, "").length < 12) return "";
  if (/운영\s*맥락|상담\s*맥락/.test(core)) return "";
  const tail = core.length > 72 ? `${core.slice(0, 68)}…` : core;
  const tailMeta = /—\s*지역|지역\s*연관|검색·조사|입력\s*단서/.test(tail);
  const facet = topicWritingFacet(input) || p.topicFacet || defaultTopicFacet(input);

  if (profile.archetype === "essay" && core.length >= 8) {
    const topicHints = [
      facet,
      p.topicFacet,
      input.topic,
      input.mainKeyword?.split(/[,，]/)[0]?.trim(),
    ].filter(Boolean);
    const topicOnly = topicHints.some(
      (hint) => core === hint || core.replace(/\s+/g, "") === String(hint).replace(/\s+/g, "")
    );
    if (topicOnly || core.length < 14) return "";
    const essayLine = `${core}.`;
    return isBrokenHumanizedFactLine(essayLine) ? "" : essayLine;
  }

  if (profile.archetype === "expert_column" && core.length >= 10) {
    const topicBit = facet || defaultTopicFacet(input);
    const coreLine = core.replace(/\.$/, "").trim();
    return pickHumanizedFactLine(
      [
        `${p.brand} ${topicBit} — ${coreLine}.`,
        `${coreLine} — ${p.regionBit}${p.brand} 안내에서 확인했어요.`,
        `${p.regionBit}${p.brand} ${topicBit}는 ${coreLine}.`,
        `${p.brand} ${topicBit} 관련해 ${coreLine}.`,
      ],
      slot
    );
  }

  if (!useFieldVoice && core.length >= 10 && !isLowYieldMetaResearchFact(text, input)) {
    const line = pickHumanizedFactLine(
      [
        `${p.brand} ${facet} 관련해 ${core}.`,
        `직접 보니 ${core}.`,
        `${p.regionBit}${p.brand} ${facet}는 ${core}.`,
        `${core} — 현장에서 들은 내용이에요.`,
      ],
      slot
    );
    return softenFormalKoreanEnding(line);
  }

  if (useFieldVoice) {
    if (tailMeta) {
      return pickHumanizedFactLine(
        [`${p.regionBit}${p.brand} ${p.topicFacet} 관련해 ${core}.`],
        slot
      );
    }
    return pickHumanizedFactLine(
      [
        `${p.regionBit}${p.brand}에서 ${facet} 상담 때 ${core}.`,
        `현장에서 들은 이야기예요. ${tail}.`,
        `직접 보니 ${tail}.`,
        `당일 안내 기준으로 ${tail}.`,
      ],
      slot
    );
  }

  return softenFormalKoreanEnding(
    pickHumanizedFactLine(
      [
        `${p.brand} ${facet} 관련해 ${core}.`,
        `직접 보니 ${core}.`,
        `${p.regionBit}${p.brand} ${facet}는 ${core}.`,
      ],
      slot
    )
  );
}

function rawFactDedupeCore(fact = "") {
  const text = cleanFactText(typeof fact === "string" ? fact : fact?.fact || "");
  const parts = text.split(/\s*—\s*/).map((p) => p.trim()).filter(Boolean);
  const substance = parts.length > 1 ? parts[parts.length - 1] : text;
  return substance.trim().slice(0, 52);
}

function dedupeRawFactsByCore(facts = []) {
  const seen = new Set();
  const out = [];
  for (const fact of facts) {
    const core = rawFactDedupeCore(fact);
    if (!core || core.replace(/\s/g, "").length < 10 || seen.has(core)) continue;
    seen.add(core);
    out.push(fact);
  }
  return out;
}

function humanizedFactDedupeCore(line = "") {
  const t = String(line || "").trim();
  const parts = t.split(/\s*—\s*/).map((p) => p.trim()).filter(Boolean);
  const substance = parts.length > 1 ? parts[parts.length - 1] : t;
  return substance.replace(/\.\s*$/, "").replace(/\s+/g, " ").trim().slice(0, 56);
}

function dedupeHumanizedFactsByCore(lines = []) {
  const seen = new Set();
  const out = [];
  for (const line of lines) {
    const core = humanizedFactDedupeCore(line);
    if (!core || core.replace(/\s/g, "").length < 12 || seen.has(core)) continue;
    seen.add(core);
    out.push(line);
  }
  return out;
}

const CRAFT_ESSAY_BODY_LINES = [
  `체험 소요 시간·난이도·인원 제한을 예약 전에 확인했어요.`,
  `완성품 사진과 실제 작업 과정 설명을 함께 들었어요.`,
  `준비물·옷·액세서리 착용 가능 여부를 상담 초반에 물어봤어요.`,
  `예약금·취소 규칙·주차 위치를 메모해 두었어요.`,
  `작업 과정·소요 시간이 궁금해 안내를 다시 읽어 봤어요.`,
  `손에 잡히는 디테일부터 적어 두는 편이에요.`,
  `클래스 난이도·완성품 수령 시점을 상담 때 확인했어요.`,
  `당일 착용·액세서리 규정을 미리 물어봤어요.`,
  `예약 변경·환불 규정은 문자 안내를 기준으로 메모했어요.`,
  `작업대 배치·강사 설명 방식도 체크해 두었어요.`,
];

function buildEssayCraftPadPool(p, input = {}) {
  const brand = String(p.brand || input.brandName || "").trim();
  const topic = String(p.topicFacet || topicWritingFacet(input) || "체험").trim();
  const dynamic = brand
    ? [
        `${brand} ${topic} — 예약 전 소요 시간·난이도를 확인했어요.`,
        `${brand} 안내에서 준비물·복장 규정을 짚어 봤어요.`,
        `${brand} 클래스 — 완성품 수령·취소 규정을 메모했어요.`,
      ]
    : [];
  return [...dynamic, ...CRAFT_ESSAY_BODY_LINES];
}

function pickFreshPadLine(pool, pack, startIdx = 0, opts = {}) {
  const fullNorm = getBlogFullText(pack).replace(/\s/g, "");
  if (!pool?.length) return "";
  for (let i = 0; i < pool.length; i += 1) {
    const line = String(pool[(startIdx + i) % pool.length] || "").trim();
    if (!line) continue;
    const core = line.replace(/\s/g, "").slice(0, 28);
    if (core.length >= 14 && !fullNorm.includes(core)) return line;
  }
  if (opts.allowRepeat && pool.length) {
    return String(pool[startIdx % pool.length] || "").trim();
  }
  return "";
}

function buildIndustryResearchPadPool(p, input = {}) {
  const brand = p.brand || String(input.brandName || "브랜드").trim();
  const facet = topicWritingFacet(input) || p.topicFacet || defaultTopicFacet(input);
  const { key, flavor } = getIndustryFlavorForInput(input);
  const space = flavor.spaceWord || "매장";
  const featureBits = String(input.storeFeatures || input.brandDescription || "")
    .split(/[,，·|/\n]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 20);
  const pools = {
    education: [
      ...featureBits.slice(0, 3).map(
        (bit) => `${brand} — ${bit} 기준으로 상담 때 짚어 봤어요.`
      ),
      `${brand} 상담실에서 대상 학년·반 편성·특강 기간을 먼저 확인했어요.`,
      `방학 일정과 기존 학원 시간이 겹치는지 상담에서 짚어 봤어요.`,
      `수업 시간표·특강 기간을 메모해 두고 집에서 일정과 맞춰 봤어요.`,
      `등록·환불 규정은 개강 시점에 따라 달라질 수 있어요.`,
      `소수정예·내신 대비 여부는 커리큘럼 안내를 기준으로 확인했어요.`,
      `${p.regionBit}${brand} ${facet} — 대상 학년·특강 일정·등록 안내는 상담 기준으로 확인하시면 돼요.`,
    ],
    craft: buildEssayCraftPadPool(p, input),
    salon: [
      `${brand} ${space}에서 두피·손상 상태를 먼저 상담했어요.`,
      `시술 전후 케어·소요 시간·비용을 메모해 두었어요.`,
      `${p.regionBit}${brand} ${facet} — 예약·시술 조건은 상담 기준으로 확인하시면 돼요.`,
    ],
  };
  if (pools[key]?.length) return pools[key];
  return [
    `${brand} ${space}에서 ${facet} 안내·예약 조건을 짚어 봤어요.`,
    `${p.regionBit}${brand} ${facet} — 일정·비용은 상담 기준으로 확인하시면 돼요.`,
  ];
}

function splitSectionsToMinCount(sections, minSections, headings) {
  let next = [...sections];
  let guard = 0;
  while (next.length < minSections && guard < 8) {
    guard += 1;
    let bestIdx = -1;
    let bestParas = 0;
    for (let i = 0; i < next.length; i += 1) {
      const paras = String(next[i].body || "")
        .split(/\n\n+/)
        .map((t) => t.trim())
        .filter((t) => t.replace(/\s/g, "").length >= 20);
      if (paras.length >= 2 && paras.length > bestParas) {
        bestParas = paras.length;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    const sec = next[bestIdx];
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((t) => t.trim())
      .filter((t) => t.replace(/\s/g, "").length >= 20);
    const mid = Math.ceil(paras.length / 2);
    const baseHeading = String(sec.heading || headings[0] || "안내").trim();
    next.splice(
      bestIdx,
      1,
      { heading: baseHeading, body: paras.slice(0, mid).join("\n\n") },
      {
        heading: headings[Math.min(bestIdx + 1, headings.length - 1)] || `${baseHeading} 이어서`,
        body: paras.slice(mid).join("\n\n"),
      }
    );
  }
  return next;
}

/** 조사 팩 — sanitize·dedupe 후에도 tier 최소 섹션·길이 복구 */
export function ensureResearchGroundedPackStructure(pack, input = {}, opts = {}) {
  const grounded =
    pack?._meta?.researchGroundedHumanPack ||
    pack?._meta?.draftFallback ||
    pack?._meta?.missionProseFallback ||
    isResearchGroundedDeliveryPack(pack, input);
  if (!pack?.sections?.length || !grounded) return pack;

  const profile = resolvePersonaEngineProfile(input);
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const minSections =
    opts.minSections ??
    (profile.archetype === "essay"
      ? Math.max(4, tier.key === "short" ? 4 : tier.key === "long" ? 7 : 6)
      : tier.key === "short"
        ? 4
        : tier.key === "long"
          ? 7
          : 6);
  const p = deriveTopicWritingContext(input);
  const headings = buildTopicArcSectionHeadings(input, minSections);
  let sections = splitSectionsToMinCount(pack.sections, minSections, headings);

  const factPool = (opts.factLinePool || buildResearchFactLines(input, 20)).filter(Boolean);
  const industryPads = buildIndustryResearchPadPool(p, input);
  const padPool =
    profile.archetype === "essay"
      ? [...buildEssayCraftPadPool(p, input), ...industryPads]
      : factPool.length
        ? [...factPool, ...industryPads]
        : industryPads.length
          ? industryPads
          : [`${p.brand} ${p.topicFacet || "안내"} 관련 조건을 정리해 봤어요.`];

  let padIdx = 0;
  let next = { ...pack, sections };
  while (sections.length < minSections) {
    const idx = sections.length;
    const line =
      pickFreshPadLine(padPool, next, padIdx) ||
      padPool[padIdx % padPool.length] ||
      `${p.brand} ${p.topicFacet || "안내"} 관련 포인트를 정리해 봤어요.`;
    padIdx += 1;
    sections.push({
      heading: headings[idx] || `${p.topicFacet || "안내"} 정리`,
      body: line,
    });
    next = { ...next, sections: [...sections] };
  }

  sections = sections.map((sec, i) => {
    const body = String(sec.body || "").trim();
    if (body.replace(/\s/g, "").length >= 56) {
      return { ...sec, heading: sec.heading || headings[i] };
    }
    const fresh = pickFreshPadLine(padPool, { ...pack, sections }, padIdx);
    padIdx += 1;
    const pad =
      fresh ||
      padPool[padIdx % padPool.length] ||
      `${p.brand} ${p.topicFacet || "안내"} 관련 포인트를 정리해 봤어요.`;
    const nextBody = body && !body.includes(pad.slice(0, 12)) ? `${body}\n\n${pad}` : body || pad;
    return { ...sec, heading: sec.heading || headings[i], body: nextBody };
  });

  next = { ...pack, sections: sections.slice(0, Math.max(minSections, sections.length)) };
  const targetMin = resolveResearchGroundedDeliveryTargetChars(next, input);
  let bodyChars = countBlogBodyCharsWithSpaces(next);
  const researchLines = profile.archetype === "essay" ? [] : factPool;
  for (let r = 0; r < 8 && bodyChars < targetMin; r += 1) {
    next = deepenDensityFirstPack(next, targetMin, input, {
      polishAfter: false,
      seedOffset: r,
      researchLines,
    });
    bodyChars = countBlogBodyCharsWithSpaces(next);
  }
  if (bodyChars < targetMin) {
    next = expandResearchGroundedPackToTarget(next, input, targetMin);
  }
  if ((next.sections || []).length < minSections) {
    next = {
      ...next,
      sections: splitSectionsToMinCount(next.sections || [], minSections, headings),
    };
  }
  return next;
}

/** essay·craft 조사 팩 — ensureResearchGroundedPackStructure 별칭 */
export function ensureEssayResearchPackStructure(pack, input = {}) {
  const profile = resolvePersonaEngineProfile(input);
  if (profile.archetype !== "essay") return pack;
  return ensureResearchGroundedPackStructure(pack, input, { minSections: 4 });
}

function buildEssayResearchSections(input, p, profile, opening, uniqueFacts, sectionCount, headings) {
  const facet = topicWritingFacet(input) || p.topicFacet || defaultTopicFacet(input);
  const sections = [];
  let factIdx = 0;
  let craftIdx = 0;
  for (let i = 0; i < sectionCount; i += 1) {
    const paras = [];
    if (i === 0) paras.push(opening);
    if (factIdx < uniqueFacts.length) {
      paras.push(uniqueFacts[factIdx]);
      factIdx += 1;
    }
    if (paras.length < 2) {
      const craftPads = buildEssayCraftPadPool(p, input);
      paras.push(craftPads[craftIdx % craftPads.length]);
      craftIdx += 1;
    }
    if (paras.length < 2 && factIdx < uniqueFacts.length) {
      paras.push(uniqueFacts[factIdx]);
      factIdx += 1;
    }
    sections.push({
      heading: headings[i] || `${facet} 정리`,
      body: paras.join("\n\n").trim(),
    });
  }
  return sections;
}

function buildDefaultResearchSections(opening, uniqueFacts, sectionCount, headings, p) {
  const sections = [];
  for (let i = 0; i < sectionCount; i += 1) {
    const paras = [];
    if (i === 0) paras.push(opening);
    const a = uniqueFacts[i * 2];
    const b = uniqueFacts[i * 2 + 1];
    if (a) paras.push(a);
    if (b) paras.push(b);
    if (!a && !b && uniqueFacts.length) {
      paras.push(uniqueFacts[i % uniqueFacts.length]);
    }
    if (paras.length < 2 && i > 0 && uniqueFacts.length > 1) {
      paras.push(uniqueFacts[(i + sectionCount) % uniqueFacts.length]);
    }
    if (!paras.length) {
      paras.push(`${p.brand} ${p.topicFacet || "안내"} 관련 포인트를 정리해 봤어요.`);
    }
    sections.push({
      heading: headings[i] || `${p.topicFacet} 정리`,
      body: paras.join("\n\n").trim(),
    });
  }
  return sections;
}

function buildTitle(input = {}, p) {
  const facet = topicWritingFacet(input) || p.topicFacet || defaultTopicFacet(input);
  const { flavor } = getIndustryFlavorForInput(input);
  if (isVisitReviewTopicInput(input)) {
    return `${p.regionBit}${p.brand} ${facet} 방문 후기`.replace(/\s+/g, " ").trim();
  }
  return `${p.regionBit}${p.brand} ${facet} — ${flavor.visitReason || "안내"} 정리`
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 조사 팩트 + 화자 프로필로 사람 칼럼형 본문 구성
 * @param {object} input
 */
export function buildResearchGroundedHumanPack(input = {}) {
  if (isFlowerRecommendationTopic(input)) {
    let pack = buildFlowerRecommendationEditorialPack(input);
    pack = polishMissionProsePack(pack, input);
    pack = applyHumanityFinishPass(pack, { input, ...input, skipDeliveryFinalize: true }, "blog");
    pack = applyPersonaEngineMetaPass(pack, input);
    return pack;
  }

  const p = deriveTopicWritingContext(input);
  const profile = resolvePersonaEngineProfile(input);
  const facts = dedupeRawFactsByCore(
    collectMergedResearchFactsFromInput(input).filter((f) => !isBlockedResearchFact(f, input))
  );

  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const sectionCount =
    profile.archetype === "essay"
      ? Math.max(4, tier.key === "short" ? 4 : tier.key === "long" ? 7 : 6)
      : tier.key === "short"
        ? 4
        : tier.key === "long"
          ? 7
          : 6;
  const headings = buildTopicArcSectionHeadings(input, sectionCount);
  const opening = buildHumanStoryProblemOpeningLead(input);

  const factLines = facts.map((f, i) => humanizeResearchFact(f, p, input, i, profile));
  const uniqueFacts = dedupeHumanizedFactsByCore([...new Set(factLines)].filter(Boolean));

  const sections =
    profile.archetype === "essay"
      ? buildEssayResearchSections(input, p, profile, opening, uniqueFacts, sectionCount, headings)
      : buildDefaultResearchSections(opening, uniqueFacts, sectionCount, headings, p);

  const subject = topicWritingFacet(input) || p.topicFacet || defaultTopicFacet(input);
  let pack = {
    title: buildTitle(input, p),
    representativeTitle: buildTitle(input, p),
    sections,
    conclusion: buildMissionConclusionLine(p, input, subject),
    hashtags: [],
    _meta: {
      researchGroundedHumanPack: true,
      personaEngineProfile: {
        id: profile.id,
        label: profile.label,
        v4Speaker: profile.v4Speaker,
      },
      researchFactCount: facts.length,
    },
  };

  pack = polishMissionProsePack(pack, input);
  const factLinePool = uniqueFacts.filter(Boolean);
  let bodyChars = countBlogBodyCharsWithSpaces(pack);
  const lengthTarget =
    profile.archetype === "essay"
      ? resolveEffectiveBlogLengthMin(pack, input)
      : tier.min;
  if (bodyChars < lengthTarget && (factLinePool.length || profile.archetype === "essay")) {
    let refillRound = 0;
    while (bodyChars < lengthTarget && refillRound < 8) {
      pack = deepenDensityFirstPack(pack, lengthTarget, input, {
        polishAfter: profile.archetype !== "essay",
        seedOffset: refillRound,
        researchLines: profile.archetype === "essay" ? [] : factLinePool,
      });
      bodyChars = countBlogBodyCharsWithSpaces(pack);
      refillRound += 1;
    }
  }
  if (isVisitReviewTopicInput(input)) {
    pack = applyVisitReviewTopicPackGate(pack, input);
  }
  pack = applyHumanityFinishPass(pack, { input, ...input, skipDeliveryFinalize: true }, "blog");
  pack = applyPersonaEngineMetaPass(pack, input);
  if (shouldApplyHumanColumnToResearchPack(input, profile)) {
    pack = applyHumanColumnProsePass(pack, input, { force: true });
  }
  pack = ensureResearchGroundedPackStructure(pack, input, { factLinePool: uniqueFacts });

  const full = getBlogFullText(pack);
  const cq = assertContentQualityForOutput(pack, input, input);
  const ed = assertEditorV95ForOutput(pack, input, input);
  const belief = scoreHumanBelief(full, input, pack);

  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      contentQuality: cq.contentQuality,
      editorEngineV95: ed.editorV95,
      humanBelief: belief,
    },
  };
}

/**
 * LLM 초안에 조사 팩트를 사람 문장으로 보강 (전체 교체 없음)
 */
export function weaveResearchFactsIntoPack(pack, input = {}) {
  if (!pack?.sections?.length || !hasUsableResearchFacts(input)) return pack;
  if (pack._meta?.researchGroundedHumanPack) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        researchFactsWoven: true,
        researchFactsAnchored: true,
      },
    };
  }

  const p = deriveTopicWritingContext(input);
  const profile = resolvePersonaEngineProfile(input);
  const facts = collectMergedResearchFactsFromInput(input);
  const factTexts = factTextsFromList(facts);
  const full = getBlogFullText(pack);

  function countAnchored(texts) {
    let n = 0;
    for (const f of texts) {
      const anchor = f.length > 14 ? f.slice(0, 10) : f;
      if (full.includes(f) || (anchor.length >= 4 && full.includes(anchor))) n += 1;
    }
    return n;
  }

  function rowText(row) {
    return String(typeof row === "string" ? row : row?.fact || row?.text || "").trim();
  }

  const brandFacts = facts.filter((row) => {
    const axis = String(row?.axis || "").toLowerCase();
    const src = String(row?.source || "").toLowerCase();
    return (
      axis === "brand" ||
      /store_features|brand_description|include_phrases/.test(src)
    );
  });
  const brandTexts = brandFacts.map(rowText).filter(Boolean);
  const brandAnchored = countAnchored(brandTexts);
  const brandNeed = Math.min(2, Math.max(1, brandTexts.length));

  let anchored = countAnchored(factTexts);
  const usable = facts.filter((f) => !isBlockedResearchFact(f, input)).length;
  const needWeave = Math.min(3, Math.max(1, usable));
  const brandOk = brandTexts.length === 0 || brandAnchored >= brandNeed;
  const generalOk =
    anchored >= needWeave && anchored >= Math.min(factTexts.length, 2);
  if (brandOk && generalOk) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        researchFactsWoven: true,
        wovenFactCount: anchored,
        researchFactsAnchored: true,
      },
    };
  }

  const prioritized = [
    ...facts.filter((row) => {
      const axis = String(row?.axis || "").toLowerCase();
      const src = String(row?.source || "").toLowerCase();
      return (
        axis === "brand" ||
        /store_features|brand_description|include_phrases/.test(src)
      );
    }),
    ...facts.filter((row) => {
      const axis = String(row?.axis || "").toLowerCase();
      const src = String(row?.source || "").toLowerCase();
      return !(
        axis === "brand" ||
        /store_features|brand_description|include_phrases/.test(src)
      );
    }),
  ];

  const woven = prioritized
    .slice(0, 12)
    .map((f, i) => humanizeResearchFact(f, p, input, i, profile))
    .filter(Boolean)
    .filter((line) => !textContainsUnverifiedSearchLeak(line, input))
    .filter((line) => {
      if (shouldUseVisitFieldFactTone(input, profile)) return true;
      return !/직접\s*다녀|직접\s*가서|보러\s*직접|한번\s*직접\s*가보려|현장\s*그래서/.test(line);
    });

  const sections = [...pack.sections];
  for (let i = 0; i < woven.length; i += 1) {
    const secIdx = i % sections.length;
    const line = woven[i];
    const existing = String(sections[secIdx]?.body || "").trim();
    if (!line || existing.includes(line.slice(0, 12))) continue;
    sections[secIdx] = {
      ...sections[secIdx],
      body: `${existing}\n\n${line}`.trim(),
    };
  }

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      researchFactsWoven: true,
      wovenFactCount: woven.length,
    },
  };
}

export function buildResearchFactLines(input = {}, limit = 6) {
  if (!hasUsableResearchFacts(input)) return [];
  const p = deriveTopicWritingContext(input);
  const profile = resolvePersonaEngineProfile(input);
  const facts = dedupeRawFactsByCore(
    collectMergedResearchFactsFromInput(input).filter((f) => !isBlockedResearchFact(f, input))
  );
  let lines = dedupeHumanizedFactsByCore(
    facts.map((f, i) => humanizeResearchFact(f, p, input, i, profile)).filter(Boolean)
  );
  if (!lines.length) {
    lines = buildIndustryResearchPadPool(p, input);
  }
  return lines.slice(0, limit);
}

/** 조사 팩 — 고유 humanized fact·essay pad로 tier 목표까지 보강 (업종 무관) */
export function expandResearchGroundedPackToTarget(pack, input = {}, targetChars) {
  if (!pack?.sections?.length || !targetChars || !hasUsableResearchFacts(input)) return pack;
  const target = Math.max(
    targetChars,
    resolveResearchGroundedDeliveryTargetChars(pack, input)
  );
  if (countBlogBodyCharsWithSpaces(pack) >= target) return pack;

  const p = deriveTopicWritingContext(input);
  const profile = resolvePersonaEngineProfile(input);
  const facts = dedupeRawFactsByCore(
    collectMergedResearchFactsFromInput(input).filter((f) => !isBlockedResearchFact(f, input))
  );
  const factLines = dedupeHumanizedFactsByCore(
    facts.map((f, i) => humanizeResearchFact(f, p, input, i, profile)).filter(Boolean)
  );
  const industryPads = buildIndustryResearchPadPool(p, input);
  const essayPads =
    profile.archetype === "essay" ? buildEssayCraftPadPool(p, input) : [];
  const pool = [...factLines, ...industryPads, ...essayPads].filter(Boolean);
  if (!pool.length) return pack;

  let next = pack;
  let guard = 0;
  const maxRounds = Math.max(pool.length * 4, 48);
  while (countBlogBodyCharsWithSpaces(next) < target && guard < maxRounds) {
    const line = pickFreshPadLine(pool, next, guard);
    if (!line) {
      next = deepenDensityFirstPack(next, target, input, {
        polishAfter: false,
        seedOffset: guard,
        researchLines: factLines,
      });
      guard += 1;
      continue;
    }
    const secIdx = guard % (next.sections?.length || 1);
    const sections = [...(next.sections || [])];
    sections[secIdx] = {
      ...sections[secIdx],
      body: `${sections[secIdx].body || ""}\n\n${line}`.trim(),
    };
    next = { ...next, sections };
    guard += 1;
  }
  if (countBlogBodyCharsWithSpaces(next) < target) {
    const fillLines = pool.length ? pool : buildIndustryResearchPadPool(p, input);
    for (let r = 0; r < 36 && countBlogBodyCharsWithSpaces(next) < target; r += 1) {
      next = deepenDensityFirstPack(next, target, input, {
        polishAfter: false,
        seedOffset: r + guard + pool.length,
        researchLines: fillLines,
      });
    }
  }
  return next;
}

/** 조사 팩 — 섹션별 최소 분량·문단 수 (outline_only 방지) */
export function ensureResearchGroundedSectionDensity(
  pack,
  input = {},
  minBodyChars = 96,
  minParas = 2
) {
  if (!pack?.sections?.length) return pack;
  const p = deriveTopicWritingContext(input);
  const pool = [
    ...buildResearchFactLines(input, 24),
    ...buildIndustryResearchPadPool(p, input),
  ].filter(Boolean);
  if (!pool.length) return pack;

  let cursor = 0;
  const sections = (pack.sections || []).map((sec) => {
    let body = String(sec.body || "").trim();
    let guard = 0;
    while (guard < pool.length * 3) {
      const chars = body.replace(/\s/g, "").length;
      const paras = body
        .split(/\n\n+/)
        .map((t) => t.trim())
        .filter((t) => t.replace(/\s/g, "").length >= 12);
      if (chars >= minBodyChars && paras.length >= minParas) break;
      const line = pickFreshPadLine(
        pool,
        { ...pack, sections: [{ ...sec, body }] },
        cursor + guard
      );
      if (!line) break;
      const stem = line.slice(0, 14);
      body =
        body && !body.includes(stem) ? `${body}\n\n${line}`.trim() : body.length ? body : line;
      guard += 1;
      cursor += 1;
    }
    return { ...sec, body };
  });
  let next = { ...pack, sections };
  next = stripGlobalExactDuplicateSentences(next);
  return next;
}

/** outline_only·coverage_thin_section 방지 — 섹션당 3문장·100자+ */
export function ensureSubstantiveResearchSections(
  pack,
  input = {},
  minSentences = 3,
  minChars = 100
) {
  if (!pack?.sections?.length) return pack;
  const p = deriveTopicWritingContext(input);
  const pool = [
    ...buildResearchFactLines(input, 16),
    ...buildIndustryResearchPadPool(p, input),
  ].filter(Boolean);
  if (!pool.length) return pack;

  let cursor = 0;
  const sections = (pack.sections || []).map((sec) => {
    let body = String(sec.body || "").trim();
    let guard = 0;
    while (
      guard < pool.length * 2 &&
      !isSubstantiveSectionBody(body, minSentences, minChars)
    ) {
      const line = pickFreshPadLine(pool, { ...pack, sections: [{ ...sec, body }] }, cursor + guard);
      if (!line) break;
      body = body ? `${body}\n\n${line}`.trim() : line;
      guard += 1;
      cursor += 1;
    }
    return { ...sec, body };
  });
  return stripGlobalExactDuplicateSentences({ ...pack, sections });
}

/**
 * 조사·화자 기반 플레이스 폴백
 */
export function buildResearchGroundedPlacePack(input = {}) {
  const lines = buildResearchFactLines(input, 5);
  const pack = humanizePlaceNoticePack(buildNorthStarPlacePack(input, lines), input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      researchGroundedChannelPack: true,
      channel: "place",
      researchFactCount: lines.length,
    },
  };
}

/**
 * 조사·화자 기반 인스타 폴백
 */
export function buildResearchGroundedInstagramPack(input = {}, instaToneKey = "emotional") {
  const lines = buildResearchFactLines(input, 8);
  const pack = buildNorthStarInstagramPack(input, instaToneKey, lines);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      researchGroundedChannelPack: true,
      channel: "instagram",
      researchFactCount: lines.length,
    },
  };
}

function channelFactAnchors(pack, channel, facts = []) {
  const full = getChannelFullText(pack, channel);
  const factTexts = factTextsFromList(facts);
  let anchored = 0;
  for (const f of factTexts) {
    const anchor = f.length > 14 ? f.slice(0, 10) : f;
    if (full.includes(f) || (anchor.length >= 4 && full.includes(anchor))) anchored += 1;
  }
  return anchored;
}

/**
 * 채널 pack에 조사 팩트 보강
 */
export function weaveResearchFactsIntoChannelPack(pack, channel = "place", input = {}) {
  if (!pack || !hasUsableResearchFacts(input)) return pack;
  const facts = collectMergedResearchFactsFromInput(input);
  if (channelFactAnchors(pack, channel, facts) >= 2) return pack;

  const woven = buildResearchFactLines(input, 3);
  if (!woven.length) return pack;

  if (channel === "place") {
    const detail = String(pack.detailBody || "").trim();
    const extra = woven
      .filter((line) => !detail.includes(line.slice(0, 12)))
      .map((line) => line.replace(/^·\s*/, "").trim())
      .filter(Boolean);
    if (!extra.length) return pack;
    return {
      ...pack,
      detailBody: `${detail}\n\n${extra.join("\n\n")}`.trim().slice(0, 520),
      _meta: { ...(pack._meta || {}), researchFactsWoven: true, wovenFactCount: extra.length },
    };
  }

  if (channel === "instagram") {
    const key = pack.lineBreakBody ? "lineBreakBody" : "body";
    const existing = String(pack[key] || "").trim();
    const extra = woven.filter((line) => !existing.includes(line.slice(0, 12)));
    if (!extra.length) return pack;
    const nextBody = `${existing}\n\n${extra.join("\n\n")}`.trim();
    return {
      ...pack,
      [key]: nextBody,
      body: key === "lineBreakBody" ? pack.body : nextBody,
      lineBreakBody: key === "lineBreakBody" ? nextBody : pack.lineBreakBody,
      _meta: { ...(pack._meta || {}), researchFactsWoven: true, wovenFactCount: extra.length },
    };
  }

  return pack;
}

/**
 * 조사 팩트가 있는데 채널 본문에 반영이 부족할 때 — weave 또는 research pack으로 승격
 */
export function upgradeChannelPackWithResearch(
  channel,
  pack,
  input = {},
  preferredSource = "channel_draft"
) {
  if (!pack || !hasUsableResearchFacts(input)) {
    return { pack, source: preferredSource };
  }
  const facts = collectMergedResearchFactsFromInput(input);
  if (channelFactAnchors(pack, channel, facts) >= 2) {
    return { pack, source: preferredSource };
  }
  const woven = weaveResearchFactsIntoChannelPack(pack, channel, input);
  if (woven._meta?.researchFactsWoven) {
    return { pack: woven, source: `${preferredSource}_research_woven` };
  }
  const toneKey = input.instaTone || "emotional";
  const researchPack =
    channel === "place"
      ? buildResearchGroundedPlacePack(input)
      : channel === "instagram"
        ? buildResearchGroundedInstagramPack(input, toneKey)
        : null;
  if (researchPack && isPublishableChannelPack(channel, researchPack)) {
    return {
      pack: researchPack,
      source:
        channel === "place" ? "research_grounded_place" : "research_grounded_instagram",
    };
  }
  return { pack: woven, source: preferredSource };
}

export function buildHumanColumnPack(input = {}) {
  if (hasUsableResearchFacts(input)) {
    return buildResearchGroundedHumanPack(input);
  }
  return null;
}

export function assertResearchPersonaGrounding(pack, input = {}) {
  if (!hasUsableResearchFacts(input)) {
    return { ok: true, skipped: true };
  }
  const persona = scorePersonaEngineAlignment(pack, input);
  const full = getBlogFullText(pack);
  const facts = factTextsFromList(collectMergedResearchFactsFromInput(input));
  let anchors = 0;
  for (const f of facts) {
    const a = f.length > 14 ? f.slice(0, 10) : f;
    if (full.includes(f) || (a.length >= 4 && full.includes(a))) anchors += 1;
  }
  const ok = persona.ok && anchors >= Math.min(2, Math.max(1, facts.length));
  return {
    ok,
    persona,
    factAnchors: anchors,
    reasons: ok
      ? []
      : [
          ...(persona.ok ? [] : ["persona_voice_weak"]),
          ...(anchors >= 2 ? [] : ["grounded_specificity_low"]),
        ],
  };
}
