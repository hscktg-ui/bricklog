/**
 * 에디터·작가 관점 송출 — 반복 제거 후 분량·서사 보강
 */
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isClientResearchPreVerified } from "@/lib/config/briclogFastPipeline";
import {
  applyEditorDuplicateSweep,
  detectDuplicateKillerIssues,
} from "@/lib/content/duplicateKillerEngine";
import {
  weaveSectionPlanGaps,
  ensureTierMinConclusion,
} from "@/lib/content/editorQualityEngine";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";
import { finalizeMissionProsePack, deepenDensityFirstPack } from "@/lib/product/missionProseEngine";
import { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";
import {
  buildResearchFactLines,
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
  buildResearchGroundedHumanPack,
} from "@/lib/content/researchGroundedHumanPack";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import {
  applyHumanColumnProsePass,
  scoreHumanColumnProseContamination,
} from "@/lib/product/humanColumnProseEngine";
import { ensureMinExperienceObservation } from "@/lib/product/briclogExperienceOpinionEngine";
import { applyDisplayBodyGuardPack } from "@/lib/content/displayBodyGuards";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { stripFurnitureIndustryLeakFromPack } from "@/lib/product/briclogEngineV4";
import { shouldSuppressLengthTopoff } from "@/lib/product/coreContentEngine";
import { shouldPreferNaturalnessOverDensity } from "@/lib/product/naturalVoiceDelivery";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract";
import { isMissionFallbackPack } from "@/lib/product/briclogWriterEngine";
import { isVisitReviewSovereignEligible } from "@/lib/product/visitReviewSovereignEngine";
import { getChannelFullText } from "@/lib/content/channelPack";
import { weaveResearchFactsIntoChannelPack } from "@/lib/content/researchGroundedHumanPack";
import { PLACE_CHANNEL } from "@/styles/channels/placeStyle";
import { strengthenInstagramCaption } from "@/lib/channel/instagramExpertPanel";
import { formatHashtag, regionCompact } from "@/lib/prompts/engine/textUtils";

/**
 * 중복 제거 후 tier min 미달이면 — 조사·섹션 플랜·칼럼 서사로 분량 보강 (패딩 문장 금지)
 * @param {object} pack
 * @param {object} input
 * @param {object} [ctx]
 */
export function applyEditorWriterLengthPass(pack, input = {}, ctx = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;
  if (pack?._meta?.visitReviewSovereignLlm) return pack;
  if (
    isVisitReviewSovereignEligible(input) &&
    isMissionFallbackPack(pack, input)
  ) {
    return pack;
  }

  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const target = tier.min;
  const inboundChars = countBlogBodyCharsWithSpaces(pack);
  let next = pack;
  let chars = inboundChars;

  const finishPass = (dupOk = true) => ({
    ...next,
    _meta: {
      ...(next._meta || {}),
      editorWriterLengthPass: true,
      editorWriterLengthMet: chars >= target,
      editorWriterLengthChars: chars,
      editorWriterLengthTarget: target,
      editorWriterLengthDupOk: dupOk,
    },
  });

  const applyLightSweep = () => {
    const dupBefore = detectDuplicateKillerIssues(getBlogFullText(next));
    if (!dupBefore.ok) {
      next = applyEditorDuplicateSweep(next, { input, ...ctx }, "blog");
      chars = countBlogBodyCharsWithSpaces(next);
    }
    next = applyDisplayBodyGuardPack(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
    if (chars < inboundChars) {
      next = pack;
      chars = inboundChars;
      next = {
        ...next,
        _meta: { ...(next._meta || {}), editorWriterShrinkGuard: true },
      };
    }
    if (resolveBriclogIndustryKey(input) === "furniture") {
      const beforeStrip = chars;
      next = stripFurnitureIndustryLeakFromPack(next, input);
      chars = countBlogBodyCharsWithSpaces(next);
      if (chars < beforeStrip * 0.9 && beforeStrip >= 120) {
        next = pack;
        chars = inboundChars;
      }
    }
    return finishPass(detectDuplicateKillerIssues(getBlogFullText(next)).ok);
  };

  if (shouldSuppressLengthTopoff(pack, input) && inboundChars >= 240) {
    return applyLightSweep();
  }

  if (shouldPreferNaturalnessOverDensity(pack, input)) {
    const voiceContract = assessHumanColumnContract(pack, input);
    if (voiceContract.humanVoiceMet || voiceContract.beliefScore >= 85) {
      return applyLightSweep();
    }
  }

  if (chars >= target) {
    next = applyEditorDuplicateSweep(next, { input, ...ctx }, "blog");
    next = applyDisplayBodyGuardPack(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
    const dupFinal = detectDuplicateKillerIssues(getBlogFullText(next));
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        editorWriterLengthPass: true,
        editorWriterLengthMet: true,
        editorWriterLengthChars: chars,
        editorWriterLengthTarget: target,
        editorWriterLengthDupOk: dupFinal.ok,
      },
    };
  }

  if (hasUsableResearchFacts(input)) {
    next = weaveResearchFactsIntoPack(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target) {
    next = weaveSectionPlanGaps(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target) {
    next = ensureTierMinConclusion(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  const yieldBefore = scoreInformationYield(getBlogFullText(next), { input }, "blog");
  if (chars < target && (!yieldBefore.ok || chars < target * 0.82)) {
    const researchLines = hasUsableResearchFacts(input)
      ? buildResearchFactLines(input, 10)
      : [];
    next = deepenPackBodiesToMin(
      next,
      target,
      { ...ctx, input, researchLines },
      input
    );
    chars = countBlogBodyCharsWithSpaces(next);
  }

  const proseScore = scoreHumanColumnProseContamination(next, input);
  if (
    chars < target * 0.9 &&
    (!next._meta?.humanColumnProsePass || !proseScore.ok)
  ) {
    next = applyHumanColumnProsePass(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target) {
    next = ensureMissionProseTierLength(next, { input, ...ctx });
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target) {
    next = deepenMissionProseToMin(next, target, input);
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target) {
    let round = 0;
    const densityCap = shouldPreferNaturalnessOverDensity(next, input) ? 2 : isClientResearchPreVerified(input) ? 5 : 8;
    const researchLines = hasUsableResearchFacts(input)
      ? buildResearchFactLines(input, 12)
      : [];
    while (chars < target && round < densityCap) {
      next = deepenDensityFirstPack(next, target, input, {
        polishAfter: true,
        seedOffset: round + 4,
        researchLines,
      });
      const afterRound = countBlogBodyCharsWithSpaces(next);
      if (afterRound <= chars) break;
      chars = afterRound;
      round += 1;
    }
  }

  if (chars < target) {
    next = finalizeMissionProsePack(next, input, { min: target, target });
    chars = countBlogBodyCharsWithSpaces(next);
  }

  if (chars < target && hasUsableResearchFacts(input)) {
    const grounded = buildResearchGroundedHumanPack({
      ...input,
      blogLengthTier: input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER,
    });
    const groundedChars = countBlogBodyCharsWithSpaces(grounded);
    if (groundedChars > chars && groundedChars >= inboundChars * 0.92) {
      next = {
        ...grounded,
        title: next.title || grounded.title,
        representativeTitle:
          next.representativeTitle || grounded.representativeTitle,
        conclusion: next.conclusion || grounded.conclusion,
        _meta: {
          ...(next._meta || {}),
          ...(grounded._meta || {}),
          editorWriterGroundedRefill: true,
        },
      };
      chars = groundedChars;
    }
  }

  if (chars < target) {
    let round = 0;
    const researchLines = hasUsableResearchFacts(input)
      ? buildResearchFactLines(input, 14)
      : [];
    while (chars < target && round < 4) {
      next = deepenDensityFirstPack(next, target, input, {
        polishAfter: true,
        seedOffset: round + 12,
        researchLines,
      });
      const afterRound = countBlogBodyCharsWithSpaces(next);
      if (afterRound <= chars) break;
      chars = afterRound;
      round += 1;
    }
  }

  next = applyEditorDuplicateSweep(next, { input, ...ctx }, "blog");
  chars = countBlogBodyCharsWithSpaces(next);

  if (chars < target) {
    next = deepenMissionProseToMin(next, target, input);
    chars = countBlogBodyCharsWithSpaces(next);
    next = applyEditorDuplicateSweep(next, { input, ...ctx }, "blog");
  }

  next = applyDisplayBodyGuardPack(next, input);
  chars = countBlogBodyCharsWithSpaces(next);
  if (chars < inboundChars * 0.9 && inboundChars >= 120) {
    next = pack;
    chars = inboundChars;
    next = {
      ...next,
      _meta: {
        ...(next._meta || {}),
        editorWriterShrinkGuard: true,
      },
    };
  }
  const dupFinal = detectDuplicateKillerIssues(getBlogFullText(next));

  if (resolveBriclogIndustryKey(input) === "furniture") {
    const beforeStrip = chars;
    next = stripFurnitureIndustryLeakFromPack(next, input);
    chars = countBlogBodyCharsWithSpaces(next);
    if (chars < beforeStrip * 0.9 && beforeStrip >= 120) {
      next = pack;
      chars = inboundChars;
    }
  }

  if (chars < inboundChars) {
    next = pack;
    chars = inboundChars;
  }

  return finishPass(dupFinal.ok);
}

/**
 * 반복 제거 + (필요 시) 작가 관점 분량 보강 — 송출 직전 SSOT
 */
export function applyEditorWriterDeliveryPass(pack, input = {}, ctx = {}) {
  if (!pack?.sections?.length) return pack;
  return applyEditorWriterLengthPass(pack, input, ctx);
}

function resolveInstaMinChars(input = {}) {
  const len = String(input.instaBodyLength || "medium").toLowerCase();
  if (len === "short") return 120;
  if (len === "long") return 260;
  return 180;
}

function resolvePlaceMinChars() {
  return PLACE_CHANNEL.totalChars?.min || 180;
}

function ensureInstaPublishHashtags(pack, input = {}) {
  const full = getChannelFullText(pack, "instagram");
  const existing = [...new Set((full.match(/#\S+/g) || []).map((t) => t.toLowerCase()))];
  if (existing.length >= 4) return pack;

  const brand = String(input.brandName || "").replace(/\s/g, "");
  const rc = regionCompact(input.region || "");
  const topic = String(input.topic || input.mainKeyword || "").split(/\s+/)[0];
  const industry = String(input.industry || "").replace(/\s/g, "");
  const more = [brand, rc, topic, industry, "동네맛집", "오늘의기록"]
    .map((t) => formatHashtag(String(t || "")))
    .filter((t) => t && !existing.includes(t.toLowerCase()));
  const tags = [...existing, ...more.map((t) => t.toLowerCase())].slice(0, 10);
  const hashtagLine = tags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");

  const bodyKey = pack.lineBreakBody ? "lineBreakBody" : "body";
  const base = String(pack[bodyKey] || pack.body || "")
    .replace(/\s*((?:#\S+\s*)+)$/, "")
    .trim();
  const nextBody = `${base}\n\n${hashtagLine}`.trim();

  return {
    ...pack,
    hashtags: tags.map((t) => t.replace(/^#/, "")),
    [bodyKey]: nextBody,
    body: bodyKey === "lineBreakBody" ? pack.body : nextBody,
    lineBreakBody: bodyKey === "lineBreakBody" ? nextBody : pack.lineBreakBody,
  };
}

/**
 * place · instagram — 반복 제거 후 채널 발행 구조·분량 보강 (블로그 editorWriter와 동일 축)
 * @param {object} pack
 * @param {"place"|"instagram"} channel
 * @param {object} input
 * @param {object} [ctx]
 */
export function applyChannelEditorWriterDeliveryPass(
  pack,
  channel = "place",
  input = {},
  ctx = {}
) {
  if (!pack || !isBriclogMissionEnforced()) return pack;
  if (channel !== "place" && channel !== "instagram") return pack;

  const stackCtx = { input, ...ctx };
  const inboundChars = getChannelFullText(pack, channel).replace(/\s/g, "").length;
  const minChars = channel === "place" ? resolvePlaceMinChars() : resolveInstaMinChars(input);

  let next = applyEditorDuplicateSweep(pack, stackCtx, channel);

  if (hasUsableResearchFacts(input) && inboundChars < minChars) {
    next = weaveResearchFactsIntoChannelPack(next, channel, input);
  }

  if (channel === "place") {
    if (!String(next.cta || "").trim()) {
      const brand = String(input.brandName || "").trim();
      next = {
        ...next,
        cta: brand
          ? `${brand} — 방문·예약은 플레이스에서 확인해 주세요`
          : "플레이스에서 자세히 확인해 주세요",
      };
    }
    if (!String(next.shortNotice || "").trim() && String(next.detailBody || "").trim()) {
      const lead = String(next.detailBody || "")
        .split(/\n+/)
        .map((l) => l.replace(/^·\s*/, "").trim())
        .find((l) => l.length >= 12);
      if (lead) {
        next = { ...next, shortNotice: lead.slice(0, 120), shortBody: lead.slice(0, 120) };
      }
    }
    const detail = String(next.detailBody || "").trim();
    if (detail) {
      const { text, injected } = ensureMinExperienceObservation(detail, input);
      if (injected) {
        next = {
          ...next,
          detailBody: text,
          _meta: {
            ...(next._meta || {}),
            placeExperienceObservation: true,
          },
        };
      }
    }
  } else {
    next = strengthenInstagramCaption(next, stackCtx);
    next = ensureInstaPublishHashtags(next, input);
  }

  const afterChars = getChannelFullText(next, channel).replace(/\s/g, "").length;
  const dupOk = next._meta?.editorDuplicateOk !== false;

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      channelEditorWriterPass: true,
      channelEditorWriterChannel: channel,
      channelEditorWriterChars: afterChars,
      channelEditorWriterMin: minChars,
      channelEditorWriterLengthMet: afterChars >= minChars,
      channelEditorWriterDupOk: dupOk,
    },
  };
}
