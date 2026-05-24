import { persistPipelineToMemory } from "@/lib/memory/persistGeneration";
import { saveGeneration } from "@/lib/generations";
import { serializeContent } from "@/lib/contentFormat";
import { buildRefinedDraftLabel } from "@/lib/history/refineDraftTitle";
import { pastedTextToBlogPack } from "@/lib/review/pasteToBlogPack";
import { pastedTextToPlacePack } from "@/lib/review/pasteToPlacePack";
import { pastedTextToInstaPack } from "@/lib/review/pasteToInstaPack";
import { getPasteReviewChannel } from "@/lib/review/pasteChannelConfig";

export const REVIEW_DRAFT_SAVED_EVENT = "briclog-review-draft-saved";

export function notifyReviewDraftSaved(detail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(REVIEW_DRAFT_SAVED_EVENT, { detail })
  );
}

function buildPack(channel, text, fields = {}) {
  if (channel === "place") {
    return pastedTextToPlacePack(text, {
      title: fields.placeTitle,
      short: fields.placeShort,
      detail: fields.placeDetail,
    });
  }
  if (channel === "instagram") {
    return pastedTextToInstaPack(text);
  }
  return pastedTextToBlogPack(text);
}

function toGenerationRow({
  channel,
  pack,
  text,
  titleLine,
  label,
  purpose,
  ctx,
  brandId,
}) {
  const base = {
    business_type: ctx.brandName ? "other" : "",
    region: ctx.region || "",
    main_keyword: label,
    sub_keywords: "",
    purpose,
    tone: "검수",
    hashtags: null,
    image_prompt: null,
    full_copy_text: text,
    brand_id: brandId || null,
  };

  if (channel === "place") {
    return {
      ...base,
      blog: null,
      place: serializeContent(pack),
      instagram: null,
    };
  }
  if (channel === "instagram") {
    return {
      ...base,
      blog: null,
      place: null,
      instagram: serializeContent(pack),
    };
  }
  return {
    ...base,
    blog: serializeContent({
      title: pack.title || titleLine.slice(0, 80),
      sections: pack.sections?.length
        ? pack.sections
        : [{ heading: "본문", body: text }],
      conclusion: pack.conclusion || "",
      hashtags: [],
    }),
    place: null,
    instagram: null,
  };
}

/**
 * 붙여넣기 검수·개선본 → Supabase generations + 브랜드 memory + contentArchive
 */
export async function persistReviewDraft({
  userId,
  brandId,
  channelId,
  text,
  fields = {},
  ctx = {},
  audit = null,
  versionSource = "paste_review_improve",
  purposeSuffix = "",
  saveChannelContent = null,
  demoMode = false,
}) {
  const trimmed = String(text || "").trim();
  const channelConfig = getPasteReviewChannel(channelId);
  if (!trimmed || demoMode) {
    return { ok: false, label: null, memoryItem: null };
  }

  const titleLine =
    trimmed.split("\n").find((l) => l.trim())?.trim() ||
    `${channelConfig.label} 검수`;
  const label = buildRefinedDraftLabel(titleLine.slice(0, 40));
  const purpose = `붙여넣기 검수 · ${channelConfig.label}${
    purposeSuffix ? ` · ${purposeSuffix}` : ""
  }`;

  const pack = buildPack(channelId, trimmed, fields);
  pack._meta = {
    ...(pack._meta || {}),
    generationMode: versionSource,
    qualityScore: audit?.score != null ? { total: audit.score } : undefined,
    source: "paste_review",
  };

  const memoryChannel = channelId === "instagram" ? "instagram" : channelId;
  let memoryItem = null;

  if (brandId) {
    try {
      const saved = await persistPipelineToMemory({
        brandId,
        blog: channelId === "blog" ? pack : null,
        place: channelId === "place" ? pack : null,
        instagram: channelId === "instagram" ? pack : null,
        versionSource,
        meta: {
          promptInput: {
            source: "paste_review",
            versionSource,
            quality_score: audit?.score ?? null,
          },
          qualityScore: audit?.score ?? null,
        },
      });
      memoryItem = saved?.[0] || null;
    } catch {
      /* memory optional */
    }

    if (saveChannelContent) {
      const archiveKey =
        channelId === "instagram"
          ? "insta"
          : channelId === "place"
            ? "place"
            : "blog";
      try {
        await saveChannelContent(archiveKey, pack, trimmed);
      } catch {
        /* archive optional */
      }
    }
  }

  if (userId) {
    try {
      await saveGeneration(
        userId,
        toGenerationRow({
          channel: channelId,
          pack,
          text: trimmed,
          titleLine,
          label,
          purpose,
          ctx,
          brandId,
        })
      );
    } catch {
      return { ok: false, label, memoryItem };
    }
  }

  notifyReviewDraftSaved({ brandId, channel: memoryChannel, label });

  return { ok: true, label, memoryItem, title: packTitleFromPack(channelId, pack) };
}

function packTitleFromPack(channelId, pack) {
  if (channelId === "place") return pack.title || "플레이스";
  if (channelId === "instagram") return pack.hook || "인스타 캡션";
  return pack.title || pack.representativeTitle || "블로그";
}
