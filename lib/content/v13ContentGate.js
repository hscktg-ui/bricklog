/**
 * V13 출력 전 검수 — 전 채널 공통
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import {
  hasMetaLayerLeak,
  hasMetaPhilosophyLeak,
} from "@/lib/content/metaLayerSeparation";
import { detectOutlineLeak } from "@/lib/content/outlinePackGuard";
import {
  V13_TOPIC_DOMINANCE_MIN,
  MASTER_ENGINE_V13_PRE_OUTPUT_CHECKLIST,
} from "@/lib/content/contentIntelligenceV13";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

function tokenizeTopic(text) {
  return String(text || "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

export function inputTopicKeywords(ctx = {}) {
  const anchor = ctx.topicAnchor || ctx.inputGrounding?.topicAnchor;
  if (anchor?.length) return [...new Set(anchor)];

  const topicLine = [
    ctx.input?.topic,
    ctx.input?.mainKeyword,
    ctx.topic,
    ctx.main,
    ctx.mainKeyword,
  ]
    .filter(Boolean)
    .join(" ");
  const topicParts = String(topicLine || "")
    .split(/[,，·/\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  const raw = [
    topicLine,
    ctx.writingSubject,
    ctx.contentThesis,
    ctx.input?.placeHeadline,
    ctx.input?.placeOffer,
    ctx.brandName,
    ctx.region,
    ...(ctx.inputGrounding?.mustInclude || []),
    ...topicParts,
  ]
    .filter(Boolean)
    .join(" ");
  return [...new Set([...tokenizeTopic(raw), ...topicParts])];
}

/**
 * 문장 중 주제 키워드가 포함된 비율 (V13: 80%+)
 */
export function scoreInputTopicDominance(full, ctx = {}, channel = "blog") {
  const kws = inputTopicKeywords(ctx);
  if (!kws.length) return { ratio: 1, ok: true, hits: 0, total: 0 };

  const sentences = String(full || "")
    .split(/[.!?。]\s*|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 10);

  const minRatio =
    channel === "blog"
      ? isBriclogMissionEnforced()
        ? 0.92
        : V13_TOPIC_DOMINANCE_MIN
      : 0.65;

  if (sentences.length <= 3 && channel !== "blog") {
    const charHits = kws.filter((k) => full.includes(k)).length;
    const ratio = charHits / kws.length;
    return {
      ratio,
      ok: ratio >= 0.5,
      hits: charHits,
      total: kws.length,
      mode: "keyword_short",
    };
  }

  if (!sentences.length) {
    const charHits = kws.filter((k) => full.includes(k)).length;
    const ratio = charHits / kws.length;
    return {
      ratio,
      ok: ratio >= minRatio,
      hits: charHits,
      total: kws.length,
      mode: "keyword",
    };
  }

  const hits = sentences.filter((s) => kws.some((k) => s.includes(k))).length;
  const ratio = hits / sentences.length;
  return {
    ratio,
    ok: ratio >= minRatio,
    hits,
    total: sentences.length,
    mode: "sentence",
  };
}

/**
 * @param {object} pack
 * @param {string} channel
 * @param {object} ctx
 */
export function assertV13PreOutput(pack, channel = "blog", ctx = {}) {
  const reasons = [];
  const full = getChannelFullText(pack, channel);

  const dominance = scoreInputTopicDominance(full, ctx, channel);
  if (!dominance.ok) {
    reasons.push("topic_dominance_low");
  }

  if (hasMetaPhilosophyLeak(full, ctx)) {
    reasons.push("meta_philosophy_leak");
  }
  if (hasMetaLayerLeak(full)) {
    reasons.push("meta_layer_term_leak");
  }

  if (channel === "blog" || channel === "place" || channel === "instagram") {
    const outline = detectOutlineLeak(pack, channel);
    if (outline.isOutline) {
      reasons.push("outline_only_output");
    }
  }

  if (channel === "instagram" && full.replace(/\s/g, "").length > 720) {
    reasons.push("insta_blog_tone");
  }

  if (channel === "place" && /블로그|SEO|체류|키워드\s*도배/.test(full)) {
    reasons.push("place_blog_tone");
  }

  return {
    ok: reasons.length === 0,
    reasons: [...new Set(reasons)],
    dominance,
    checklist: MASTER_ENGINE_V13_PRE_OUTPUT_CHECKLIST,
  };
}
