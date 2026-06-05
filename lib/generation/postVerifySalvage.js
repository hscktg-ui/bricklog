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
  SOFT_PREVIEW_HINT,
} from "@/lib/product/deliverySoftPass";

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
  next = applyEditorPreOutputCorrection(next, enriched, enriched).pack;
  next = normalizeBlogLengthAndStructure(next, ctx, enriched).pack;

  let expanded = next;
  if (!isLengthPaddingForbidden()) {
    expanded = expandPackByInformation(next, ctx, enriched, {
      minChars: tier.min,
      channel: "blog",
    });
    if (!expanded?._meta?.blocked) {
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
  next = applyHumanityFinishPass(next, ctx, "blog");

  if (
    isBriclogMissionEnforced() &&
    countPreviewableSections(next) < 2 &&
    (next.sections?.length || 0) < 3
  ) {
    next = applyHumanityFinishPass(
      buildMissionProseFallbackPack(enriched),
      ctx,
      "blog"
    );
    next = sanitizeVerbatimTopicInPack(next, enriched, "blog");
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
    isSoftInformationGateFailure(gate) &&
    !shouldWithholdForCompletion(blog, pipelineInput, gate)
  ) {
    const readiness = assessCompletionReadiness(blog, pipelineInput, gate);
    const previewMessage = readiness.displayReady ? undefined : SOFT_PREVIEW_HINT;
    return {
      ok: true,
      pack: {
        ...ensureBlogDisplayPack(blog, pipelineInput),
        _meta: {
          ...(blog._meta || {}),
          deliveryPreview: !readiness.displayReady,
          deliveryPreviewMessage: previewMessage,
          passOutput: readiness.displayReady,
          softPass: !readiness.displayReady,
          completeDraft: readiness.completeDraft,
          displayReady: readiness.displayReady,
        },
      },
      preview: !readiness.displayReady,
      userMessage: previewMessage || null,
      gate,
    };
  }

  if (!gate.ok) {
    if (
      isBriclogMissionEnforced() &&
      hasDisplayableSections(blog) &&
      hasFilledBlogAxes(pipelineInput) &&
      isSoftInformationGateFailure(gate)
    ) {
      const readiness = assessCompletionReadiness(blog, pipelineInput, gate);
      return {
        ok: true,
        pack: {
          ...ensureBlogDisplayPack(blog, pipelineInput),
          _meta: {
            ...(blog._meta || {}),
            deliveryPreview: true,
            deliveryPreviewMessage: SOFT_PREVIEW_HINT,
            passOutput: false,
            softPass: true,
            displayReady: readiness.displayReady,
            missionSoftInfoPreview: true,
          },
        },
        preview: true,
        userMessage: null,
        gate,
      };
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
    if (hasDisplayableSections(salvaged)) {
      if (shouldWithholdForCompletion(salvaged, pipelineInput, gate)) {
        return {
          ok: false,
          userMessage:
            resolveDeliveryFailureMessage(gate) ||
            "아직 올리지 않았어요. 「다시 받기」를 눌러 주세요.",
          gate,
        };
      }
      const readiness = assessCompletionReadiness(salvaged, pipelineInput, gate);
      const previewMessage = readiness.displayReady
        ? undefined
        : SOFT_PREVIEW_HINT;
      const previewPack = {
        ...ensureBlogDisplayPack(salvaged, pipelineInput),
        _meta: {
          ...(salvaged._meta || {}),
          deliveryPreview: !readiness.displayReady,
          deliveryPreviewMessage: previewMessage,
          passOutput: readiness.displayReady,
          softPass: !readiness.displayReady,
          completeDraft: readiness.completeDraft,
          displayReady: readiness.displayReady,
        },
      };
      return {
        ok: true,
        pack: previewPack,
        preview: !readiness.displayReady,
        userMessage: previewMessage || null,
        gate,
      };
    }
    if (hasDisplayableSections(blog)) {
      if (shouldWithholdForCompletion(blog, pipelineInput, gate)) {
        return {
          ok: false,
          userMessage:
            resolveDeliveryFailureMessage(gate) ||
            "아직 올리지 않았어요. 「다시 받기」를 눌러 주세요.",
          gate,
        };
      }
      const readiness = assessCompletionReadiness(blog, pipelineInput, gate);
      const previewMessage = readiness.displayReady
        ? undefined
        : SOFT_PREVIEW_HINT;
      return {
        ok: true,
        pack: {
          ...ensureBlogDisplayPack(blog, pipelineInput),
          _meta: {
            ...(blog._meta || {}),
            deliveryPreview: !readiness.displayReady,
            deliveryPreviewMessage: previewMessage,
            passOutput: readiness.displayReady,
            softPass: !readiness.displayReady,
            completeDraft: readiness.completeDraft,
            displayReady: readiness.displayReady,
          },
        },
        preview: !readiness.displayReady,
        userMessage: previewMessage || null,
        gate,
      };
    }
    if (hasFilledBlogAxes(pipelineInput) && hasDisplayableSections(blog)) {
      const salvaged = salvageBlogPackForDelivery(blog, pipelineInput);
      const packForUi = ensureBlogDisplayPack(salvaged, pipelineInput);
      return {
        ok: true,
        pack: {
          ...packForUi,
          _meta: {
            ...(packForUi._meta || {}),
            deliveryPreview: true,
            deliveryPreviewMessage: SOFT_PREVIEW_HINT,
            passOutput: false,
            softPass: true,
            displayReady: false,
            uiDeliveryForced: true,
          },
        },
        preview: true,
        userMessage: SOFT_PREVIEW_HINT,
        gate,
      };
    }
    return {
      ok: false,
      userMessage:
        resolveDeliveryFailureMessage(gate) ||
        "아직 올리지 않았어요. 입력을 확인한 뒤 「다시 받기」를 눌러 주세요.",
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
