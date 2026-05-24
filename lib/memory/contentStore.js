import { extractBlogPlainText } from "@/lib/duplicate/contentSimilarity";
import { formatBlogFullCopy } from "@/utils/copyFormatter";
import { serializeContent } from "@/lib/contentFormat";

export function packTitle(channel, content) {
  if (!content) return "";
  if (channel === "blog") {
    return (
      content.representativeTitle ||
      content.title ||
      content.titles?.[0] ||
      "블로그"
    );
  }
  if (channel === "place") return content.title || "플레이스";
  if (channel === "instagram") return content.hook || "인스타그램";
  if (channel === "image") return "이미지 카피";
  return "";
}

export function packFullContent(channel, content) {
  if (!content) return "";
  if (channel === "blog") {
    return formatBlogFullCopy(content) || extractBlogPlainText(content);
  }
  if (channel === "place") {
    return [content.title, content.shortNotice, content.detailBody, content.body]
      .filter(Boolean)
      .join("\n\n");
  }
  if (channel === "instagram") {
    return content.lineBreakBody || content.body || "";
  }
  if (channel === "image") {
    const s = serializeContent(content);
    return (
      content.activePrompt ||
      content.thumbnailPrompt ||
      (typeof s === "string" ? s : JSON.stringify(s))
    );
  }
  return typeof content === "string" ? content : serializeContent(content);
}

export function packHashtags(channel, content) {
  if (!content?.hashtags) return "";
  if (Array.isArray(content.hashtags)) return content.hashtags.join(" ");
  return String(content.hashtags);
}

export function channelPackFromPipeline(channel, content, meta = {}) {
  const promptInput = {
    ...(meta.promptInput || {}),
    writing_tone:
      meta.writingTone ||
      meta.promptInput?.writing_tone ||
      meta.promptInput?.speechStyle ||
      "",
    skill_level:
      meta.skillLevel ||
      meta.promptInput?.skill_level ||
      meta.promptInput?.proficiency ||
      "",
    rewrite_count:
      meta.rewriteCount ??
      meta.promptInput?.rewrite_count ??
      content?._meta?.rewriteCount ??
      null,
    fail_reasons:
      meta.failReasons ||
      meta.promptInput?.fail_reasons ||
      content?._meta?.failReasons ||
      [],
    quality_score:
      meta.qualityScore ??
      meta.promptInput?.quality_score ??
      content?._meta?.qualityScore?.total ??
      content?._meta?.coreQuality?.total ??
      null,
  };
  return {
    channel,
    title: packTitle(channel, content),
    fullContent: packFullContent(channel, content),
    hashtags: packHashtags(channel, content),
    persona: meta.persona || meta.v4Speaker || "",
    emotionTone: meta.emotionTone || meta.emotionTemperature || "",
    promptInput,
    qualityScore:
      meta.qualityScore ??
      content?._meta?.qualityScore?.total ??
      content?._meta?.coreQuality?.total ??
      null,
  };
}
