/**
 * /api/content/channel 공통 — 블로그 파생 fast-pass + LLM 오케스트레이터
 */
import {
  generateChannelWithLLMFirst,
  blockUnverifiedChannelApiResponse,
} from "@/lib/llm/channelOrchestrator";
import { deliverDerivedChannelFromBlog } from "@/lib/generation/ensureChannelDelivery";

const CONTENT_KEYS = {
  place: "placeContent",
  instagram: "instagramContent",
  image: "imagePrompts",
};

/** @param {object} input API body */
export function resolveChannelSourceBlog(input = {}) {
  return (
    input._sourceBlogPack ||
    input.blogContent ||
    input.sourceBlog ||
    null
  );
}

function isBlogDerivedChannelRequest(channel, input = {}, sourceBlog = null) {
  if (!sourceBlog?.sections?.length) return false;
  if (channel !== "place" && channel !== "instagram") return false;
  const src = String(input.sourceChannel || "").toLowerCase();
  return src === "blog" || Boolean(input.blogContent || input._sourceBlogPack);
}

/**
 * @param {"place"|"instagram"|"image"} channel
 * @param {object} input prepared API input (contentChannel stamped)
 */
export async function runChannelApiGeneration(channel, input = {}) {
  const normalized = {
    ...input,
    channel,
    contentChannel: channel,
  };
  const sourceBlog = resolveChannelSourceBlog(normalized);

  if (isBlogDerivedChannelRequest(channel, normalized, sourceBlog)) {
    const derived = deliverDerivedChannelFromBlog(
      channel,
      {
        ...normalized,
        sourceChannel: "blog",
        _sourceBlogPack: sourceBlog,
      },
      sourceBlog,
      {}
    );
    const key = CONTENT_KEYS[channel];
    if (derived?.ok !== false && derived?.[key] && !derived.withheld) {
      return {
        ...derived,
        meta: {
          ...(derived.meta || {}),
          channelApiPath: "verified_blog_derive",
          channelNorthStarFastPass: Boolean(
            derived[key]?._meta?.channelNorthStarFastPass
          ),
        },
      };
    }
    normalized._sourceBlogPack = sourceBlog;
    normalized.sourceChannel = "blog";
  }

  const raw = await generateChannelWithLLMFirst(channel, normalized);
  return blockUnverifiedChannelApiResponse(channel, raw, normalized);
}
