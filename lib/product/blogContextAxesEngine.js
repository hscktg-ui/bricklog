/**
 * 블로그·채널 맥락 축 — 조사 깊이·주제·화자를 팩·입력에서 직접 산출
 * (relevance 가중치 합성 대신 information yield · v2 grounding · persona 사용)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { getChannelFullText } from "@/lib/content/channelPack";
import { evaluateV2Axis } from "@/lib/quality/v2AxisQuality";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import {
  scorePersonaEngineAlignment,
  resolvePersonaEngineProfile,
} from "@/lib/persona/personaEngineProfile";
import { scoreSpeakerSurfaceAlignment } from "@/lib/persona/speakerVoiceLock";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { scoreInputTopicDominance } from "@/lib/content/v13ContentGate";
import { detectVerbatimTopicUsage } from "@/lib/content/informationUnitEngine";
import { isResearchHeavyTopicInput } from "@/lib/content/topicFacetEngine";
import {
  isResearchProperNounTopic,
  scoreResearchProperNounAnchoring,
  scoreResearchFactAnchoringForInput,
} from "@/lib/product/researchProperNounProfile";

function clampScore(n, min = 38, max = 96) {
  if (typeof n !== "number" || Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function scoreResearchFactAnchoring(fullText = "", facts = [], input = {}) {
  if (isResearchProperNounTopic(input)) {
    return scoreResearchFactAnchoringForInput(fullText, input);
  }
  const list = Array.isArray(facts) ? facts : [];
  if (!list.length) {
    return { score: 52, anchored: 0, total: 0, ratio: 0 };
  }
  let anchored = 0;
  let total = 0;
  for (const row of list) {
    const f = String(row?.fact || row || "").trim();
    if (f.length < 4) continue;
    total += 1;
    const anchor = f.length > 14 ? f.slice(0, 10) : f;
    if (fullText.includes(f) || (anchor.length >= 4 && fullText.includes(anchor))) {
      anchored += 1;
    }
  }
  if (!total) return { score: 52, anchored: 0, total: 0, ratio: 0 };
  const ratio = anchored / total;
  let score = 44 + ratio * 52;
  if (ratio >= 0.55) score += 6;
  if (ratio >= 0.75) score += 4;
  return { score: clampScore(score), anchored, total, ratio };
}

function dominanceToScore(dominance = {}) {
  const ratio = typeof dominance.ratio === "number" ? dominance.ratio : 0;
  if (dominance.ok) return clampScore(72 + ratio * 24);
  return clampScore(40 + ratio * 38);
}

function resolveV2Axis(pack, input = {}) {
  const meta = pack._meta || {};
  const storedScores = meta.qualityScore?.v2?.scores || meta.v2Axis?.scores;
  if (storedScores) {
    return {
      scores: storedScores,
      grounding: meta.v2Axis?.grounding || meta.qualityScore?.v2?.grounding,
      factCount:
        meta.v2Axis?.factCount ??
        meta.qualityScore?.v2?.factCount ??
        input.researchFactCount ??
        input.researchFacts?.length ??
        0,
    };
  }
  const ctx = { ...input, input };
  const evaluated = evaluateV2Axis(pack, ctx, input);
  return {
    scores: evaluated.scores,
    grounding: evaluated.grounding,
    factCount: evaluated.factCount,
  };
}

function scoreResearchDepthAxis(pack, input = {}, gate = {}, v2Axis = {}) {
  const full = getBlogFullText(pack);
  const ctx = { ...input, input };
  const info = scoreInformationYield(full, ctx, "blog");
  const facts = collectMergedResearchFacts(
    input,
    input.v2AxisParsed,
    input.research
  );
  const anchoring = scoreResearchFactAnchoring(full, facts, input);
  const meta = pack._meta || {};

  const groundedRate =
    typeof gate.grounded?.rate === "number"
      ? gate.grounded.rate
      : typeof v2Axis.grounding?.ratio === "number"
        ? v2Axis.grounding.ratio
        : anchoring.ratio;

  const v2Ground = v2Axis.scores?.grounding;
  const v2Volume = v2Axis.scores?.researchVolume;
  const gateGround = clampScore(groundedRate * 100);

  let score =
    info.score * 0.34 +
    (typeof v2Ground === "number" ? v2Ground : gateGround) * 0.26 +
    (typeof v2Volume === "number" ? v2Volume : anchoring.score) * 0.2 +
    anchoring.score * 0.2;

  if (isResearchProperNounTopic(input)) {
    const proper = scoreResearchProperNounAnchoring(full, input);
    score =
      anchoring.score * 0.32 +
      proper.score * 0.28 +
      (typeof v2Ground === "number" ? v2Ground : gateGround) * 0.2 +
      Math.max(info.score, proper.score * 0.85) * 0.2;
    if (proper.researchRatio >= 0.35) score += 5;
    if (proper.productRatio >= 0.5) score += 4;
  }

  if (isResearchHeavyTopicInput(input) && anchoring.ratio >= 0.35) {
    score += 4;
  }

  if (meta.researchFactsWoven && (meta.wovenFactCount ?? 0) >= 2) score += 4;
  if (meta.researchGroundedHumanPack) score += 3;
  if (facts.length >= 8) score += 3;
  if (gate.grounded?.ok === false && facts.length >= 2) score -= 8;

  return {
    score: clampScore(score),
    infoYield: info.score,
    anchoring,
    factCount: facts.length,
    groundedRate,
  };
}

function scoreTopicAlignmentAxis(pack, input = {}, v2Axis = {}, v3 = null) {
  const full = getBlogFullText(pack);
  const ctx = { ...input, input };
  const dominance = scoreInputTopicDominance(full, ctx, "blog");
  const verbatim = detectVerbatimTopicUsage(pack, input);
  const info = scoreInformationYield(full, ctx, "blog");
  const brandSpecific = isResearchProperNounTopic(input);
  const properNouns = brandSpecific
    ? scoreResearchProperNounAnchoring(full, input)
    : null;

  let score =
    typeof v3?.topic === "number"
      ? v3.topic
      : typeof v2Axis.scores?.product === "number"
        ? v2Axis.scores.product
        : dominanceToScore(dominance);

  if (brandSpecific && properNouns) {
    score = Math.max(
      score,
      properNouns.score,
      typeof v2Axis.scores?.product === "number" ? v2Axis.scores.product : 0
    );
    if (properNouns.productRatio >= 0.45) {
      score = Math.max(score, 72 + Math.round(properNouns.productRatio * 20));
    }
    if (!verbatim.ok && verbatim.isProductNounTopic) {
      score -= 3;
    } else if (!verbatim.ok) {
      score -= 10;
    }
    if (!info.ok && info.score < 58) {
      score = Math.max(
        58,
        Math.min(score, properNouns.score + Math.round(info.score * 0.18))
      );
    }
  } else {
    if (!dominance.ok) score = Math.min(score, dominanceToScore(dominance));
    if (!verbatim.ok) score -= 10;
    if (!info.ok) score = Math.min(score, Math.max(38, info.score - 6));
    if (dominance.ok && info.ok && score < 72) score = 72;
  }

  return {
    score: clampScore(score),
    dominance,
    verbatim,
    infoYield: info.score,
    properNouns,
  };
}

function scoreSpeakerAlignmentAxis(pack, input = {}) {
  const persona = scorePersonaEngineAlignment(pack, input);
  const surface = scoreSpeakerSurfaceAlignment(pack, input);
  let score = clampScore(Math.round(persona.score * 0.55 + surface.score * 0.45));

  if (isResearchProperNounTopic(input)) {
    const proper = scoreResearchProperNounAnchoring(getBlogFullText(pack), input);
    if (proper.productRatio >= 0.4 && proper.score >= 68) {
      score = Math.max(score, clampScore(68 + proper.productRatio * 18));
    }
    if (
      isResearchHeavyTopicInput(input) &&
      persona.issues?.some((i) => i.type === "speaker_body_visit_leak") &&
      proper.score >= 72
    ) {
      score = Math.max(score, 74);
    }
  }

  return {
    score,
    persona,
    surface,
    profile: persona.profile || resolvePersonaEngineProfile(input),
  };
}

function buildTopicLabel(input = {}, pack = {}) {
  const reflection = pack._meta?.editorialReflection || {};
  return (
    reflection.topic ||
    String(input.topic || input.mainKeyword || "").trim() ||
    null
  );
}

/**
 * @param {object} pack
 * @param {Record<string, unknown>} input
 * @param {object} gate
 */
export function buildBlogContextAxes(pack = {}, input = {}, gate = {}) {
  const meta = pack._meta || {};
  if (meta.contextAxes?.axes?.length >= 4) {
    return meta.contextAxes;
  }

  const v3 = meta.qualityScore?.v3?.scores;
  const v2Axis = resolveV2Axis(pack, input);
  const topicMeta = scoreTopicAlignmentAxis(pack, input, v2Axis, v3);
  const researchMeta = scoreResearchDepthAxis(pack, input, gate, v2Axis);
  const speakerMeta = scoreSpeakerAlignmentAxis(pack, input);
  const topicLabel = buildTopicLabel(input, pack);
  const speakerLabel =
    meta.editorialReflection?.speaker ||
    speakerMeta.profile?.label ||
    "화자";

  const relevance =
    typeof gate.relevance?.rate === "number"
      ? gate.relevance.rate
      : typeof meta.contextRelevance === "number"
        ? meta.contextRelevance
        : typeof meta.similarity?.rate === "number"
          ? meta.similarity.rate
          : null;

  const brandScore = clampScore(
    v3?.brand ??
      v2Axis.scores?.brand ??
      (isResearchProperNounTopic(input)
        ? scoreResearchProperNounAnchoring(getBlogFullText(pack), input).score
        : relevance != null
          ? 48 + relevance * 38
          : 52)
  );
  const regionScore = clampScore(
    v3?.region ??
      v2Axis.scores?.region ??
      (relevance != null ? 46 + relevance * 36 : 50)
  );

  const axes = [
    { id: "brand", label: "브랜드 맥락", score: brandScore },
    { id: "region", label: "지역 정합", score: regionScore },
    {
      id: "topic",
      label: topicLabel ? `주제 · ${topicLabel.slice(0, 12)}` : "주제 답변",
      score: topicMeta.score,
    },
    {
      id: "trust",
      label: "조사·근거",
      score: researchMeta.score,
    },
    {
      id: "speaker",
      label: `화자 · ${String(speakerLabel).slice(0, 14)}`,
      score: speakerMeta.score,
    },
  ];

  const reflection = meta.editorialReflection || {};
  if (reflection.season) {
    axes.push({
      id: "season",
      label: `시의 · ${reflection.season}`,
      score: clampScore(50 + (relevance ?? 0.55) * 38),
    });
  }

  return {
    axes,
    computedAt: new Date().toISOString(),
    research: {
      factCount: researchMeta.factCount,
      anchoredRatio: researchMeta.anchoring.ratio,
      infoYield: researchMeta.infoYield,
      depthTier: input.researchDepthTier || meta.researchDepthTier || "direct",
      groundedRate: researchMeta.groundedRate,
    },
    topic: {
      dominanceOk: topicMeta.dominance.ok,
      dominanceRatio: topicMeta.dominance.ratio,
      verbatimOk: topicMeta.verbatim.ok,
      properNounScore: topicMeta.properNouns?.score,
      productRatio: topicMeta.properNouns?.productRatio,
    },
    speaker: {
      personaId: speakerMeta.profile?.id,
      score: speakerMeta.score,
    },
  };
}

/** place · instagram — 채널 본문 기준 축 */
export function buildChannelContextAxes(pack = {}, input = {}, channel = "place") {
  const meta = pack._meta || {};
  if (meta.contextAxes?.axes?.length >= 4) {
    return meta.contextAxes;
  }

  const ch = channel === "instagram" ? "instagram" : "place";
  const ctx = { ...input, input, contentChannel: ch };
  const full = getChannelFullText(pack, ch);
  const info = scoreInformationYield(full, ctx, ch);
  const v2 = evaluateV2Axis(pack, ctx, { ...input, contentChannel: ch });
  const topic =
    String(input.topic || input.mainKeyword || "").trim() ||
    String(pack.title || pack.hook || "").trim().slice(0, 24);
  const speakerMeta = scoreSpeakerAlignmentAxis(
    ch === "blog" ? pack : { ...pack, sections: [{ body: full }] },
    input
  );
  const profile = resolvePersonaEngineProfile(input);

  const groundingScore =
    typeof v2.scores?.grounding === "number"
      ? v2.scores.grounding
      : clampScore((v2.grounding?.ratio || 0) * 100);

  const axes = [
    {
      id: "brand",
      label: "브랜드 맥락",
      score: clampScore(v2.scores?.brand ?? 54),
    },
    {
      id: "region",
      label: "지역 정합",
      score: clampScore(v2.scores?.region ?? 52),
    },
    {
      id: "topic",
      label: topic ? `주제 · ${topic.slice(0, 12)}` : "주제 답변",
      score: clampScore(v2.scores?.product ?? info.score),
    },
    {
      id: "trust",
      label: "조사·근거",
      score: clampScore(groundingScore * 0.45 + info.score * 0.55),
    },
    {
      id: "speaker",
      label: `화자 · ${String(profile.label || "화자").slice(0, 14)}`,
      score: speakerMeta.score,
    },
  ];

  return {
    axes,
    computedAt: new Date().toISOString(),
    channel: ch,
    research: {
      factCount: v2.factCount ?? input.researchFacts?.length ?? 0,
      infoYield: info.score,
      groundedRate: v2.grounding?.ratio ?? 0,
    },
  };
}

export function stampBlogContextAxesMeta(pack, input = {}, gate = {}, channel = "blog") {
  if (!pack || typeof pack !== "object") return pack;
  const contextAxes =
    channel === "blog"
      ? buildBlogContextAxes(pack, input, gate)
      : buildChannelContextAxes(pack, input, channel);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      contextAxes,
    },
  };
}
