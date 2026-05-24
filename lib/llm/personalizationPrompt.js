/**
 * 프롬프트 주입용 개인화 블록 (blog / place / insta 공통)
 */
import {
  buildBrandMemoryAddon,
  buildBrandMemoryUserSection,
  buildContentMemoryBrief,
} from "@/lib/memory/brandMemoryBundle";

export function formatStyleContinuityBrief(profile = {}) {
  if (!profile) return "";
  const parts = [];
  const fp = profile.styleFingerprint;
  if (fp?.sentenceLengthBand) {
    parts.push(`문장 길이: ${fp.sentenceLengthBand}`);
  }
  if (fp?.emojiDensity && fp.emojiDensity !== "none") {
    parts.push(`이모지: ${fp.emojiDensity}`);
  }
  if (fp?.toneTags?.length) {
    parts.push(`톤: ${fp.toneTags.join(", ")}`);
  }
  if (profile.bannedPhrasesFromFeedback?.length) {
    parts.push(`피하기: ${profile.bannedPhrasesFromFeedback.slice(0, 5).join(" · ")}`);
  }
  const summaries = profile.recentContentSummaries || [];
  if (summaries.length) {
    const lines = summaries.slice(0, 4).map((s) => {
      const ch = s.channel === "smartplace" ? "place" : s.channel;
      return `[${ch}] ${s.title || ""} — ${s.excerpt || ""}`.trim();
    });
    parts.push(`최근 글 톤 참고(문장 복사 금지): ${lines.join(" | ")}`);
  }
  if (!parts.length) return "";
  return parts.join(" · ").slice(0, 1400);
}

/**
 * @param {object} ctx — personalizationBrief | userWritingBrief 등
 */
/** @deprecated — blog는 buildBrandMemoryUserSection 사용 */
export function buildPersonalizationUserAddon(ctx = {}) {
  return buildBrandMemoryUserSection(ctx);
}

function buildCombinedFromCtx(ctx) {
  return buildBrandMemoryAddon({
    userMemoryBrief: [ctx.userWritingBrief, ctx.accountBrief ? `운영: ${ctx.accountBrief}` : ""]
      .filter(Boolean)
      .join(" · "),
    brandMemoryBrief: [ctx.brandHabitsBrief, ctx.brandKnowledgeBrief]
      .filter(Boolean)
      .join(" · "),
    contentMemoryBrief: buildContentMemoryBrief({
      feedbackBrief: ctx.brandFeedbackBrief,
      styleContinuityBrief: ctx.styleContinuityBrief,
      dataAssetBrief: ctx.dataAssetBrief,
    }),
  });
}

export function applyPersonalizationToContext(ctx, layers = {}) {
  if (!ctx || !layers) return ctx;
  const combined =
    layers.combinedPromptAddon ||
    ctx.combinedPersonalizationAddon ||
    ctx.personalizationAddon;
  return {
    ...ctx,
    accountBrief: layers.accountBrief || ctx.accountBrief,
    userWritingBrief: layers.userBrief || ctx.userWritingBrief,
    userMemoryBrief: layers.userMemoryBrief || ctx.userMemoryBrief,
    brandHabitsBrief: layers.brandBrief || ctx.brandHabitsBrief,
    brandMemoryBrief: layers.brandMemoryBrief || ctx.brandMemoryBrief,
    contentMemoryBrief: layers.contentMemoryBrief || ctx.contentMemoryBrief,
    brandFeedbackBrief: layers.feedbackBrief || ctx.brandFeedbackBrief,
    styleContinuityBrief:
      layers.styleContinuityBrief || ctx.styleContinuityBrief,
    brandKnowledgeBrief:
      layers.brandKnowledgeBrief || ctx.brandKnowledgeBrief,
    personalizationAddon: combined,
    combinedPersonalizationAddon: combined,
  };
}

export { buildBrandMemoryUserSection };
