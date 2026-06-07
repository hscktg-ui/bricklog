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
} from "@/lib/content/researchGroundedHumanPack";

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
  const brand = String(input.brandName || "매장").trim();
  const region = String(input.region || "").trim();
  const topicRaw =
    String(
      input.placeHeadline ||
        input.topic ||
        input.mainKeyword ||
        "공지"
    ).trim();
  const topic = topicRaw.split(/[,，]/)[0]?.trim() || topicRaw;
  const period = String(input.placePeriod || "").trim();
  const offer = String(input.placeOffer || "").trim();
  const facts = String(
    input.placeKeyFacts || input.placeDetailHint || ""
  ).trim();

  const title = stripMetaLayerTerms(
    [region, brand, topic].filter(Boolean).join(" ").slice(0, 44) ||
      `${brand} ${topic} 안내`
  );
  const shortNotice = stripMetaLayerTerms(
    [period, offer || topic].filter(Boolean).join(" · ").slice(0, 120) ||
      `${brand} ${topic} 소식`
  );
  const detailParts = [
    region
      ? `${region} ${brand}에서 ${topic} 관련 안내드립니다.`
      : `${brand}에서 ${topic} 관련 안내드립니다.`,
    period ? `일정: ${period}` : null,
    offer ? `혜택·구성: ${offer}` : null,
    facts ||
      `${brand} 매장에서 ${topic}를 직접 확인하실 수 있습니다. 방문 전 영업 시간·주차·예약 방법을 함께 확인해 주세요.`,
    `${brand} ${topic}는 매장에서 체험·상담 후 비교하시면 선택이 수월합니다. 문의·예약이 가능하면 사전에 일정을 잡아 주세요.`,
  ].filter(Boolean);

  let detailBody = stripMetaLayerTerms(detailParts.join("\n\n"));
  while (detailBody.replace(/\s/g, "").length < 150) {
    detailBody = `${detailBody}\n\n${stripMetaLayerTerms(
      `${brand}${region ? ` ${region}` : ""} 기준으로 ${topic} 행사·프로모션 조건을 매장 안내에 맞춰 확인해 주세요.`
    )}`.trim();
  }

  return {
    title,
    shortNotice,
    detailBody: detailBody.slice(0, 520),
    shortBody: shortNotice,
    body: [shortNotice, detailBody].filter(Boolean).join("\n\n"),
    tags: [region, brand, topic]
      .filter(Boolean)
      .slice(0, 5)
      .map((t) => `#${String(t).replace(/\s+/g, "")}`),
  };
}

function buildProseInstagramPack(input = {}, instaToneKey = "emotional") {
  const brand = String(input.brandName || "브랜드").trim();
  const region = String(input.region || "").trim();
  const topicRaw =
    String(input.topic || input.mainKeyword || "이야기").trim();
  const topic = topicRaw.split(/[,，]/)[0]?.trim() || topicRaw;

  const hook = stripMetaLayerTerms(
    `${region ? `${region} ` : ""}${topic} — ${brand}`.slice(0, 56)
  );
  const lines = [
    region
      ? `${region}에서 ${topic} 찾는 분들, ${brand} 매장 소식 전해요.`
      : `${topic} 고민 중이면 ${brand} 매장에서 직접 비교해 보세요.`,
    `${brand} ${topic} 체험·행사·할인 조건을 한곳에서 확인할 수 있어요.`,
    `방문·예약·상담 가능 여부는 매장 안내 기준으로 확인해 주세요.`,
    instaToneKey === "informative"
      ? `선택 포인트만 짧게 정리했어요. 저장해 두고 방문 전에 다시 보면 편해요.`
      : `마음에 드는 조건이 있으면 매장에서 바로 체험해 보세요.`,
  ].map(stripMetaLayerTerms);

  const body = lines.join("\n\n");
  const ending = stripMetaLayerTerms(
    `${brand}${region ? ` · ${region}` : ""} — ${topic}`
  );
  const hashtags = [region, brand, topic, "매장소식", "방문후기"]
    .filter(Boolean)
    .slice(0, 8)
    .map((t) => `#${String(t).replace(/\s+/g, "")}`);

  return {
    hook,
    body,
    lineBreakBody: body,
    ending,
    hashtags,
  };
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

  if (
    bestPack &&
    isPublishableChannelPack(channel, bestPack)
  ) {
    return {
      pack: markChannelDraft(bestPack, channel, "llm_draft", failures),
      source: "llm_draft",
    };
  }

  const enriched = enrichMinimalBlogInput(input);
  const form = normalizePipelineInput(enriched);

  if (channel === "place") {
    let pack = null;
    if (sourceBlog?.sections?.length) {
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
    if (hasUsableResearchFacts(enriched)) {
      const researchPack = buildResearchGroundedPlacePack(enriched);
      if (isPublishableChannelPack("place", researchPack)) {
        pack = researchPack;
      }
    }
    const placeSource = pack?._meta?.researchGroundedChannelPack
      ? "research_grounded_place"
      : "place_prose_fallback";
    return {
      pack: markChannelDraft(pack, "place", placeSource, failures),
      source: placeSource,
    };
  }

  if (channel === "instagram") {
    const toneKey = instaTone || enriched.instaTone || "emotional";
    let pack = null;
    if (sourceBlog?.sections?.length) {
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
    if (hasUsableResearchFacts(enriched)) {
      const researchPack = buildResearchGroundedInstagramPack(enriched, toneKey);
      if (isPublishableChannelPack("instagram", researchPack)) {
        pack = researchPack;
      }
    }
    const instaSource = pack?._meta?.researchGroundedChannelPack
      ? "research_grounded_instagram"
      : "instagram_prose_fallback";
    return {
      pack: markChannelDraft(pack, "instagram", instaSource, failures),
      source: instaSource,
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
