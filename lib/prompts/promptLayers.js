/**
 * Prompt 레이어 조합 — 필요한 블록만 합침
 */
import { getIndustryDNABrief } from "./industryDNA";
import { getActiveSeasonContext } from "@/lib/season/seasonEngine";
import { buildConstitutionSystemAddon } from "@/lib/constitution/writingConstitutionV2";
import { BLOG_STYLE_HINTS } from "./examples/blogExamples";
import { PLACE_STYLE_HINTS } from "./examples/placeExamples";
import { INSTA_STYLE_HINTS } from "./examples/instagramExamples";

export function buildSystemLayer(ctx, channel = "blog") {
  const ch = channel === "smartplace" ? "place" : channel;
  return [
    buildConstitutionSystemAddon(ch, ctx),
    "BRICLOG — Korean local brand content OS. Not SEO spam. Human-readable.",
    ctx.brandResearch?.sourceStatus === "user_input_only"
      ? "Research: user input + brand inference only."
      : "Research: mixed sources.",
    ctx.searchSummaryBrief || "",
  ].join("\n");
}

export function buildKpiLayer(ctx) {
  if (!ctx.kpi) return "";
  return `KPI: ${ctx.kpi.label} — ${ctx.kpi.hint}`;
}

export function buildStyleLayer(ctx, channel) {
  const dna = getIndustryDNABrief(ctx.industryKey || ctx.legacyIndustryKey);
  const season = getActiveSeasonContext();
  const hints =
    channel === "blog"
      ? BLOG_STYLE_HINTS
      : channel === "place"
        ? PLACE_STYLE_HINTS
        : INSTA_STYLE_HINTS;
  return [dna, season.promptLine, ...hints].join("\n");
}

export function buildChannelLayer(ctx, channel) {
  return ctx.channelBriefs?.[channel] || "";
}

export function assemblePromptLayers(ctx, channel = "blog") {
  return {
    system: buildSystemLayer(ctx, channel),
    kpi: buildKpiLayer(ctx),
    style: buildStyleLayer(ctx, channel),
    channel: buildChannelLayer(ctx, channel === "smartplace" ? "smartplace" : channel),
    exposure:
      channel === "blog"
        ? ctx.exposureBlog
        : channel === "place"
          ? ctx.exposurePlace
          : ctx.exposureInstagram,
    trend:
      channel === "blog"
        ? ctx.trendHintsBlog
        : channel === "place"
          ? ctx.trendHintsPlace
          : ctx.trendHintsInstagram,
  };
}

export function layersToBrief(layers) {
  return Object.entries(layers)
    .filter(([, v]) => v)
    .map(([k, v]) => `[${k}]\n${v}`)
    .join("\n\n");
}
