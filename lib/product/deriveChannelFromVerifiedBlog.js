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
  assessChannelVisitNorthStar,
} from "@/lib/product/channelVisitNorthStar";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
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
  if (!blogPack?.sections?.length) return false;
  if (
    input.batchLocalFinish &&
    (blogPack.sections?.length || 0) >= 3 &&
    hasUsableResearchFacts(input)
  ) {
    return true;
  }
  const llm =
    isWriterFirstDeliveryPack(blogPack, input) ||
    blogPack?._meta?.llmGenerated === true ||
    blogPack?._meta?.gpt55LlmPack === true ||
    blogPack?._meta?.generationMode === "columnist_sovereign" ||
    blogPack?._meta?.columnistSovereignLlm === true ||
    blogPack?._meta?.batchVerifiedBlog === true;
  if (!llm) return false;
  if (!isWriterFirstDeliveryEnabled()) {
    return (blogPack.sections?.length || 0) >= 2;
  }
  const north = assessColumnVisitNorthStar(blogPack, input);
  if (north.spam.ok && (blogPack.sections?.length || 0) >= 2) return true;
  return blogPack?._meta?.batchVerifiedBlog === true && (blogPack.sections?.length || 0) >= 3;
}

/** 배치·로컬 — north-star 파생 소스로 블로그 표시 */
export function stampBatchBlogAsChannelSource(blogPack, input = {}) {
  if (!blogPack?.sections?.length) return blogPack;
  return {
    ...blogPack,
    _meta: {
      ...(blogPack._meta || {}),
      llmGenerated: true,
      batchVerifiedBlog: true,
      publishReady: blogPack._meta?.publishReady !== false,
    },
  };
}

function stampNorthStarChannelMeta(pack, channel, input = {}) {
  const north = assessChannelVisitNorthStar(pack, channel, input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      channelVisitNorthStar: north,
      channelVisitNorthStarOk: north.publishOk,
    },
  };
}

export function derivePlaceFromVerifiedBlog(blogPack, input = {}) {
  const facts = mergedFactLines(blogPack, input);
  const pack = buildNorthStarPlacePack(input, facts);
  return stampNorthStarChannelMeta(
    {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        derivedFromVerifiedBlog: true,
        sourceChannel: "blog",
        channelNorthStarPack: true,
      },
    },
    "place",
    input
  );
}

export function deriveInstagramFromVerifiedBlog(blogPack, input = {}, instaToneKey = "emotional") {
  const facts = mergedFactLines(blogPack, input);
  const pack = buildNorthStarInstagramPack(input, instaToneKey, facts);
  return stampNorthStarChannelMeta(
    {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        derivedFromVerifiedBlog: true,
        sourceChannel: "blog",
        channelNorthStarPack: true,
      },
    },
    "instagram",
    input
  );
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
