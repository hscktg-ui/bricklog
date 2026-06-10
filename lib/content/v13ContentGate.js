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
import { getBlogFullText } from "@/utils/qualityCheck";
import { topicWritingFacet } from "@/lib/content/topicFacetEngine";

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
        ? 0.85
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

/** 키워드 미포함 문단에 주제·브랜드 앵커 보강 — 문장 조각에 hook 붙이지 않음 */
function isIncompleteParagraph(para) {
  const t = String(para || "").trim();
  if (t.length < 12) return true;
  if (/^(?:을|를|에|에서|으로|과|와|는|가)\s/.test(t)) return true;
  if (/\s(?:을|를)\s/.test(t.slice(0, 40)) && !/[.!?。]$/.test(t)) return true;
  return false;
}

function weaveParagraphDominance(para, kws, brand, region, shortAnchor, facet, regionBit) {
  const anchored =
    (brand.length >= 2 && para.includes(brand)) ||
    (region.length >= 2 && para.includes(region)) ||
    kws.some((k) => k.length >= 2 && para.includes(k));
  if (anchored) return para;

  if (isIncompleteParagraph(para)) {
    if (brand.length >= 2 && !para.includes(brand)) {
      return `${brand} ${para}`.replace(/\s+/g, " ").trim();
    }
    return para;
  }

  const endsSentence = /[.!?。]["']?\s*$/.test(para.trim());
  if (!isBriclogMissionEnforced()) {
    if (endsSentence && brand.length >= 2) {
      const tail = `${regionBit}${brand} ${shortAnchor || facet}`.replace(/\s+/g, " ").trim();
      if (!para.includes(tail.slice(0, 8))) {
        return `${para.replace(/\s+$/, "")} (${tail} 기준)`.trim();
      }
    }
    if (shortAnchor && !kws.some((k) => para.includes(k))) {
      return `${para} (${shortAnchor})`.replace(/\s+/g, " ").trim();
    }
  }

  if (brand.length >= 2 && !para.includes(brand)) {
    return `${regionBit}${brand} — ${para}`.replace(/\s+/g, " ").trim();
  }
  return para;
}

/** @deprecated sentence-level weave breaks Korean fragments — use weaveParagraphDominance */
function weaveSentenceDominance(text, kws, brand, region, hooks, startIdx) {
  return { text: weaveParagraphDominance(text, kws, brand, region, "", "", ""), nextIdx: startIdx + 1 };
}

/** 키워드 미포함 문단에 주제·브랜드 앵커 보강 */
export function weaveTopicDominanceIntoPack(pack, ctx = {}) {
  if (!pack?.sections?.length) return pack;
  const input = ctx.input || ctx;
  const fullCtx = { ...ctx, input };
  const dominance = scoreInputTopicDominance(getBlogFullText(pack), fullCtx, "blog");
  if (dominance.ok) return pack;

  const kws = inputTopicKeywords(fullCtx).filter((k) => k.length >= 2);
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const kw = String(input.mainKeyword || "").trim();
  const facet = topicWritingFacet(input) || kw;
  const shortAnchor = kw || facet;
  if (!shortAnchor && !brand) return pack;
  const regionBit = region ? `${region} ` : "";
  let sections = [...(pack.sections || [])];
  let conclusion = pack.conclusion;

  for (let round = 0; round < 3; round += 1) {
    let paraIdx = 0;
    sections = sections.map((sec, secIdx) => {
      const paras = String(sec.body || "").split(/\n\n+/).filter(Boolean);
      const patched = paras.map((para, pi) => {
        if (secIdx === 0 && pi === 0 && /(?:왜|찾|고민|막히|솔직|검색|헷갈|계기)/.test(para.slice(0, 120))) {
          paraIdx += 1;
          return para;
        }
        const hit = kws.some((k) => k.length >= 2 && para.includes(k));
        if (hit && (brand.length < 2 || para.includes(brand))) {
          paraIdx += 1;
          return para;
        }
        const woven = weaveParagraphDominance(
          para,
          kws,
          brand,
          region,
          shortAnchor,
          facet,
          regionBit
        );
        paraIdx += 1;
        return woven.length > 24 ? woven : para;
      });
      return { ...sec, body: patched.join("\n\n").trim() };
    });
    if (conclusion && !kws.some((k) => String(conclusion).includes(k))) {
      conclusion = `${regionBit}${brand} ${shortAnchor} — ${conclusion}`
        .replace(/\s+/g, " ")
        .trim();
    }
    if (scoreInputTopicDominance(getBlogFullText({ ...pack, sections, conclusion }), fullCtx, "blog").ok) {
      break;
    }
  }

  return {
    ...pack,
    sections,
    conclusion,
    _meta: {
      ...(pack._meta || {}),
      topicDominanceWoven: true,
    },
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
