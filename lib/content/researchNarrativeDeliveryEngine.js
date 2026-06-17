/**
 * 조사 팩트 → 사람이 쓴 듯한 연결 본문 (송출 SSOT)
 * 조사 UI는 풍부한데 완성 글이 짧·단절·무생동감일 때 보강
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { DEFAULT_BLOG_LENGTH_TIER, resolveBlogLengthTier } from "@/lib/constants";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { collectMergedResearchFactsFromInput } from "@/lib/product/researchReadiness";
import {
  buildResearchFactLines,
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack";
import { deepenDensityFirstPack } from "@/lib/product/missionProseEngine";
import { buildHumanStoryProblemOpeningLead } from "@/lib/product/humanStoryEngine";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";

export const RESEARCH_NARRATIVE_DELIVERY_VERSION = "research-narrative-v1";

const NARRATIVE_BRIDGES = [
  "이어서 ",
  "같은 기준으로 ",
  "한 가지 더 짚자면 ",
  "현장에서 확인한 바로는 ",
  "매장 안내와 맞춰 보면 ",
  "그다음 ",
];

function factAnchor(text = "") {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= 14) return t;
  return t.slice(0, 12);
}

/** @returns {{ ok: boolean, anchored: number, total: number, ratio: number }} */
export function scoreResearchFactUtilization(pack, input = {}) {
  const facts = collectMergedResearchFactsFromInput(input);
  if (!facts.length) return { ok: true, anchored: 0, total: 0, ratio: 1, skipped: true };

  const full = getBlogFullText(pack);
  let anchored = 0;
  for (const row of facts) {
    const text = String(row?.fact || row || "").trim();
    if (text.length < 6) continue;
    const anchor = factAnchor(text);
    if (
      full.includes(text) ||
      (anchor.length >= 4 && full.includes(anchor)) ||
      (text.length >= 10 && full.includes(text.slice(0, 10)))
    ) {
      anchored += 1;
    }
  }
  const total = facts.length;
  const ratio = total ? anchored / total : 1;
  const minAnchored = total >= 6 ? 4 : total >= 3 ? 2 : 1;
  return {
    ok: anchored >= minAnchored || ratio >= 0.55,
    anchored,
    total,
    ratio,
  };
}

function buildResearchNarrativeParagraphs(input = {}, limit = 12) {
  const lines = buildResearchFactLines(input, limit);
  if (lines.length <= 1) return lines;

  const paras = [];
  for (let i = 0; i < lines.length; i += 2) {
    const a = lines[i];
    const b = lines[i + 1];
    if (!b) {
      paras.push(a);
      continue;
    }
    const bridge = NARRATIVE_BRIDGES[(i / 2) % NARRATIVE_BRIDGES.length];
    paras.push(`${a} ${bridge}${b}`);
  }
  return paras;
}

function enrichPackWithResearchNarrative(pack, input = {}) {
  const p = deriveTopicWritingContext(input);
  const profile = resolvePersonaEngineProfile(input);
  const narrativeParas = buildResearchNarrativeParagraphs(input, 14);
  if (!narrativeParas.length) return pack;

  const sections = (pack.sections || []).map((sec) => ({ ...sec }));
  let paraIdx = 0;

  if (sections.length && paraIdx < narrativeParas.length) {
    const opening = buildHumanStoryProblemOpeningLead(input);
    const firstBody = String(sections[0].body || "").trim();
    if (opening && !firstBody.includes(opening.slice(0, 10))) {
      sections[0] = {
        ...sections[0],
        body: firstBody ? `${opening}\n\n${firstBody}` : opening,
      };
    }
  }

  for (let i = 0; i < sections.length && paraIdx < narrativeParas.length; i += 1) {
    const body = String(sections[i].body || "").trim();
    const thin = body.replace(/\s/g, "").length < 140;
    if (!thin && i > 0 && paraIdx > 0) continue;

    const chunk = [];
    while (paraIdx < narrativeParas.length && chunk.length < 2) {
      const line = narrativeParas[paraIdx];
      if (line && !body.includes(line.slice(0, 12))) chunk.push(line);
      paraIdx += 1;
    }
    if (!chunk.length) continue;
    sections[i] = {
      ...sections[i],
      body: body ? `${body}\n\n${chunk.join("\n\n")}` : chunk.join("\n\n"),
    };
  }

  while (paraIdx < narrativeParas.length && sections.length) {
    const lastIdx = sections.length - 1;
    const tail = narrativeParas[paraIdx];
    const existing = String(sections[lastIdx].body || "").trim();
    if (!existing.includes(tail.slice(0, 12))) {
      sections[lastIdx] = {
        ...sections[lastIdx],
        body: `${existing}\n\n${tail}`.trim(),
      };
    }
    paraIdx += 1;
  }

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      researchNarrativeEnriched: true,
      personaEngineProfile: profile?.id
        ? { id: profile.id, label: profile.label }
        : pack._meta?.personaEngineProfile,
    },
  };
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function applyResearchNarrativeDeliveryPass(pack, input = {}) {
  if (!pack?.sections?.length || !hasUsableResearchFacts(input)) return pack;

  const inboundChars = countBlogBodyCharsWithSpaces(pack);
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const minSoft = Math.max(720, Math.round(tier.min * 0.4));
  const utilization = scoreResearchFactUtilization(pack, input);
  const needsEnrich =
    !utilization.ok ||
    inboundChars < minSoft ||
    (pack.sections?.length || 0) < 4;

  if (!needsEnrich) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        researchNarrativePass: true,
        researchNarrativeOk: true,
        researchFactUtilization: utilization,
      },
    };
  }

  if (pack._meta?.researchArcLengthPass && utilization.ok) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        researchNarrativePass: true,
        researchNarrativeOk: true,
        researchNarrativeSkipped: "researchArcLength",
        researchFactUtilization: utilization,
      },
    };
  }

  let next = enrichPackWithResearchNarrative(pack, input);
  next = weaveResearchFactsIntoPack(next, input);

  let outChars = countBlogBodyCharsWithSpaces(next);
  if (outChars < minSoft) {
    let round = 0;
    const researchLines = buildResearchFactLines(input, 14);
    while (outChars < minSoft && round < 6) {
      next = deepenDensityFirstPack(next, minSoft, input, {
        polishAfter: true,
        seedOffset: round + 2,
        researchLines,
      });
      outChars = countBlogBodyCharsWithSpaces(next);
      round += 1;
    }
  }

  if (outChars < inboundChars * 0.88 && inboundChars >= 200) {
    next = pack;
    outChars = inboundChars;
  }

  const finalUtil = scoreResearchFactUtilization(next, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      researchNarrativePass: true,
      researchNarrativeVersion: RESEARCH_NARRATIVE_DELIVERY_VERSION,
      researchNarrativeOk: finalUtil.ok && outChars >= Math.min(minSoft, inboundChars * 0.95),
      researchFactUtilization: finalUtil,
      researchFactsWoven: finalUtil.ok || next._meta?.researchFactsWoven,
    },
  };
}
