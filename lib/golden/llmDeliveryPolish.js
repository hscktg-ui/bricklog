/**
 * LLM 원고 송출 마감 — 템플릿 치환 없이 말투·조사 밀도 보강
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { applyGoldenSafeEdit } from "@/lib/golden/goldenSafeEditEngine";
import { weaveResearchFactsIntoPack, buildResearchFactLines, hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import { deepenDensityFirstPack } from "@/lib/product/missionProseEngine";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";
import { INDUSTRY_CONTENT_DNA } from "@/lib/golden/haeshinContentDnaSeed";
import { extractBrandDnaFields } from "@/lib/golden/goldenBrandDnaEngine";

export function llmPackCharCount(pack) {
  return getBlogFullText(pack).replace(/\s/g, "").length;
}

/** tier min까지 확장 — GPT-beater human contract */
export function llmDeliveryTargetChars(input = {}, pack = {}) {
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const current = llmPackCharCount(pack);
  return Math.max(tier.min, current);
}

export function stripLlmPackSurfaceNoise(pack = {}) {
  const next = { ...pack };
  if (Array.isArray(next.hashtags)) next.hashtags = [];
  if (Array.isArray(next.titles) && next.titles.length > 1) {
    const keep = next.title || next.representativeTitle || next.titles[0];
    next.title = keep;
    next.representativeTitle = keep;
    delete next.titles;
  }
  return next;
}

export function normalizeLlmVoiceForDelivery(pack, input = {}) {
  return applyGoldenSafeEdit(stripLlmPackSurfaceNoise(pack), input, {
    forceVoice: "seupnida",
    forceApply: true,
  });
}

function missingIndustryDnaAnchors(full = "", input = {}) {
  const key = resolveGoldenIndustryKey(input);
  const dna = INDUSTRY_CONTENT_DNA[key] || INDUSTRY_CONTENT_DNA.etc;
  const missingIntents = (dna.searchIntents || []).filter(
    (intent) => !full.includes(intent.slice(0, Math.min(6, intent.length)))
  );
  const missingMust = (dna.mustInclude || []).filter((phrase) => {
    const word = phrase.split(/\s/)[0];
    return word.length >= 2 && !full.includes(word);
  });
  return { dna, missingIntents, missingMust };
}

function buildLlmDnaAnchorLine(input = {}, anchors = {}) {
  const { missingIntents = [], missingMust = [] } = anchors;
  const { brand, region, products } = extractBrandDnaFields(input);
  const bits = [...new Set([...missingMust, ...missingIntents.slice(0, 2)])];
  const productBits = products
    .map((p) => String(p).trim())
    .filter((p) => p.length >= 2 && p.length <= 16)
    .slice(0, 2);
  if (!bits.length && !productBits.length) return "";

  const place = [region, brand].filter(Boolean).join(" ");
  const productClause = productBits.length ? `${productBits.join("·")} ` : "";
  const anchorClause = bits.length ? `${bits.join("·")} ` : "";
  const subject = place || brand || "이 공간";
  return `${subject}에서는 ${productClause}${anchorClause}구성을 함께 살펴보시면 선택이 수월합니다.`
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 해신 DNA·브랜드 반영도 — 누락 검색 의도·must 키워드 1문장 보강 */
export function enrichLlmPackDnaAnchors(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const full = getBlogFullText(pack);
  const anchors = missingIndustryDnaAnchors(full, input);
  const line = buildLlmDnaAnchorLine(input, anchors);
  if (!line || full.includes(line.slice(0, 14))) return pack;

  const sections = [...pack.sections];
  const idx = Math.min(1, sections.length - 1);
  const body = String(sections[idx]?.body || "").trim();
  sections[idx] = {
    ...sections[idx],
    body: `${body}\n\n${line}`.trim(),
  };

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      llmDnaAnchors: true,
    },
  };
}

export function deepenLlmPackWithResearch(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const target = llmDeliveryTargetChars(input, pack);
  if (llmPackCharCount(pack) >= target) return pack;

  let next = hasUsableResearchFacts(input) ? weaveResearchFactsIntoPack(pack, input) : pack;
  const researchLines = hasUsableResearchFacts(input) ? buildResearchFactLines(input, 14) : [];
  let chars = countBlogBodyCharsWithSpaces(next);
  let round = 0;

  while (llmPackCharCount(next) < target && round < 10) {
    next = deepenDensityFirstPack(next, target, input, {
      polishAfter: true,
      seedOffset: round + 3,
      researchLines,
    });
    if (countBlogBodyCharsWithSpaces(next) <= chars) break;
    chars = countBlogBodyCharsWithSpaces(next);
    round += 1;
  }

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      llmResearchDeepen: true,
      llmDeepenTarget: target,
      llmDeepenChars: llmPackCharCount(next),
    },
  };
}

/** LLM light path — 말투 통일 → 조사 밀도 보강 → Safe Edit */
export function polishLlmPackForDelivery(pack, input = {}) {
  const inboundChars = llmPackCharCount(pack);
  let next = normalizeLlmVoiceForDelivery(pack, input);
  next = enrichLlmPackDnaAnchors(next, input);
  next = deepenLlmPackWithResearch(next, input);
  next = applyGoldenSafeEdit(next, input, { forceVoice: "seupnida", forceApply: true });
  if (inboundChars >= 200 && llmPackCharCount(next) < Math.max(180, inboundChars * 0.55)) {
    next = applyGoldenSafeEdit(
      enrichLlmPackDnaAnchors(normalizeLlmVoiceForDelivery(pack, input), input),
      input,
      { forceVoice: "seupnida", forceApply: true }
    );
    next = {
      ...next,
      _meta: { ...(next._meta || {}), llmPolishCharGuard: true },
    };
  }
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      llmDeliveryPolish: true,
    },
  };
}
