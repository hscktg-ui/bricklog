/**
 * 조사 → 기승전결 → 분량 (반복 없이)
 * Research facts를 arc 역할별로 한 번씩만 반영해 tier min까지 보강
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { collectMergedResearchFactsFromInput } from "@/lib/product/researchReadiness";
import {
  hasUsableResearchFacts,
  humanizeResearchFact,
} from "@/lib/content/researchGroundedHumanPack";
import { scoreResearchFactUtilization } from "@/lib/content/researchNarrativeDeliveryEngine";
import {
  applyEditorDuplicateSweep,
  detectDuplicateKillerIssues,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import { mapSectionArcRoles } from "@/lib/content/humanColumnPolishEngine";
import {
  applyNarrativeArcShape,
  scoreNarrativeCoherence,
} from "@/lib/product/narrativeArcShapeEngine";
import { scoreMagazineColumnArc } from "@/lib/content/columnMagazineArchetype";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { guardPackAgainstShrink } from "@/lib/product/packShrinkGuard";

export const RESEARCH_ARC_LENGTH_VERSION = "research-arc-length-v1";

const ARC_WEAVE_OPENERS = {
  gi: ["처음 ", "요즘 ", "손님 입장에서는 "],
  seung: ["현장에서 ", "직접 가 보니 ", "매장 안에서는 "],
  jeon: ["비교해 보면 ", "한편 ", "다른 기준으로는 "],
  gyeol: ["정리하면 ", "결국 ", "마지막으로 "],
};

function factAnchor(text = "") {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= 14) return t;
  return t.slice(0, 12);
}

function isFactAnchoredInText(full = "", factRaw = "") {
  const text = String(typeof factRaw === "string" ? factRaw : factRaw?.fact || "").trim();
  if (!text || text.length < 6) return true;
  const anchor = factAnchor(text);
  return (
    full.includes(text) ||
    (anchor.length >= 4 && full.includes(anchor)) ||
    (text.length >= 10 && full.includes(text.slice(0, 10)))
  );
}

function collectUnusedResearchFacts(pack, input = {}) {
  const full = getBlogFullText(pack);
  return collectMergedResearchFactsFromInput(input).filter(
    (f) => !isFactAnchoredInText(full, f)
  );
}

function sectionCharCount(sec = {}) {
  return String(sec.body || "").replace(/\s/g, "").length;
}

function pickSectionForRole(sections = [], roles = [], role) {
  let bestIdx = -1;
  let bestLen = Infinity;
  for (let i = 0; i < sections.length; i += 1) {
    if (roles[i] !== role) continue;
    const len = sectionCharCount(sections[i]);
    if (len < bestLen) {
      bestLen = len;
      bestIdx = i;
    }
  }
  if (bestIdx >= 0) return bestIdx;
  let fallback = 0;
  for (let i = 1; i < sections.length; i += 1) {
    if (sectionCharCount(sections[i]) < sectionCharCount(sections[fallback])) {
      fallback = i;
    }
  }
  return fallback;
}

function weaveFactLine(fact, role, p, input, slot, profile) {
  const human = humanizeResearchFact(fact, p, input, slot, profile);
  if (!human) return "";
  const openers = ARC_WEAVE_OPENERS[role] || ARC_WEAVE_OPENERS.seung;
  const opener = openers[slot % openers.length];
  const trimmed = human.trim();
  if (/^(처음|요즘|현장|직접|비교|한편|정리|결국|마지막)/.test(trimmed)) {
    return trimmed;
  }
  const lower =
    trimmed.charAt(0) === trimmed.charAt(0).toLowerCase()
      ? trimmed
      : trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return `${opener}${lower}`.replace(/\s+/g, " ").trim();
}

export function isResearchArcLengthDeliveryEnabled() {
  if (process.env.BRICLOG_RESEARCH_ARC_LENGTH === "false") return false;
  return isBriclogMissionEnforced();
}

/** @param {object} pack @param {object} [input] */
export function assessResearchArcLengthDelivery(pack, input = {}) {
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const utilization = scoreResearchFactUtilization(pack, input);
  const dup = detectDuplicateKillerIssues(getBlogFullText(pack));
  const arc = scoreMagazineColumnArc(pack);
  const coherence = scoreNarrativeCoherence(pack, input);
  const roles = pack._meta?.narrativeArcRoles || [];
  const hasArcSpread =
    roles.length >= 3 &&
    new Set(roles.slice(0, Math.min(roles.length, 4))).size >= 3;

  return {
    ok:
      chars >= tier.min &&
      utilization.ok &&
      dup.ok &&
      (arc.score >= 0.45 || coherence.score >= 0.45) &&
      hasArcSpread,
    chars,
    tierMin: tier.min,
    utilization,
    dupOk: dup.ok,
    arcScore: arc.score,
    hasArcSpread,
    version: RESEARCH_ARC_LENGTH_VERSION,
  };
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function applyResearchArcLengthDeliveryPass(pack, input = {}) {
  if (!pack?.sections?.length || !isResearchArcLengthDeliveryEnabled()) return pack;
  if (!hasUsableResearchFacts(input)) return pack;

  const inbound = pack;
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const p = deriveTopicWritingContext(input);
  const profile = resolvePersonaEngineProfile(input);

  let next = applyEditorDuplicateSweep(pack, { input }, "blog");
  next = ensureMinBlogSections(next, {}, input, 4);
  let chars = countBlogBodyCharsWithSpaces(next);
  const roles = mapSectionArcRoles(next.sections?.length || 0);
  let unused = collectUnusedResearchFacts(next, input);
  let woven = 0;
  let round = 0;

  while (chars < tier.min && unused.length > 0 && round < 24) {
    const factA = unused[0];
    const factB = unused.length > 1 && chars < tier.min * 0.6 ? unused[1] : null;
    const targetRole = roles[woven % roles.length] || "seung";
    const secIdx = pickSectionForRole(next.sections, roles, targetRole);
    let line = weaveFactLine(factA, targetRole, p, input, woven, profile);
    if (factB) {
      const lineB = weaveFactLine(factB, targetRole, p, input, woven + 1, profile);
      if (lineB && !line.includes(factAnchor(lineB))) {
        line = `${line} ${lineB}`.replace(/\s+/g, " ").trim();
      }
    }
    if (!line) {
      unused = unused.slice(factB ? 2 : 1);
      round += 1;
      continue;
    }

    const sections = [...next.sections];
    const existing = String(sections[secIdx]?.body || "").trim();
    const anchor = factAnchor(line);
    if (existing.includes(anchor)) {
      unused = unused.slice(factB ? 2 : 1);
      round += 1;
      continue;
    }

    sections[secIdx] = {
      ...sections[secIdx],
      body: existing ? `${existing}\n\n${line}` : line,
    };

    const candidate = { ...next, sections };
    const dup = detectDuplicateKillerIssues(getBlogFullText(candidate));
    if (!dup.ok) {
      unused = unused.slice(factB ? 2 : 1);
      round += 1;
      continue;
    }

    next = candidate;
    chars = countBlogBodyCharsWithSpaces(next);
    unused = collectUnusedResearchFacts(next, input);
    woven += 1;
    round += 1;
  }

  next = applyNarrativeArcShape(next, input, { force: true });
  next = stripGlobalExactDuplicateSentences(next);
  next = guardPackAgainstShrink(inbound, next, { stage: "researchArcLength" });

  const assessed = assessResearchArcLengthDelivery(next, input);
  const utilization = scoreResearchFactUtilization(next, input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      researchArcLengthPass: true,
      researchArcLengthVersion: RESEARCH_ARC_LENGTH_VERSION,
      researchArcLengthMet: chars >= tier.min,
      researchArcLengthChars: countBlogBodyCharsWithSpaces(next),
      researchArcLengthTarget: tier.min,
      researchArcFactsWoven: woven,
      researchArcLengthOk: assessed.ok,
      researchFactUtilization: utilization,
    },
  };
}
