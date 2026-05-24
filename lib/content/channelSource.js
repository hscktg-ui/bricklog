/**
 * 채널 간 파생 — 블로그 우선이 아닌, 최신 팩·임의 채널 기준
 */
import { createPromptContext } from "@/utils/promptBuilder";
import { getToneModifier } from "@/lib/prompts/tones";
import { buildPlacePack } from "@/lib/prompts/engine/placeEngine";
import { buildInstaPack } from "@/lib/prompts/engine/instaEngine";
import {
  normalizePipelineInput,
  extractBlogInsights,
  buildPipelineContext,
  buildBaseContentLabel,
  buildFormBlogProxy,
  runPlacePipeline,
  runInstagramPipeline,
} from "@/lib/contentPipeline";

const CHANNEL_LABEL = {
  blog: "블로그",
  place: "플레이스",
  instagram: "인스타",
};

export function getPackTimestamp(pack) {
  if (!pack) return 0;
  const raw = pack._meta?.generatedAt || pack._editedAt;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * @param {{ blogContent?: object, placeContent?: object, instagramContent?: object, sourceChannel?: string | null }}
 */
export function pickLatestSource({
  blogContent,
  placeContent,
  instagramContent,
  sourceChannel = null,
}) {
  const candidates = [];
  if (blogContent) {
    candidates.push({ channel: "blog", pack: blogContent });
  }
  if (placeContent) {
    candidates.push({ channel: "place", pack: placeContent });
  }
  if (instagramContent) {
    candidates.push({ channel: "instagram", pack: instagramContent });
  }
  if (!candidates.length) return null;

  if (sourceChannel) {
    const pinned = candidates.find((c) => c.channel === sourceChannel);
    if (pinned) {
      return {
        ...pinned,
        label: CHANNEL_LABEL[pinned.channel] || pinned.channel,
      };
    }
  }

  candidates.sort(
    (a, b) => getPackTimestamp(b.pack) - getPackTimestamp(a.pack)
  );
  const top = candidates[0];
  return { ...top, label: CHANNEL_LABEL[top.channel] || top.channel };
}

/** place / insta → 블로그 파생용 최소 블로그 형태 */
export function packToBlogProxy(pack, channel) {
  if (!pack) return null;
  if (channel === "blog") return pack;
  if (channel === "place") {
    const body = [pack.shortNotice || pack.shortBody, pack.detailBody]
      .filter(Boolean)
      .join("\n\n");
    return {
      title: pack.title || "플레이스 소식",
      representativeTitle: pack.title,
      sections: body
        ? [{ heading: "플레이스", body }]
        : [{ heading: "공지", body: pack.title || "" }],
      conclusion: pack.cta || "",
      hashtags: [],
      _meta: { generationMode: "channel_proxy", sourceChannel: "place" },
    };
  }
  if (channel === "instagram") {
    const body = pack.lineBreakBody || pack.body || "";
    return {
      title: pack.hook || "인스타 캡션",
      representativeTitle: pack.hook,
      sections: [{ heading: "캡션", body }],
      conclusion: pack.ending || "",
      hashtags: pack.hashtags || [],
      _meta: { generationMode: "channel_proxy", sourceChannel: "instagram" },
    };
  }
  return null;
}

export function buildSourceLabel(channel, formValues, pack) {
  const region = formValues?.region?.trim() || "";
  const main =
    formValues?.mainKeyword?.trim() ||
    pack?.title ||
    pack?.hook ||
    "콘텐츠";
  const ch = CHANNEL_LABEL[channel] || channel;
  const parts = [region, main].filter(Boolean);
  return `${parts.join(" ")} ${ch} 기반`.trim();
}

function mapPlacePack(pack, meta = {}) {
  const shortNotice = pack.shortNotice || pack.shortBody || "";
  const detailBody = pack.detailBody || "";
  return {
    ...pack,
    shortNotice,
    shortBody: shortNotice,
    detailBody,
    body: [shortNotice, detailBody].filter(Boolean).join("\n\n"),
    _meta: {
      ...pack._meta,
      generatedAt: new Date().toISOString(),
      ...meta,
    },
  };
}

function mapInstaPack(pack, meta = {}) {
  const body = pack.lineBreakBody || pack.body || "";
  return {
    ...pack,
    body,
    lineBreakBody: body,
    _meta: {
      ...pack._meta,
      generatedAt: new Date().toISOString(),
      ...meta,
    },
  };
}

/** 폼만으로 플레이스 단독 생성 (템플릿) */
export function runPlaceStandalone(formValues) {
  const input = normalizePipelineInput(formValues);
  const ctx = createPromptContext(input);
  const placeTone = getToneModifier(
    ctx.placeToneKey || ctx.toneKey || "informative"
  );
  const pack = buildPlacePack(ctx, ctx.flavor, ctx.purpose, placeTone);
  return mapPlacePack(pack, {
    pipeline: "standalone",
    derivedFrom: "form",
    sourceChannel: "place",
  });
}

/** 폼만으로 인스타 단독 생성 */
export function runInstagramStandalone(formValues, instaToneKey = "emotional") {
  const input = normalizePipelineInput(formValues);
  const ctx = createPromptContext(input);
  const pack = buildInstaPack(ctx, ctx.flavor, ctx.purpose, ctx.tone);
  return mapInstaPack(pack, {
    pipeline: "standalone",
    derivedFrom: "form",
    sourceChannel: "instagram",
    instaTone: instaToneKey,
  });
}

/**
 * 타깃 채널 생성용 소스 해석
 * @returns {{ sourceChannel: string, blogLike: object, baseLabel: string } | null}
 */
export function resolveDerivationSource(targetChannel, state) {
  const {
    blogContent,
    placeContent,
    instagramContent,
    blogInput,
    baseContentLabel,
    sourceChannel,
  } = state;

  const prefer = pickLatestSource({
    blogContent,
    placeContent,
    instagramContent,
    sourceChannel,
  });

  if (targetChannel === "place") {
    if (blogContent && !blogContent._meta?.isBriefOnly) {
      const isLlm =
        blogContent._meta?.generationMode === "llm" ||
        String(blogContent._meta?.generationMode || "").startsWith("llm_");
      if (isLlm) {
        return {
          sourceChannel: "blog",
          blogLike: blogContent,
          baseLabel:
            baseContentLabel ||
            buildBaseContentLabel(blogInput, blogContent),
        };
      }
    }
    if (prefer && prefer.channel === "place" && !blogContent) {
      return {
        sourceChannel: "form",
        blogLike: null,
        baseLabel: buildSourceLabel("place", blogInput, placeContent),
        standalone: true,
      };
    }
    if (prefer && prefer.channel !== "place") {
      const proxy = packToBlogProxy(prefer.pack, prefer.channel);
      return {
        sourceChannel: prefer.channel,
        blogLike: proxy,
        baseLabel: buildSourceLabel(prefer.channel, blogInput, prefer.pack),
      };
    }
    return {
      sourceChannel: "form",
      blogLike: null,
      baseLabel: buildSourceLabel("place", blogInput),
      standalone: true,
    };
  }

  if (targetChannel === "instagram") {
    if (blogContent && !blogContent._meta?.isBriefOnly) {
      const isLlm =
        blogContent._meta?.generationMode === "llm" ||
        String(blogContent._meta?.generationMode || "").startsWith("llm_");
      if (isLlm) {
        return {
          sourceChannel: "blog",
          blogLike: blogContent,
          baseLabel:
            baseContentLabel ||
            buildBaseContentLabel(blogInput, blogContent),
        };
      }
    }
    if (prefer?.channel === "instagram" && instagramContent && !blogContent) {
      return {
        sourceChannel: "form",
        blogLike: null,
        baseLabel: buildSourceLabel("instagram", blogInput, instagramContent),
        standalone: true,
      };
    }
    if (prefer) {
      const proxy = packToBlogProxy(prefer.pack, prefer.channel);
      return {
        sourceChannel: prefer.channel,
        blogLike: proxy,
        baseLabel: buildSourceLabel(prefer.channel, blogInput, prefer.pack),
      };
    }
    return {
      sourceChannel: "form",
      blogLike: null,
      baseLabel: buildSourceLabel("instagram", blogInput),
      standalone: true,
    };
  }

  if (targetChannel === "blog" && prefer && prefer.channel !== "blog") {
    return {
      sourceChannel: prefer.channel,
      blogLike: packToBlogProxy(prefer.pack, prefer.channel),
      baseLabel: buildSourceLabel(prefer.channel, blogInput, prefer.pack),
      deriveBlog: true,
    };
  }

  if (targetChannel === "image") {
    if (prefer) {
      const proxy =
        prefer.channel === "blog"
          ? prefer.pack
          : packToBlogProxy(prefer.pack, prefer.channel);
      return {
        sourceChannel: prefer.channel,
        blogLike: proxy,
        baseLabel: buildSourceLabel(prefer.channel, blogInput, prefer.pack),
      };
    }
    return {
      sourceChannel: "form",
      blogLike: buildFormBlogProxy(blogInput),
      baseLabel: buildSourceLabel("image", blogInput),
      standalone: true,
    };
  }

  return null;
}

export function buildChannelSourceBrief(source) {
  if (!source?.blogLike || source.sourceChannel === "blog") return "";
  const ch = CHANNEL_LABEL[source.sourceChannel] || source.sourceChannel;
  const title = source.blogLike.title || "";
  const excerpt =
    source.blogLike.sections?.map((s) => s.body).join("\n").slice(0, 1200) ||
    "";
  return `[${ch} 초안 기반 블로그 작성]\n제목: ${title}\n${excerpt}`.trim();
}

export { extractBlogInsights, buildPipelineContext };
