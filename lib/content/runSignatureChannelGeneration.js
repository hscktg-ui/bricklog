import { applyV2AxisResearch } from "@/lib/content/applyV2AxisResearch";
import { assertPostWriteDeliverable } from "@/lib/content/v2PipelineGate";
import { ensureChannelDelivery } from "@/lib/generation/ensureChannelDelivery";
import { ensurePublishableChannelPack } from "@/lib/llm/channelDeliveryFallback";
import { withSignatureEnforcement } from "@/lib/content/channelPack";
import { blogExcerpt, buildBaseContentLabel } from "@/lib/contentPipeline";
import { buildChannelSourceBrief } from "@/lib/content/channelSource";

const CONTENT_KEYS = {
  place: "placeContent",
  instagram: "instagramContent",
  image: "imagePrompts",
};

const SHARED_OPTION_KEYS = [
  "brandName",
  "brandType",
  "industry",
  "region",
  "topic",
  "mainKeyword",
  "subKeyword",
  "purpose",
  "tone",
  "contentObjective",
  "speechStyle",
  "contentPersona",
  "contentPersonaSubtype",
  "contentPerspective",
  "blogLengthTier",
];

function lockSharedOptions(primary = {}, secondary = {}) {
  const out = { ...secondary, ...primary };
  const locked = {};
  for (const key of SHARED_OPTION_KEYS) {
    const v = primary[key] ?? secondary[key];
    if (v !== undefined) {
      out[key] = v;
      locked[key] = v;
    }
  }
  out._sharedOptionLock = locked;
  return out;
}

/**
 * 클라이언트 — 블로그와 동일 시그니처 파이프라인으로 채널 생성
 */
export async function runSignatureChannelGeneration({
  channel,
  formValues,
  generateResearchAsync,
  setResearchResult,
  onStep,
  sourceBlog = null,
  sourceLabel = null,
  instaTone,
  imageOptions,
}) {
  const key = CONTENT_KEYS[channel];
  if (!key) {
    return { ok: false, userMessage: "지원하지 않는 채널입니다." };
  }

  const lockedForm = lockSharedOptions(formValues, formValues);
  let pipelineInput = withSignatureEnforcement(
    {
      ...lockedForm,
      instaTone,
      imageOptions,
      baseContentLabel: sourceLabel,
    },
    channel
  );

  if (sourceBlog) {
    pipelineInput.channelSourceBrief = buildChannelSourceBrief({
      sourceChannel: "blog",
      blogLike: sourceBlog,
      baseLabel: sourceLabel,
    });
    if (!pipelineInput.channelSourceBrief?.trim()) {
      pipelineInput.channelSourceBrief = `[블로그 기준]\n${blogExcerpt(sourceBlog, 1200)}`;
    }
    pipelineInput.sourceChannel = "blog";
  }

  const axis = await applyV2AxisResearch({
    pipelineInput,
    generateResearchAsync,
    setResearchResult,
    onStep,
  });

  if (!axis.ok) {
    return {
      ok: false,
      userMessage: axis.userMessage,
      soft: true,
    };
  }

  const result = await ensureChannelDelivery(channel, pipelineInput, {
    setPipelineStep: onStep,
    onRetry: () => onStep?.("다시 이어서 쓰는 중…"),
    sourceBlog,
  });

  if (result.ok === false && !result[key]) {
    return {
      ok: false,
      userMessage:
        result.userMessage ||
        "조사·검증·작성 단계를 완료하지 못했습니다.",
      soft: true,
    };
  }

  let content = result[key];
  if (!content) {
    return {
      ok: false,
      userMessage: "콘텐츠를 화면에 올리지 못했습니다.",
      soft: true,
    };
  }

  let outputGate = assertPostWriteDeliverable(pipelineInput, content);
  if (
    !outputGate.ok &&
    (outputGate.reasons || []).includes("outline_only_output")
  ) {
    content = ensurePublishableChannelPack(channel, content, pipelineInput, {
      sourceBlog,
      instaTone,
    });
    outputGate = assertPostWriteDeliverable(pipelineInput, content);
  }
  if (!outputGate.ok) {
    return {
      ok: false,
      userMessage:
        outputGate.userMessage ||
        "작성 후 검수 기준에 맞지 않아 화면에 올리지 않았습니다.",
      soft: true,
    };
  }

  content = outputGate.pack;

  if (channel === "place") {
    content._initialPlain = [content.title, content.shortNotice, content.detailBody]
      .filter(Boolean)
      .join("\n");
  } else if (channel === "instagram") {
    content._initialPlain = content.lineBreakBody || content.body || "";
  } else if (channel === "image") {
    const purpose = imageOptions?.purpose || "thumbnail";
    content = {
      ...content,
      engineStatus: "preparing",
      activePrompt:
        content.thumbnailPrompt ||
        content[purpose === "place" ? "placeImagePrompt" : "thumbnailPrompt"] ||
        "",
      _meta: {
        ...content._meta,
        generationMode: result.meta?.generationMode,
        signaturePipeline: true,
      },
    };
  }
  content._meta = {
    ...(content._meta || {}),
    sharedOptionLock: pipelineInput._sharedOptionLock || null,
    sourceChannel: pipelineInput.sourceChannel || content._meta?.sourceChannel || "blog",
  };

  return {
    ok: true,
    content,
    baseContentLabel:
      result.baseContentLabel ||
      sourceLabel ||
      buildBaseContentLabel(formValues, sourceBlog),
    meta: result.meta,
    researchStorage: axis.storage,
  };
}

/**
 * 블로그 생성 직후 — 이미 완료된 조사·검증 brief 재사용
 */
export async function runDerivedSignatureChannel(opts) {
  const {
    channel,
    formValues,
    pipelineInput: verifiedInput,
    sourceBlog,
    sourceLabel,
    generateResearchAsync,
    setResearchResult,
    onStep,
    instaTone,
    imageOptions,
  } = opts;

  if (verifiedInput?.v2PreWriteVerified && verifiedInput?.v2ResearchReady) {
    const mergedLocked = lockSharedOptions(verifiedInput, formValues);
    const merged = withSignatureEnforcement(
      mergedLocked,
      channel
    );
    if (sourceBlog) {
      merged.channelSourceBrief = buildChannelSourceBrief({
        sourceChannel: "blog",
        blogLike: sourceBlog,
        baseLabel: sourceLabel,
      });
      if (!merged.channelSourceBrief?.trim()) {
        merged.channelSourceBrief = `[블로그 기준]\n${blogExcerpt(sourceBlog, 1200)}`;
      }
    }
    const result = await ensureChannelDelivery(channel, merged, {
      setPipelineStep: onStep,
      sourceBlog,
    });
    const key =
      channel === "place"
        ? "placeContent"
        : channel === "instagram"
          ? "instagramContent"
          : "imagePrompts";
    if (result.ok === false && !result[key]) {
      return {
        ok: false,
        userMessage: result.userMessage,
        soft: true,
      };
    }
    let content = result[key];
    if (!content) {
      return { ok: false, userMessage: "채널 콘텐츠를 만들지 못했습니다.", soft: true };
    }
    let gate = assertPostWriteDeliverable(merged, content);
    if (!gate.ok && (gate.reasons || []).includes("outline_only_output")) {
      content = ensurePublishableChannelPack(channel, content, merged, {
        sourceBlog,
        instaTone,
      });
      gate = assertPostWriteDeliverable(merged, content);
    }
    if (!gate.ok) {
      return { ok: false, userMessage: gate.userMessage, soft: true };
    }
    content = gate.pack;
    if (channel === "place") {
      content._initialPlain = [content.title, content.shortNotice, content.detailBody]
        .filter(Boolean)
        .join("\n");
    } else if (channel === "instagram") {
      content._initialPlain = content.lineBreakBody || content.body || "";
    } else if (channel === "image") {
      content = {
        ...content,
        engineStatus: "preparing",
        activePrompt: content.thumbnailPrompt || content.activePrompt || "",
      };
    }
    content._meta = {
      ...(content._meta || {}),
      sharedOptionLock: merged._sharedOptionLock || null,
      sourceChannel: merged.sourceChannel || content._meta?.sourceChannel || "blog",
    };
    return {
      ok: true,
      content,
      baseContentLabel: sourceLabel || result.baseContentLabel,
      meta: result.meta,
    };
  }

  return runSignatureChannelGeneration(opts);
}

export { blogExcerpt };
