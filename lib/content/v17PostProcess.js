/**
 * V17 WRITE 후처리 — 정보량 확장 + Duplicate Killer (반복 패딩 금지)
 */
import { applyV14PostWritePack } from "@/lib/content/v14PostProcess";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import { expandPackByInformation } from "@/lib/content/informationExpansionEngine";
import { enforceSmartPlaceOwnerNotice } from "@/lib/channel/smartPlaceNoticeGuard";
import { applyKnowledgeCoverageGate } from "@/lib/content/knowledgeCoverageGate";
import { applyBrandContentEngine } from "@/lib/content/brandContentEngine";
import { applyPerspectiveEngine } from "@/lib/content/perspectiveEngine";
import { applyChannelMarketerPack } from "@/lib/content/channelMarketerEngine";
import { applyEmojiEngine } from "@/lib/emoji/emojiEngine";
import { buildKnowledgeCoverageMap } from "@/lib/content/knowledgeCoverageEngine";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";
import { MASTER_ENGINE_V17_MULTI_AI_PIPELINE } from "@/lib/content/contentIntelligenceV17";
import { sanitizeBlogPackPlannerLeak } from "@/lib/content/sectionPlannerSanitize";
import { isSubstantiveSectionBody } from "@/lib/content/sectionWriterBodies";
import { isLengthPaddingForbidden, isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { applyHumanWriterHeadingGate } from "@/lib/content/humanWriterHeadingGate";
import { applyAntiSeoSpamGate } from "@/lib/content/antiSeoSpamGate";
import { applySignatureWritingGate } from "@/lib/content/signatureWritingGate";
import { applyHumanBeliefGate } from "@/lib/content/humanBeliefGate";
import { applyEditorialPackGate } from "@/lib/content/editorialPackGate";
import { applyNaverBlogChannelGate } from "@/lib/content/naverBlogChannelGate";
import { applyHaeyoConsistencyToPack } from "@/lib/content/haeyoConsistencyGate";
import { applyFurnitureExhibitionPackPolish, isFurnitureExhibitionContext } from "@/lib/product/furnitureExhibitionEngine";
import { dedupeMissionProsePack } from "@/lib/llm/missionProseFallback";
import {
  applyMissionProseGate,
  ensureMissionProseTierLength,
} from "@/lib/content/missionProseGate";
import { applyMagazineArcPolish } from "@/lib/content/columnMagazineArchetype";
import { applyHumanColumnPolish } from "@/lib/content/humanColumnPolishEngine";
import { applyHumanConversationalVoice, ensureHumanConversationalBookends } from "@/lib/content/humanConversationalVoice";
import { smartCompressBlogPack } from "@/lib/content/editorLengthControlEngine";
import { prepareBriclogPreWriteContext } from "@/lib/content/briclogPreWriteContext";
import { applyStructureVarietyGate } from "@/lib/content/structureVarietyGate";
import { collectNaverWriteIssues } from "@/lib/channel/naverBlogEngineRules";
import { sanitizeVerbatimTopicInPack } from "@/lib/content/informationUnitEngine";
import { getBlogFullText } from "@/utils/qualityCheck";

function isDeliveryRescuePack(pack) {
  const m = pack?._meta || {};
  return Boolean(
    m.deliveryRescue ||
    m.missionProseFallback ||
    m.editorialQualityStandard ||
    m.draftFallback
  );
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {string} channel
 */
export function applyV17PostWritePack(pack, ctx = {}, channel = "blog") {
  if (!pack) return pack;
  const input = ctx.input || ctx;
  if (channel === "blog" && isDeliveryRescuePack(pack)) {
    let next = sanitizeVerbatimTopicInPack(pack, input, channel);
    if (isBriclogMissionEnforced() && next?.sections?.length) {
      if (next._meta?.missionProseFallback) {
        next = applyNaverBlogChannelGate(next, { ...ctx, input });
        next = dedupeMissionProsePack(next);
        const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
        next = ensureMissionProseTierLength(next, { ...ctx, input });
        next = applyHumanColumnPolish(next, input);
        next = applyMagazineArcPolish(next, input);
        next = applyHumanConversationalVoice(next, input);
        next = dedupeMissionProsePack(next);
        if (countBlogBodyCharsWithSpaces(next) > tier.max) {
          next = smartCompressBlogPack(next, tier.max, { ...ctx, input }, input);
          next = dedupeMissionProsePack(next);
        }
        next = ensureHumanConversationalBookends(next, input);
      } else {
        next = applyNaverBlogChannelGate(next, { ...ctx, input });
        const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
        if (countBlogBodyCharsWithSpaces(next) < tier.min * 0.7) {
          next = ensureMissionProseTierLength(next, { ...ctx, input });
        }
      }
    }
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        v17Engine: true,
        deliveryRescue: true,
        v17DeliveryRescueLight: true,
        missionProseFallback: next._meta?.missionProseFallback || undefined,
      },
    };
  }
  if (channel === "blog" && pack._meta?.missionProseFallback) {
    let next = sanitizeVerbatimTopicInPack(pack, input, channel);
    if (isBriclogMissionEnforced() && next?.sections?.length) {
      next = applyNaverBlogChannelGate(next, { ...ctx, input });
      next = dedupeMissionProsePack(next);
      const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
      next = ensureMissionProseTierLength(next, { ...ctx, input });
      next = applyHumanColumnPolish(next, input);
      next = applyMagazineArcPolish(next, input);
      next = applyHumanConversationalVoice(next, input);
      next = dedupeMissionProsePack(next);
      if (countBlogBodyCharsWithSpaces(next) > tier.max) {
        next = smartCompressBlogPack(next, tier.max, { ...ctx, input }, input);
        next = dedupeMissionProsePack(next);
      }
      next = ensureHumanConversationalBookends(next, input);
    }
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        v17Engine: true,
        missionProseFallback: true,
        v17MissionProseLight: true,
      },
    };
  }

  let next = applyV14PostWritePack(pack, { ...ctx, input }, channel);
  next = applyDuplicateKiller(next, { ...ctx, input }, channel);
  if (channel === "blog") {
    next = applyHumanWriterHeadingGate(next, { ...ctx, input });
    next = applySignatureWritingGate(next, { ...ctx, input });
    next = applyMissionProseGate(next, { ...ctx, input });
    next = applyAntiSeoSpamGate(next, { ...ctx, input });
  }

  if (channel === "blog") {
    const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
    const chars = countBlogBodyCharsWithSpaces(next);
    if (chars < tier.min) {
      if (isBriclogMissionEnforced()) {
        next = ensureMissionProseTierLength(next, { ...ctx, input });
      } else if (!isLengthPaddingForbidden()) {
        next = expandPackByInformation(next, { ...ctx, input }, input, {
          minChars: tier.min,
          channel: "blog",
        });
      }
    }
  } else if (channel === "place") {
    const detailLen = String(next.detailBody || "").replace(/\s/g, "").length;
    if (detailLen < 140) {
      next = expandPackByInformation(next, { ...ctx, input }, input, {
        minChars: 200,
        channel: "place",
      });
    }
    next = enforceSmartPlaceOwnerNotice(next, input);
  } else if (channel === "instagram") {
    const bodyLen = String(next.lineBreakBody || next.body || "").replace(/\s/g, "").length;
    if (bodyLen < 120) {
      next = expandPackByInformation(next, { ...ctx, input }, input, {
        minChars: 180,
        channel: "instagram",
      });
    }
  }

  next = applyDuplicateKiller(next, { ...ctx, input }, channel);

  if (channel === "blog") {
    next = applyStructureVarietyGate(next, input);
  }

  if (channel === "blog" && next?.sections?.length) {
    if (!isDeliveryRescuePack(next)) {
      next = applyKnowledgeCoverageGate(next, { ...ctx, input }, channel);
      next = {
        ...next,
        sections: (next.sections || []).filter((s) =>
          isSubstantiveSectionBody(s.body)
        ),
      };
    }
    next = sanitizeBlogPackPlannerLeak(next);
    next = applyBrandContentEngine(next, { ...ctx, input }, input);
    next = applyPerspectiveEngine(next, { ...ctx, input }, input);
  } else if (channel === "place" || channel === "instagram") {
    next = applyChannelMarketerPack(next, channel, { ...ctx, input }, input);
  }

  next = applyEmojiEngine(next, channel, { ...ctx, input });

  if (channel === "blog" && isBriclogMissionEnforced() && next?.sections?.length) {
    next = sanitizeVerbatimTopicInPack(next, input, channel);
    next = applyHumanColumnPolish(next, input);
    next = applyMagazineArcPolish(next, input);
    next = applyHumanConversationalVoice(next, input);
    next = ensureHumanConversationalBookends(next, input);
    next = applyEditorialPackGate(next, { ...ctx, input });
    next = applyHumanWriterHeadingGate(next, { ...ctx, input });
    next = applySignatureWritingGate(next, { ...ctx, input });
    next = applyMissionProseGate(next, { ...ctx, input });
    next = applyHumanBeliefGate(next, { ...ctx, input });
    next = applyNaverBlogChannelGate(next, { ...ctx, input });
    if (isFurnitureExhibitionContext(input)) {
      next = applyFurnitureExhibitionPackPolish(next, input);
    }
    next = applyHaeyoConsistencyToPack(next);
    next = sanitizeVerbatimTopicInPack(next, input, channel);
    next = ensureMissionProseTierLength(next, { ...ctx, input });
  }

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      v17Engine: true,
      v17Stages: MASTER_ENGINE_V17_MULTI_AI_PIPELINE.map((s) => s.id),
      infoExpansionEngine: true,
      knowledgeCoverageEngine: true,
      brandContentEngine: true,
      coverageAreaCount: (input.knowledgeCoverage || buildKnowledgeCoverageMap(input)).coverageCount,
    },
  };
}

/** draft_fallback·템플릿 등 v17 미적용 pack에 Mission 후처리 1회 */
function repolishNaverIfNeeded(pack, pipelineInput) {
  const issues = collectNaverWriteIssues(
    getBlogFullText(pack),
    pipelineInput
  );
  if (
    !issues.includes("naver_avoid_phrase") &&
    !issues.includes("checklist_voice")
  ) {
    return pack;
  }
  const next = applyNaverBlogChannelGate(pack, {
    input: pipelineInput,
    ...pipelineInput,
  });
  return {
    ...next,
    _meta: {
      ...next._meta,
      v17Engine: true,
      naverChannelRepollish: true,
    },
  };
}

export function ensureV17MissionPolish(pack, input = {}, channel = "blog") {
  if (!pack?.sections?.length) return pack;
  if (!isBriclogMissionEnforced()) return pack;
  const pipelineInput = prepareBriclogPreWriteContext(input);
  let next = sanitizeVerbatimTopicInPack(pack, pipelineInput, channel);
  if (!pack._meta?.v17Engine) {
    next = applyV17PostWritePack(
      next,
      { input: pipelineInput, ...pipelineInput },
      channel
    );
  }
  if (channel === "blog") {
    next = ensureMissionProseTierLength(next, {
      input: pipelineInput,
      ...pipelineInput,
    });
  }
  return repolishNaverIfNeeded(next, pipelineInput);
}

/** LLM·fallback 공통 — 네이버 금지어·체크리스트 잔존 시 재보정 */
export function ensureNaverChannelClean(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;
  const pipelineInput = prepareBriclogPreWriteContext(input);
  return repolishNaverIfNeeded(pack, pipelineInput);
}
