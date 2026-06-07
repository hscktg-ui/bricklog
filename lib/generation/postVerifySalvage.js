/**
 * 작성 후 검수 실패 시 — 주제 반복 없이 분량·품질 보정 (고객 출력 전)
 */
import { applyBetaTestGuardCorrections } from "@/lib/content/betaTestGuardEngine";
import {
  applyEditorPreOutputCorrection,
} from "@/lib/content/editorPreOutputGate";
import { normalizeBlogLengthAndStructure } from "@/lib/content/blogLengthControl";
import { expandPackByInformation } from "@/lib/content/informationExpansionEngine";
import { enforceStrictBlogLength } from "@/lib/content/editorLengthControlEngine";
import { resolveBlogLengthTier } from "@/lib/constants";
import { prepareBriclogPreWriteContext } from "@/lib/content/briclogPreWriteContext";

import { assertPostWriteDeliverable } from "@/lib/content/v2PipelineGate";
import { sanitizeBlogPackMetaLayer } from "@/lib/content/metaLayerSeparation";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack";
import { resolveDeliveryFailureMessage } from "@/lib/product/customerOutput";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { applyEditorialPackGate } from "@/lib/content/editorialPackGate";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { isLengthPaddingForbidden, isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback";
import { sanitizeVerbatimTopicInPack } from "@/lib/content/informationUnitEngine";
import {
  assessCompletionReadiness,
  isPreviewWithholdFailure,
  countPreviewableSections,
} from "@/lib/product/completionStandard";
import {
  hasFilledBlogAxes,
  isSoftInformationGateFailure,
  stampCompleteCustomerDelivery,
} from "@/lib/product/deliverySoftPass";
import { shouldWithholdHumanWritingPack } from "@/lib/product/humanWritingDeliveryGate";
import { applyVisitReviewTopicPackGate } from "@/lib/content/visitReviewTopicGate";
import { isVisitReviewTopicInput } from "@/lib/content/topicFacetEngine";
import { applyHumanWriterHeadingGate } from "@/lib/content/humanWriterHeadingGate";
import { applyBrandContentEngine, humanizeSectionHeading, isMechanicalSectionHeading } from "@/lib/content/brandContentEngine";
import {
  applyDuplicateKiller,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import {
  buildResearchGroundedHumanPack,
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate";
import { normalizeHeadingKey } from "@/lib/content/knowledgeCoverageEngine";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";

function dedupeSectionHeadings(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length) return pack;
  const seen = new Map();
  return {
    ...pack,
    sections: pack.sections.map((sec, index) => {
      let heading = String(sec.heading || "").trim();
      if (isMechanicalSectionHeading(heading, ctx, input)) {
        heading = humanizeSectionHeading(heading, ctx, input, index);
      }
      const key = normalizeHeadingKey(heading);
      const count = seen.get(key) || 0;
      seen.set(key, count + 1);
      if (count > 0) {
        heading = humanizeSectionHeading(sec.heading, ctx, input, index + count + 1);
      }
      return { ...sec, heading };
    }),
  };
}

function mergeResearchGroundedWhenShort(pack, input, tier) {
  const before = countBlogBodyCharsWithSpaces(pack);
  if (before >= tier.min || !hasUsableResearchFacts(input)) return pack;

  const grounded = buildResearchGroundedHumanPack({
    ...input,
    blogLengthTier: input.blogLengthTier || tier.key || "medium",
  });
  const after = countBlogBodyCharsWithSpaces(grounded);
  if (after <= before) return pack;

  return {
    ...grounded,
    title: pack.title || grounded.title,
    representativeTitle: pack.representativeTitle || grounded.representativeTitle,
    titles: pack.titles?.length ? pack.titles : grounded.titles,
    _meta: {
      ...grounded._meta,
      ...pack._meta,
      salvageGroundedMerge: true,
      postVerifySalvaged: true,
    },
  };
}

/**
 * @param {object} pack
 * @param {object} pipelineInput
 */
export function salvageBlogPackForDelivery(pack, pipelineInput = {}) {
  if (!pack?.sections?.length) return pack;

  const preWrite = prepareBriclogPreWriteContext(pipelineInput);
  const enriched = {
    ...pipelineInput,
    knowledgeCoverage:
      pipelineInput.knowledgeCoverage || preWrite.knowledgeCoverage,
    informationUnits:
      pipelineInput.informationUnits || preWrite.informationUnits,
  };
  const ctx = { ...enriched, input: enriched };
  const tier = resolveBlogLengthTier(enriched.blogLengthTier || "medium");

  let next = pack;
  if (isBriclogMissionEnforced()) {
    next = sanitizeVerbatimTopicInPack(next, enriched, "blog");
  }

  next = applyBetaTestGuardCorrections(next, "blog", ctx, enriched);
  next = applyHumanWriterHeadingGate(next, { input: enriched });
  next = applyEditorPreOutputCorrection(next, enriched, enriched).pack;
  next = normalizeBlogLengthAndStructure(next, ctx, enriched).pack;

  let expanded = next;
  const salvageChars = countBlogBodyCharsWithSpaces(next);
  const severelyShort = salvageChars < tier.min;
  if (!isLengthPaddingForbidden() || severelyShort) {
    expanded = expandPackByInformation(next, ctx, enriched, {
      minChars: tier.min,
      channel: "blog",
      salvageForce: severelyShort,
    });
    if (!expanded?._meta?.blocked && !expanded?._meta?.coverageExpansionSkipped) {
      next = expanded;
    }
  }

  const strict = enforceStrictBlogLength(next, enriched, enriched, {
    maxAttempts: 6,
  });
  next = strict.pack;
  next = normalizeBlogLengthAndStructure(next, ctx, enriched).pack;
  next = sanitizeBlogPackMetaLayer(next);
  next = applyEditorialPackGate(next, ctx);
  next = weaveResearchFactsIntoPack(next, enriched);
  next = mergeResearchGroundedWhenShort(next, enriched, tier);
  next = applyDuplicateKiller(next, ctx, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = dedupeSectionHeadings(next, ctx, enriched);
  next = applyBrandContentEngine(next, ctx, enriched);
  next = applyHumanWriterHeadingGate(next, { input: enriched });
  next = applyHumanityFinishPass(next, ctx, "blog");
  next = ensureMissionProseTierLength(next, { input: enriched });

  if (
    isBriclogMissionEnforced() &&
    countPreviewableSections(next) < 2 &&
    (next.sections?.length || 0) < 3
  ) {
    let fallback = buildMissionProseFallbackPack(enriched);
    if (isVisitReviewTopicInput(enriched)) {
      fallback = applyVisitReviewTopicPackGate(fallback, enriched);
    }
    next = applyHumanityFinishPass(fallback, ctx, "blog");
    next = sanitizeVerbatimTopicInPack(next, enriched, "blog");
  }

  if (shouldWithholdHumanWritingPack(next, enriched)) {
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        postVerifySalvaged: true,
        blocked: true,
        humanWritingWithheld: true,
      },
    };
  }

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      postVerifySalvaged: true,
      blocked: false,
      knowledgeExpansionBlocked: undefined,
    },
  };
}

function hasDisplayableSections(pack) {
  return Boolean(pack?.sections?.length);
}

function prepareBlogForUiDelivery(blog, pipelineInput) {
  if (!blog?.sections?.length) return blog;
  const cv = scoreChecklistVoice(
    (blog.sections || []).map((s) => `${s.heading}\n${s.body}`).join("\n\n"),
    blog
  );
  if (!cv.ok) {
    return applyEditorialPackGate(blog, { input: pipelineInput, ...pipelineInput });
  }
  return blog;
}

function shouldWithholdForCompletion(pack, pipelineInput, gate) {
  if (hasDisplayableSections(pack) && countPreviewableSections(pack) >= 2) {
    return isPreviewWithholdFailure(gate, pack, pipelineInput);
  }
  return isPreviewWithholdFailure(gate, pack, pipelineInput);
}

/**
 * 검수 통과 여부와 관계없이 화면에 올릴 수 있는 편집본 결정
 * @returns {{ ok: boolean, pack?: object, preview?: boolean, userMessage?: string|null, gate?: object }}
 */
export function resolveBlogUiDelivery(blog, pipelineInput = {}, result = {}) {
  blog = prepareBlogForUiDelivery(blog, pipelineInput);
  if (!hasDisplayableSections(blog)) {
    return {
      ok: false,
      userMessage:
        result.userMessage ||
        "브랜드 · 지역 · 주제를 입력한 뒤 「조사 후 글 받기」를 눌러 주세요.",
    };
  }

  const serverVerified =
    !result.withheld &&
    (result.meta?.passOutput === true ||
      result.meta?.v2PipelineVerified ||
      blog._meta?.passOutput ||
      blog._meta?.writtenFromVerifiedResearch);

  let gate = serverVerified
    ? { ok: true, pack: blog }
    : assertPostWriteDeliverable(pipelineInput, blog);

  if (
    !gate.ok &&
    hasDisplayableSections(blog) &&
    hasFilledBlogAxes(pipelineInput) &&
    !shouldWithholdForCompletion(blog, pipelineInput, gate) &&
    !shouldWithholdHumanWritingPack(blog, pipelineInput, gate)
  ) {
    const stamped = stampCompleteCustomerDelivery(
      ensureBlogDisplayPack(blog, pipelineInput),
      pipelineInput,
      { failReasons: gate.reasons || gate.failReasons }
    );
    if (stamped) {
      return { ok: true, pack: stamped, preview: false, userMessage: null, gate };
    }
  }

  if (!gate.ok) {
    if (
      hasDisplayableSections(blog) &&
      hasFilledBlogAxes(pipelineInput) &&
      isSoftInformationGateFailure(gate) &&
      !shouldWithholdHumanWritingPack(blog, pipelineInput, gate)
    ) {
      const stamped = stampCompleteCustomerDelivery(
        ensureBlogDisplayPack(blog, pipelineInput),
        pipelineInput,
        { failReasons: gate.reasons || gate.failReasons }
      );
      if (stamped) {
        return { ok: true, pack: stamped, preview: false, userMessage: null, gate };
      }
    }

    const salvaged = salvageBlogPackForDelivery(blog, pipelineInput);
    gate = assertPostWriteDeliverable(pipelineInput, salvaged);
    if (gate.ok) {
      return {
        ok: true,
        pack: ensureBlogDisplayPack(gate.pack, pipelineInput),
        preview: false,
        gate,
      };
    }
    if (
      hasDisplayableSections(salvaged) &&
      !shouldWithholdHumanWritingPack(salvaged, pipelineInput, gate)
    ) {
      const stamped = stampCompleteCustomerDelivery(
        ensureBlogDisplayPack(salvaged, pipelineInput),
        pipelineInput,
        { failReasons: gate.reasons || gate.failReasons }
      );
      if (stamped) {
        return { ok: true, pack: stamped, preview: false, userMessage: null, gate };
      }
    }
    if (
      hasFilledBlogAxes(pipelineInput) &&
      hasDisplayableSections(blog) &&
      !shouldWithholdHumanWritingPack(blog, pipelineInput, gate)
    ) {
      const salvaged = salvageBlogPackForDelivery(blog, pipelineInput);
      const packForUi = ensureBlogDisplayPack(salvaged, pipelineInput);
      if (!shouldWithholdHumanWritingPack(packForUi, pipelineInput, gate)) {
        const stamped = stampCompleteCustomerDelivery(packForUi, pipelineInput, {
          uiDeliveryForced: true,
        });
        if (stamped) {
          return { ok: true, pack: stamped, preview: false, userMessage: null, gate };
        }
      }
    }
    return {
      ok: false,
      userMessage:
        result.userMessage ||
        "브랜드 · 지역 · 주제를 입력한 뒤 「조사 후 글 받기」를 눌러 주세요.",
      gate,
    };
  }

  return {
    ok: true,
    pack: ensureBlogDisplayPack(gate.pack, pipelineInput),
    preview: false,
    gate,
  };
}
