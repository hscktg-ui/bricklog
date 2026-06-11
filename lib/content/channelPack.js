import { getBlogFullText } from "@/utils/qualityCheck";
import { isPublishableChannelPack } from "@/lib/content/outlinePackGuard";

/** 채널별 본문 텍스트 (V2/V3 축·품질 검수) */
export function getChannelFullText(pack, channel = "blog") {
  if (!pack) return "";
  if (channel === "blog") return getBlogFullText(pack);
  if (channel === "place") {
    return [pack.title, pack.shortNotice, pack.detailBody]
      .filter(Boolean)
      .join("\n");
  }
  if (channel === "instagram") {
    return [
      pack.hook,
      pack.body,
      pack.lineBreakBody,
      pack.ending,
      (pack.hashtags || []).join(" "),
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (channel === "image") {
    return [
      pack.thumbnailPrompt,
      pack.placeImagePrompt,
      pack.instagramCardPrompt,
      pack.bannerPrompt,
      pack.activePrompt,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return getBlogFullText(pack);
}

export function isChannelPackDeliverable(channel, pack) {
  if (!pack || typeof pack !== "object") return false;
  if (channel === "blog") {
    return Boolean(pack.sections?.length) && isPublishableChannelPack("blog", pack);
  }
  if (channel === "place") {
    const body = [pack.shortNotice, pack.detailBody].join("").replace(/\s/g, "");
    return (
      Boolean(String(pack.title || "").trim() && body.length >= 40) &&
      isPublishableChannelPack("place", pack)
    );
  }
  if (channel === "instagram") {
    const body = String(pack.body || pack.lineBreakBody || "").replace(/\s/g, "");
    return body.length >= 30 && isPublishableChannelPack("instagram", pack);
  }
  if (channel === "image") {
    return isPublishableChannelPack("image", pack);
  }
  return false;
}

export function stampSignatureChannelMeta(pack, channel, extra = {}) {
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      contentChannel: channel,
      generationMode: pack._meta?.generationMode || `llm_gpt55_${channel}`,
      signaturePipeline: "v2_v3",
      ...extra,
    },
  };
}

/** API·클라이언트 공통 — 브랜드 시그니처 게이트 기본값 */
export function withSignatureEnforcement(input = {}, channel = "blog") {
  return {
    ...input,
    contentChannel: channel,
    v2AxisRequired: input.v2AxisRequired !== false,
    v2PipelineEnforced: true,
    v3EngineEnforced: true,
    betaTestGuardEnforced: input.betaTestGuardEnforced !== false,
  };
}
