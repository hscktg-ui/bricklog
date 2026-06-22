/**
 * 검증된 LLM 블로그 → place·insta 빠른 파생 (로컬 스팸 파이프라인 우회)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { buildResearchFactLines } from "@/lib/content/researchGroundedHumanPack";
import {
  buildNorthStarInstagramPack,
  buildNorthStarPlacePack,
} from "@/lib/product/channelVisitNorthStar";
import { assessColumnVisitNorthStar } from "@/lib/product/columnVisitNorthStar";
import {
  isWriterFirstDeliveryEnabled,
  isWriterFirstDeliveryPack,
} from "@/lib/product/writerFirstDelivery";

function sentencesFromBlog(pack, limit = 4) {
  const full = getBlogFullText(pack);
  return splitKoreanSentences(full)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 16)
    .filter((s) => !/근처목마|기준이\s*달라|수월해요|로컬\s*매장/.test(s))
    .slice(0, limit);
}

function mergedFactLines(blogPack, input = {}) {
  const fromResearch = buildResearchFactLines(input, 6);
  const fromBlog = sentencesFromBlog(blogPack, 4);
  const seen = new Set();
  const out = [];
  for (const line of [...fromResearch, ...fromBlog]) {
    const key = line.slice(0, 14);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out.slice(0, 8);
}

export function canDeriveChannelFromVerifiedBlog(blogPack, input = {}) {
  if (!blogPack?.sections?.length || !isWriterFirstDeliveryEnabled()) return false;
  const llm =
    isWriterFirstDeliveryPack(blogPack, input) ||
    blogPack?._meta?.llmGenerated === true ||
    blogPack?._meta?.gpt55LlmPack === true;
  if (!llm) return false;
  const north = assessColumnVisitNorthStar(blogPack, input);
  return north.spam.ok && (blogPack.sections?.length || 0) >= 2;
}

export function derivePlaceFromVerifiedBlog(blogPack, input = {}) {
  const facts = mergedFactLines(blogPack, input);
  const pack = buildNorthStarPlacePack(input, facts);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      derivedFromVerifiedBlog: true,
      sourceChannel: "blog",
      channelNorthStarPack: true,
    },
  };
}

export function deriveInstagramFromVerifiedBlog(blogPack, input = {}, instaToneKey = "emotional") {
  const facts = mergedFactLines(blogPack, input);
  const pack = buildNorthStarInstagramPack(input, instaToneKey, facts);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      derivedFromVerifiedBlog: true,
      sourceChannel: "blog",
      channelNorthStarPack: true,
    },
  };
}

export function deriveChannelFromVerifiedBlog(
  channel,
  blogPack,
  input = {},
  instaToneKey = "emotional"
) {
  if (!canDeriveChannelFromVerifiedBlog(blogPack, input)) return null;
  if (channel === "place") return derivePlaceFromVerifiedBlog(blogPack, input);
  if (channel === "instagram") {
    return deriveInstagramFromVerifiedBlog(blogPack, input, instaToneKey);
  }
  return null;
}
