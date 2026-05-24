import { applyV2AxisResearch } from "@/lib/content/applyV2AxisResearch";
import { assertPostWriteDeliverable } from "@/lib/content/v2PipelineGate";
import { ensureChannelDelivery } from "@/lib/generation/ensureChannelDelivery";
import { withSignatureEnforcement } from "@/lib/content/channelPack";
import { blogExcerpt, buildBaseContentLabel } from "@/lib/contentPipeline";
import { buildChannelSourceBrief } from "@/lib/content/channelSource";

const CONTENT_KEYS = {
  place: "placeContent",
  instagram: "instagramContent",
  image: "imagePrompts",
};

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

  let pipelineInput = withSignatureEnforcement(
    {
      ...formValues,
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

  const outputGate = assertPostWriteDeliverable(pipelineInput, content);
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
    const merged = withSignatureEnforcement(
      { ...formValues, ...verifiedInput },
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
    const gate = assertPostWriteDeliverable(merged, content);
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
