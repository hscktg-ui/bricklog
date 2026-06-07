/**
 * 조사·화자 기반 사람 칼럼 — mission 템플릿 폴백 대체
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { getChannelFullText } from "@/lib/content/channelPack";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";
import {
  deriveTopicWritingContext,
  isVisitReviewTopicInput,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { buildHumanStoryProblemOpeningLead } from "@/lib/product/humanStoryEngine";
import { buildTopicArcSectionHeadings } from "@/lib/content/humanColumnPolishEngine";
import { buildMissionConclusionLine } from "@/lib/product/missionProseEngine";
import {
  resolvePersonaEngineProfile,
  scorePersonaEngineAlignment,
} from "@/lib/persona/personaEngineProfile";
import { applyVisitReviewTopicPackGate } from "@/lib/content/visitReviewTopicGate";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { polishMissionProsePack } from "@/lib/product/missionProseEngine";
import { factTextsFromList } from "@/lib/content/v2ResearchFacts";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { applyPersonaEngineMetaPass } from "@/lib/persona/personaEngineProfile";
import { assertContentQualityForOutput } from "@/lib/product/contentQualityEngine";
import { assertEditorV95ForOutput } from "@/lib/product/briclogEditorEngineV95";
import { scoreHumanBelief } from "@/lib/product/humanBeliefEngine";

const PROMPT_ONLY_RE =
  /지역명은\s*자연스럽게|방문·체험·비교를\s*전제|공식·매장\s*안내\s*기준|원문\s*복사\s*금지|입력\s*우선/;

export function hasUsableResearchFacts(input = {}) {
  const facts = collectMergedResearchFacts(input).filter((f) => {
    const t = String(f?.fact || f || "").trim();
    return t.length >= 6 && !PROMPT_ONLY_RE.test(t);
  });
  return facts.length >= 2;
}

function cleanFactText(raw = "") {
  return String(raw || "")
    .replace(/\[.*?\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.\s*$/, "");
}

function humanizeResearchFact(fact, p, input, slot = 0, profile = {}) {
  const text = cleanFactText(typeof fact === "string" ? fact : fact?.fact || "");
  if (!text) return "";

  const isField = profile.archetype === "field_review" || isVisitReviewTopicInput(input);
  const tail = text.length > 72 ? `${text.slice(0, 68)}…` : text;

  if (isField) {
    const pool = [
      `${p.regionBit}${p.brand}에 가서 ${tail}를 직접 확인했어요.`,
      `현장에서 ${tail} 이야기를 들으며 메모해 뒀어요.`,
      `직접 보니 ${tail} 쪽이 눈에 들어왔어요.`,
      `당일 안내 기준으로 ${tail}를 다시 짚어 봤어요.`,
    ];
    return pool[slot % pool.length];
  }

  const pool = [
    `${p.brand} 관련해서 ${tail}는 조사한 내용과 맞아 떨어졌어요.`,
    `${tail} — 이 부분은 공개된 안내를 바탕으로 정리했어요.`,
    `비교할 때 ${tail}가 기준이 됐어요.`,
  ];
  return pool[slot % pool.length];
}

function buildTitle(input = {}, p) {
  const facet = topicWritingFacet(input) || p.topicFacet || "이용";
  const { flavor } = getIndustryFlavorForInput(input);
  if (isVisitReviewTopicInput(input)) {
    return `${p.regionBit}${p.brand} ${facet} 방문 후기`.replace(/\s+/g, " ").trim();
  }
  return `${p.regionBit}${p.brand} ${facet} — ${flavor.visitReason || "이용"} 정리`
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 조사 팩트 + 화자 프로필로 사람 칼럼형 본문 구성
 * @param {object} input
 */
export function buildResearchGroundedHumanPack(input = {}) {
  const p = deriveTopicWritingContext(input);
  const profile = resolvePersonaEngineProfile(input);
  const facts = collectMergedResearchFacts(input).filter((f) => {
    const t = String(f?.fact || f || "").trim();
    return t.length >= 6 && !PROMPT_ONLY_RE.test(t);
  });

  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const sectionCount = tier.key === "short" ? 4 : tier.key === "long" ? 7 : 6;
  const headings = buildTopicArcSectionHeadings(input, sectionCount);
  const opening = buildHumanStoryProblemOpeningLead(input);

  const factLines = facts.map((f, i) => humanizeResearchFact(f, p, input, i, profile));
  const uniqueFacts = [...new Set(factLines)].filter(Boolean);

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
    if (paras.length < 2 && i > 0) {
      paras.push(
        `${p.regionBit}${p.brand}에서 ${p.topicFacet}를 볼 때 조사해 둔 내용을 기준으로 비교해 봤어요.`
      );
    }
    sections.push({
      heading: headings[i] || `${p.topicFacet} 정리`,
      body: paras.join("\n\n").trim(),
    });
  }

  const subject = topicWritingFacet(input) || p.topicFacet || "이용";
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
  if (isVisitReviewTopicInput(input)) {
    pack = applyVisitReviewTopicPackGate(pack, input);
  }
  pack = applyHumanityFinishPass(pack, { input, ...input }, "blog");
  pack = applyPersonaEngineMetaPass(pack, input);

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

  const p = deriveTopicWritingContext(input);
  const profile = resolvePersonaEngineProfile(input);
  const facts = collectMergedResearchFacts(input);
  const factTexts = factTextsFromList(facts);
  const full = getBlogFullText(pack);
  let anchored = 0;
  for (const f of factTexts) {
    const anchor = f.length > 14 ? f.slice(0, 10) : f;
    if (full.includes(f) || (anchor.length >= 4 && full.includes(anchor))) anchored += 1;
  }
  if (anchored >= 2) return pack;

  const woven = facts
    .slice(0, 6)
    .map((f, i) => humanizeResearchFact(f, p, input, i, profile))
    .filter(Boolean);

  const sections = [...pack.sections];
  const gi = sections[0];
  if (gi) {
    const existing = String(gi.body || "").trim();
    const extra = woven.slice(0, 2).filter((line) => !existing.includes(line.slice(0, 12)));
    if (extra.length) {
      sections[0] = {
        ...gi,
        body: `${existing}\n\n${extra.join("\n\n")}`.trim(),
      };
    }
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
  const facts = collectMergedResearchFacts(input).filter((f) => {
    const t = String(f?.fact || f || "").trim();
    return t.length >= 6 && !PROMPT_ONLY_RE.test(t);
  });
  const lines = facts.map((f, i) => humanizeResearchFact(f, p, input, i, profile));
  return [...new Set(lines)].filter(Boolean).slice(0, limit);
}

/**
 * 조사·화자 기반 플레이스 폴백
 */
export function buildResearchGroundedPlacePack(input = {}) {
  const p = deriveTopicWritingContext(input);
  const lines = buildResearchFactLines(input, 5);
  const brand = p.brand;
  const region = String(input.region || "").trim();
  const facet = topicWritingFacet(input) || p.topicFacet || "이용";
  const title = isVisitReviewTopicInput(input)
    ? `${p.regionBit}${brand} ${facet} 방문 후기`.replace(/\s+/g, " ").trim()
    : `${p.regionBit}${brand} ${facet}`.replace(/\s+/g, " ").trim();

  const shortNotice = (lines[0] || `${brand} ${facet} 소식`).slice(0, 120);
  const detailBody = [
    isVisitReviewTopicInput(input)
      ? `${p.regionBit}${brand}에 직접 다녀와서 확인한 내용을 정리했어요.`
      : null,
    ...lines,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 520);

  return {
    title: title.slice(0, 44),
    shortNotice,
    detailBody,
    shortBody: shortNotice,
    body: [shortNotice, detailBody].filter(Boolean).join("\n\n"),
    tags: [region, brand, facet]
      .filter(Boolean)
      .slice(0, 5)
      .map((t) => `#${String(t).replace(/\s+/g, "")}`),
    _meta: {
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
  const p = deriveTopicWritingContext(input);
  const lines = buildResearchFactLines(input, 5);
  const facet = topicWritingFacet(input) || p.topicFacet || "이야기";
  const hook = (
    isVisitReviewTopicInput(input)
      ? `${p.regionBit}${p.brand} ${facet} — 직접 다녀온 후기`
      : `${p.regionBit}${facet} — ${p.brand}`
  ).slice(0, 56);

  const body = [
    isVisitReviewTopicInput(input)
      ? `${p.regionBit}${p.brand}에 가서 ${facet}를 직접 확인했어요.`
      : null,
    ...lines,
    instaToneKey === "informative"
      ? `조사해 둔 내용 기준으로 짧게 정리했어요.`
      : `마음에 드는 조건이 있으면 한번 가 보세요.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const ending = `${p.brand}${p.regionBit ? ` · ${String(input.region || "").trim()}` : ""}`;
  const hashtags = [input.region, p.brand, facet, "방문후기", "매장소식"]
    .filter(Boolean)
    .slice(0, 8)
    .map((t) => `#${String(t).replace(/\s+/g, "")}`);

  return {
    hook,
    body,
    lineBreakBody: body,
    ending,
    hashtags,
    _meta: {
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
  const facts = collectMergedResearchFacts(input);
  if (channelFactAnchors(pack, channel, facts) >= 2) return pack;

  const woven = buildResearchFactLines(input, 3);
  if (!woven.length) return pack;

  if (channel === "place") {
    const detail = String(pack.detailBody || "").trim();
    const extra = woven.filter((line) => !detail.includes(line.slice(0, 12)));
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
  const facts = factTextsFromList(collectMergedResearchFacts(input));
  let anchors = 0;
  for (const f of facts) {
    const a = f.length > 14 ? f.slice(0, 10) : f;
    if (full.includes(f) || (a.length >= 4 && full.includes(a))) anchors += 1;
  }
  const ok = persona.ok && anchors >= 2;
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
