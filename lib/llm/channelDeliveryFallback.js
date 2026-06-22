/**
 * 플레이스·인스타 — LLM/구성안 실패 시에도 발행 가능한 본문 폴백
 */
import { createPromptContext } from "@/utils/promptBuilder";
import { enrichMinimalBlogInput } from "@/lib/llm/blogDeliveryFallback";
import {
  normalizePipelineInput,
  runPlacePipeline,
  runInstagramPipeline,
} from "@/lib/contentPipeline";
import {
  runPlaceStandalone,
  runInstagramStandalone,
} from "@/lib/content/channelSource";
import {
  isPublishableChannelPack,
  rewriteOutlineChannelPack,
} from "@/lib/content/outlinePackGuard";
import { stripMetaLayerTerms } from "@/lib/content/metaLayerSeparation";
import {
  buildResearchGroundedInstagramPack,
  buildResearchGroundedPlacePack,
  hasUsableResearchFacts,
  upgradeChannelPackWithResearch,
} from "@/lib/content/researchGroundedHumanPack";
import {
  deriveChannelFromVerifiedBlog,
} from "@/lib/product/deriveChannelFromVerifiedBlog";
import {
  buildNorthStarInstagramPack,
  buildNorthStarPlacePack,
} from "@/lib/product/channelVisitNorthStar";

function markChannelDraft(pack, channel, source, failures = []) {
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      draftFallback: true,
      draftFallbackSource: source,
      softPass: true,
      passOutput: false,
      generationMode: source,
      contentChannel: channel,
      failReasons: failures,
    },
  };
}

function buildProsePlacePack(input = {}) {
  return buildNorthStarPlacePack(input);
}

function buildProseInstagramPack(input = {}, instaToneKey = "emotional") {
  return buildNorthStarInstagramPack(input, instaToneKey);
}

/**
 * @returns {{ pack: object, source: string }}
 */
export function buildDeliverableChannelFallback(
  channel,
  {
    input = {},
    sourceBlog = null,
    bestPack = null,
    instaTone = "emotional",
    failures = [],
  } = {}
) {
  if (channel === "image") {
    const ctx = createPromptContext(enrichMinimalBlogInput(input));
    return {
      pack: markChannelDraft(
        {
          thumbnailPrompt: `Professional photo of ${ctx.brandName || "local brand"} in ${ctx.region || "Korea"}, ${ctx.topic || "product"}, clean lighting, no text`,
          placeImagePrompt: "",
          instagramCardPrompt: "",
          bannerPrompt: "",
          activePrompt: "",
        },
        channel,
        "image_minimal",
        failures
      ),
      source: "image_minimal",
    };
  }

  const enriched = enrichMinimalBlogInput(input);

  if (
    bestPack &&
    isPublishableChannelPack(channel, bestPack)
  ) {
    const { pack, source } = upgradeChannelPackWithResearch(
      channel,
      bestPack,
      enriched,
      "llm_draft"
    );
    return {
      pack: markChannelDraft(pack, channel, source, failures),
      source,
    };
  }
  const form = normalizePipelineInput(enriched);

  if (channel === "place") {
    let pack = null;
    if (sourceBlog?.sections?.length) {
      const derived = deriveChannelFromVerifiedBlog("place", sourceBlog, enriched);
      if (derived && isPublishableChannelPack("place", derived)) {
        pack = derived;
      }
    }
    if (!pack && hasUsableResearchFacts(enriched) && !sourceBlog?.sections?.length) {
      const researchFirst = buildResearchGroundedPlacePack(enriched);
      if (isPublishableChannelPack("place", researchFirst)) {
        pack = researchFirst;
      }
    }
    if (!pack && sourceBlog?.sections?.length) {
      try {
        pack = runPlacePipeline(form, sourceBlog, enriched.baseContentLabel);
      } catch {
        pack = null;
      }
    }
    if (!pack || !isPublishableChannelPack("place", pack)) {
      try {
        pack = runPlaceStandalone(form);
      } catch {
        pack = null;
      }
    }
    if (!pack || !isPublishableChannelPack("place", pack)) {
      if (hasUsableResearchFacts(enriched)) {
        pack = buildResearchGroundedPlacePack(enriched);
      } else {
        pack = buildProsePlacePack(enriched);
      }
    }
    if (!isPublishableChannelPack("place", pack)) {
      pack = rewriteOutlineChannelPack("place", pack, enriched);
    }
    if (!isPublishableChannelPack("place", pack)) {
      pack = hasUsableResearchFacts(enriched)
        ? buildResearchGroundedPlacePack(enriched)
        : buildProsePlacePack(enriched);
    }
    const placeSource = pack?._meta?.researchGroundedChannelPack
      ? "research_grounded_place"
      : "place_prose_fallback";
    const { pack: finalPlace, source: finalPlaceSource } =
      upgradeChannelPackWithResearch("place", pack, enriched, placeSource);
    return {
      pack: markChannelDraft(finalPlace, "place", finalPlaceSource, failures),
      source: finalPlaceSource,
    };
  }

  if (channel === "instagram") {
    const toneKey = instaTone || enriched.instaTone || "emotional";
    let pack = null;
    if (sourceBlog?.sections?.length) {
      const derived = deriveChannelFromVerifiedBlog("instagram", sourceBlog, enriched, toneKey);
      if (derived && isPublishableChannelPack("instagram", derived)) {
        pack = derived;
      }
    }
    if (!pack && hasUsableResearchFacts(enriched) && !sourceBlog?.sections?.length) {
      const researchFirst = buildResearchGroundedInstagramPack(enriched, toneKey);
      if (isPublishableChannelPack("instagram", researchFirst)) {
        pack = researchFirst;
      }
    }
    if (!pack && sourceBlog?.sections?.length) {
      try {
        pack = runInstagramPipeline(
          form,
          sourceBlog,
          toneKey,
          enriched.baseContentLabel
        );
      } catch {
        pack = null;
      }
    }
    if (!pack || !isPublishableChannelPack("instagram", pack)) {
      try {
        pack = runInstagramStandalone(form, toneKey);
      } catch {
        pack = null;
      }
    }
    if (!pack || !isPublishableChannelPack("instagram", pack)) {
      pack = hasUsableResearchFacts(enriched)
        ? buildResearchGroundedInstagramPack(enriched, toneKey)
        : buildProseInstagramPack(enriched, toneKey);
    }
    if (!isPublishableChannelPack("instagram", pack)) {
      pack = rewriteOutlineChannelPack("instagram", pack, enriched);
    }
    if (!isPublishableChannelPack("instagram", pack)) {
      pack = hasUsableResearchFacts(enriched)
        ? buildResearchGroundedInstagramPack(enriched, toneKey)
        : buildProseInstagramPack(enriched, toneKey);
    }
    const instaSource = pack?._meta?.researchGroundedChannelPack
      ? "research_grounded_instagram"
      : "instagram_prose_fallback";
    const { pack: finalInsta, source: finalInstaSource } =
      upgradeChannelPackWithResearch("instagram", pack, enriched, instaSource);
    return {
      pack: markChannelDraft(finalInsta, "instagram", finalInstaSource, failures),
      source: finalInstaSource,
    };
  }

  return { pack: null, source: "unsupported" };
}

export function ensurePublishableChannelPack(channel, pack, input = {}, opts = {}) {
  if (!pack) {
    const { pack: fallback } = buildDeliverableChannelFallback(channel, {
      input,
      sourceBlog: opts.sourceBlog,
      instaTone: opts.instaTone,
      failures: ["empty_pack"],
    });
    return fallback;
  }
  if (isPublishableChannelPack(channel, pack)) return pack;
  let next = rewriteOutlineChannelPack(channel, pack, input);
  if (isPublishableChannelPack(channel, next)) return next;
  const { pack: fallback } = buildDeliverableChannelFallback(channel, {
    input,
    sourceBlog: opts.sourceBlog,
    bestPack: pack,
    instaTone: opts.instaTone,
    failures: ["outline_only_output"],
  });
  return fallback || next;
}
