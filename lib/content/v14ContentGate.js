/**
 * V14 출력 전 검수 — 8항 체크리스트
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import {
  hasMetaLayerLeak,
  hasMetaPhilosophyLeak,
  hasOperatorMetaLeak,
} from "@/lib/content/metaLayerSeparation";
import { detectOutlineLeak } from "@/lib/content/outlinePackGuard";
import {
  assertV13PreOutput,
  scoreInputTopicDominance,
} from "@/lib/content/v13ContentGate";
import { scoreIndustryDensity } from "@/lib/content/industryDensityEngine";
import { scoreRegionDensity } from "@/lib/content/regionDensityEngine";
import { detectExcessiveRepetition } from "@/lib/content/repetitionEngine";
import {
  MASTER_ENGINE_V14_PRE_OUTPUT_CHECKLIST,
  V14_TOPIC_DOMINANCE_MIN,
} from "@/lib/content/contentIntelligenceV14";

function countBrandMentions(full, brand) {
  if (!brand) return 0;
  const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (String(full || "").match(re) || []).length;
}

/**
 * @param {object} pack
 * @param {string} channel
 * @param {object} ctx
 */
export function assertV14PreOutput(pack, channel = "blog", ctx = {}) {
  const input = ctx.input || ctx;
  const full = getChannelFullText(pack, channel);
  const reasons = [];
  const checklist = {};

  const v13 = assertV13PreOutput(pack, channel, { ...ctx, input });
  if (!v13.ok) reasons.push(...v13.reasons);

  const outline = detectOutlineLeak(pack, channel);
  checklist.write_not_plan = !outline.isOutline;
  if (outline.isOutline && !reasons.includes("outline_only_output")) {
    reasons.push("outline_only_output");
  }

  const brand = String(ctx.brandName || input.brandName || "").trim();
  const brandCount = countBrandMentions(full, brand);
  checklist.brand_reflected = brandCount >= (channel === "instagram" ? 1 : 3);
  if (brand && !checklist.brand_reflected) reasons.push("brand_under_reflected");

  const regionScore = scoreRegionDensity(full, { ...ctx, input });
  checklist.region_reflected = regionScore.ok || regionScore.skipped;
  if (!checklist.region_reflected) reasons.push("region_density_low");

  const dominance = scoreInputTopicDominance(full, { ...ctx, input }, channel);
  const minDom = channel === "blog" ? V14_TOPIC_DOMINANCE_MIN : 0.65;
  checklist.topic_dominance_80 = dominance.ratio >= minDom;
  if (!checklist.topic_dominance_80) reasons.push("topic_dominance_low");

  const industry = scoreIndustryDensity(full, { ...ctx, input });
  checklist.industry_density = industry.ok;
  if (channel === "blog" && !industry.ok) reasons.push("industry_density_low");

  const repetition = detectExcessiveRepetition(full);
  checklist.repetition_ok = repetition.ok;
  if (!repetition.ok) reasons.push("excessive_repetition");

  if (channel === "blog") {
    const length = assertBlogLengthTier(input, pack);
    checklist.length_tier_ok = length.ok;
    if (!length.ok) {
      reasons.push(...(length.reasons || ["length_tier_mismatch"]));
    }
  } else {
    checklist.length_tier_ok = true;
  }

  const metaLeak =
    hasMetaPhilosophyLeak(full, ctx) ||
    hasMetaLayerLeak(full) ||
    hasOperatorMetaLeak(full, ctx);
  checklist.no_meta_prompt_leak = !metaLeak;
  if (metaLeak) {
    if (!reasons.includes("meta_philosophy_leak")) reasons.push("meta_philosophy_leak");
  }

  return {
    ok: [...new Set(reasons)].length === 0,
    reasons: [...new Set(reasons)],
    checklist,
    dominance,
    industry,
    region: regionScore,
    repetition,
    v13,
    masterChecklist: MASTER_ENGINE_V14_PRE_OUTPUT_CHECKLIST,
  };
}

export {
  assertV13PreOutput,
  scoreInputTopicDominance,
  inputTopicKeywords,
} from "@/lib/content/v13ContentGate";
