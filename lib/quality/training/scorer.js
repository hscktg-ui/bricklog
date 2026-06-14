import { computeFinalQualityScore } from "@/lib/pipeline/v2/finalQualityScore";
import { runV4CoreAudit } from "@/lib/quality/v4ContentAudit";
import { scoreCoreContent } from "@/lib/quality/coreQualityEngine";
import { getBlogFullText } from "@/utils/qualityCheck";
import { checkPlaceQuality, checkInstaQuality } from "@/utils/qualityCheck";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER, BLOG_MIN_BODY_CHARS } from "@/lib/constants";
import { packFullContent } from "@/lib/memory/contentStore";
import { getQualityTarget } from "@/lib/quality/qualityDefaults";
import { isMissionCatalogDeliveryPack } from "@/lib/product/missionCatalogDelivery";
import { resolveEditorColumnMinChars } from "@/lib/product/professionalEditorGradeEngine";

function scoreDerivedChannel(pack, ctx, channel) {
  const target = getQualityTarget();
  const text = packFullContent(channel, pack);
  const blogCore = Number(ctx.blogCoreScore) || 0;
  const blogTraining = Number(ctx.blogTrainingScore) || 0;
  let total =
    blogCore >= target
      ? Math.max(target, Math.min(99, blogCore - 2))
      : blogTraining >= target
        ? Math.max(target - 2, blogTraining - 4)
        : 82;
  const blockers = [];

  if (channel === "place") {
    const q = checkPlaceQuality(pack, ctx);
    if (!q.ok) {
      total -= blogCore >= target ? 2 : 8;
      if (blogCore < target) blockers.push("place_quality");
    }
  }
  if (channel === "instagram") {
    const q = checkInstaQuality(pack, ctx);
    if (!q.ok) {
      total -= blogCore >= target ? 2 : 8;
      if (blogCore < target) blockers.push("insta_quality");
    }
  }
  if (!text || text.length < 80) {
    total -= 12;
    blockers.push("length");
  }
  if (/\b(undefined|null)\b/i.test(text)) {
    total -= 30;
    blockers.push("placeholder");
  }
  total = Math.max(0, Math.min(100, total));
  return {
    total,
    blockers,
    pass: total >= target && !blockers.includes("placeholder"),
  };
}

function resolveTrainingBlogMinChars(pack, ctx = {}) {
  const input = ctx.input || ctx;
  if (
    isMissionCatalogDeliveryPack(pack, input) ||
    pack?._meta?.industryHumanColumnEditorial ||
    pack?._meta?.missionProseFallback
  ) {
    return resolveEditorColumnMinChars(input);
  }
  const tierKey = input.blogLengthTier || ctx.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const tier = resolveBlogLengthTier(tierKey);
  if (tierKey === "short") {
    return Math.max(480, Math.round(tier.min * 0.45));
  }
  return BLOG_MIN_BODY_CHARS;
}

export function scoreTrainingContent(pack, ctx = {}, channel = "blog") {
  if (!pack) {
    return { total: 0, blockers: ["empty"], pass: false };
  }

  if (channel === "blog") {
    const quality = computeFinalQualityScore(pack, ctx);
    const v4 = runV4CoreAudit(pack, ctx);
    const coreEngine = scoreCoreContent(pack, ctx, "blog");
    const charCount = countBlogBodyChars(pack);
    const target = getQualityTarget();
    const trainingMin = resolveTrainingBlogMinChars(pack, ctx);
    const blockers = [
      ...new Set([
        ...(coreEngine.failReasons || []),
        ...v4.blockers.filter((b) => b !== "length_under_min"),
        ...(quality.pass ? [] : ["quality_score"]),
      ]),
    ];
    if (charCount < trainingMin && !coreEngine.pass) {
      blockers.push("length");
    }
    if (charCount < trainingMin) {
      blockers.push("length_under_min");
    }

    const deliveryPublishReady =
      pack._meta?.publishReady === true &&
      pack._meta?.missionProseFallback === true;

    const coreMeetsTarget = coreEngine.total >= target && coreEngine.pass;

    let total = Math.round(
      quality.total * 0.2 + v4.humanityScore * 0.15 + coreEngine.total * 0.65
    );
    if (coreEngine.pass && coreMeetsTarget) {
      total = Math.max(total, Math.min(100, coreEngine.total));
    }
    if (pack._meta?.generationMode?.includes("llm") && coreEngine.pass && coreMeetsTarget) {
      total = Math.max(total, target);
    }
    if (!coreEngine.pass || charCount < trainingMin) {
      total = Math.min(total, Math.max(0, target - 6));
    }

    const pass =
      deliveryPublishReady && coreEngine.pass && !blockers.includes("placeholder")
        ? true
        : coreEngine.pass &&
          charCount >= trainingMin &&
          !blockers.includes("placeholder");

    if (deliveryPublishReady && coreEngine.pass && pass) {
      total = Math.max(total, target);
    }

    return {
      total,
      blockers,
      pass,
      breakdown: quality.breakdown,
    };
  }

  if (channel === "place" || channel === "instagram") {
    return scoreDerivedChannel(pack, ctx, channel);
  }

  const channelPassMin = getQualityTarget();
  const text = packFullContent(channel, pack);
  let total = 80;
  const blockers = [];
  if (!text || text.length < 80) {
    total -= 20;
    blockers.push("length");
  }
  if (/\b(undefined|null)\b/i.test(text)) {
    total -= 30;
    blockers.push("placeholder");
  }
  total = Math.max(0, Math.min(100, total));
  return {
    total,
    blockers,
    pass: total >= channelPassMin && !blockers.includes("placeholder"),
  };
}

export function serializePackForStorage(pack, channel) {
  if (!pack) return "";
  if (channel === "blog") return getBlogFullText(pack).slice(0, 12000);
  return packFullContent(channel, pack).slice(0, 8000);
}
