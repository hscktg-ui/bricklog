import { findBannedTemplateHits } from "@/lib/content/v2BannedTemplates";
import { getChannelFullText } from "@/lib/content/channelPack";
import {
  V2_MIN_GROUNDING_RATIO,
  V2_MIN_RESEARCH_FACTS,
} from "@/lib/content/v2ResearchFacts";
import { DEPTH_MIN_LEADS_TO_WRITE } from "@/lib/content/researchDepthEngine";
import { scoreResearchGrounding } from "@/lib/content/v2AxisSentencePrune";
import { requiresV2ResearchGate } from "@/lib/content/v2PipelineGate";

export const V2_AXIS_TARGET = 95;
export const V2_AXIS_MIN_MENTIONS = 5;

function countMention(text, token) {
  const t = String(token || "").trim();
  if (t.length < 2) return 0;
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(esc, "gi")) || []).length;
}

function mentionScore(count, min = V2_AXIS_MIN_MENTIONS) {
  if (count >= min) return 100;
  if (count >= min - 2) return 88;
  if (count >= 1) return 65;
  return 35;
}

function extractProductToken(topic, productName) {
  const p = String(productName || topic || "").trim();
  const m = p.match(/([A-Za-z0-9가-힣]{2,24})/);
  return (m ? m[1] : p.split(/\s+/)[0]) || p;
}

function groundingThreshold(depthTier) {
  if (depthTier === "contextual") return 0.35;
  if (depthTier === "expanded") return 0.5;
  return V2_MIN_GROUNDING_RATIO;
}

function axisTarget(depthTier) {
  if (depthTier === "contextual") return 88;
  if (depthTier === "expanded") return 92;
  return V2_AXIS_TARGET;
}

/**
 * 브랜드·지역·주제(제품) 축 + SEO + 팩트·템플릿 검수
 */
export function evaluateV2Axis(pack, ctx = {}, input = {}) {
  const channel = input.contentChannel || ctx.contentChannel || "blog";
  const full = getChannelFullText(pack, channel);
  const depthTier =
    input.researchDepthTier || ctx.researchDepthTier || "direct";
  const target = axisTarget(depthTier);
  const minGrounding = groundingThreshold(depthTier);
  const thinResearch =
    depthTier === "contextual" || depthTier === "expanded";

  const brand = String(ctx.brandName || input.brandName || "").trim();
  const region = String(ctx.region || input.region || "").trim();
  const topic = String(ctx.topic || ctx.writingSubject || input.topic || "").trim();
  const productToken = extractProductToken(
    topic,
    ctx.v2ProductName || input.v2ProductName
  );

  const brandCount = countMention(full, brand);
  const regionCount = countMention(full, region);
  const productCount = countMention(full, productToken);

  const banned = findBannedTemplateHits(full);

  const title = String(
    pack.representativeTitle ||
      pack.title ||
      pack.titles?.[0] ||
      pack.hook ||
      ""
  );
  const firstBody =
    channel === "blog"
      ? String(pack.sections?.[0]?.body || "")
      : String(pack.shortNotice || pack.body || pack.lineBreakBody || "").slice(
          0,
          400
        );
  const headings =
    channel === "blog"
      ? (pack.sections || []).map((s) => s.title).join(" ")
      : [pack.title, pack.hook].filter(Boolean).join(" ");
  const lastBody =
    channel === "blog"
      ? String(pack.sections?.[pack.sections.length - 1]?.body || "")
      : String(pack.detailBody || pack.ending || pack.body || "").slice(-400);

  const hasIn = (needle) =>
    needle.length >= 2 && (title.includes(needle) || firstBody.includes(needle));

  const seoChecks = {
    titleBrand: !brand || hasIn(brand),
    titleRegion: !region || hasIn(region),
    titleProduct: !productToken || hasIn(productToken),
    headingMix:
      (!brand || headings.includes(brand)) &&
      (!region || headings.includes(region)),
    closing:
      (!brand || lastBody.includes(brand)) &&
      (!region || lastBody.includes(region)),
  };
  const seoHits = Object.values(seoChecks).filter(Boolean).length;
  const seoTotal = Object.keys(seoChecks).length || 1;
  const seoScore = Math.round((seoHits / seoTotal) * 100);

  const brandScore = mentionScore(brandCount);
  const regionScore = mentionScore(regionCount);
  const productScore = mentionScore(productCount);
  const factScore =
    input.v2AxisVerified !== false && ctx.v2AxisVerified !== false ? 95 : 70;
  const templateScore = banned.length ? 0 : 100;

  const researchFacts =
    input.researchFacts || ctx.researchFacts || ctx.input?.researchFacts || [];
  const factCount =
    input.researchFactCount ??
    ctx.researchFactCount ??
    researchFacts.length ??
    0;
  const grounding = scoreResearchGrounding(full, ctx, researchFacts);
  const groundingScore = Math.round((grounding.ratio || 0) * 100);
  const researchVolumeScore =
    factCount >= V2_MIN_RESEARCH_FACTS
      ? 100
      : Math.max(40, Math.round((factCount / V2_MIN_RESEARCH_FACTS) * 100));

  const total = Math.round(
    brandScore * 0.18 +
      regionScore * 0.18 +
      productScore * 0.18 +
      seoScore * 0.14 +
      factScore * 0.08 +
      templateScore * 0.06 +
      groundingScore * 0.1 +
      researchVolumeScore * 0.08
  );

  const failReasons = [];
  if (requiresV2ResearchGate(input) && !input.v2PreWriteVerified) {
    failReasons.push("v2axis_no_research");
  }
  if (
    !thinResearch &&
    factCount < V2_MIN_RESEARCH_FACTS &&
    factCount < DEPTH_MIN_LEADS_TO_WRITE
  ) {
    failReasons.push("v2axis_insufficient_facts");
  }
  if (grounding.ratio < minGrounding && factCount >= 1) {
    failReasons.push("v2axis_low_research_grounding");
  }
  if ((input.v2OffAxisRemoved || 0) > 0) {
    failReasons.push("v2axis_off_axis_sentences");
  }
  if (brand && brandCount < V2_AXIS_MIN_MENTIONS) {
    failReasons.push("v2axis_brand_mentions");
  }
  if (region && regionCount < V2_AXIS_MIN_MENTIONS) {
    failReasons.push("v2axis_region_mentions");
  }
  if (productToken && productCount < V2_AXIS_MIN_MENTIONS) {
    failReasons.push("v2axis_product_mentions");
  }
  if (seoScore < 85) failReasons.push("v2axis_seo_weak");
  if (banned.length) failReasons.push("v2axis_banned_template");
  if (total < target) failReasons.push("v2axis_below_95");

  const ok =
    total >= target &&
    !banned.length &&
    !(input.v2OffAxisRemoved > 0) &&
    !failReasons.includes("v2axis_insufficient_facts") &&
    (thinResearch ||
      !failReasons.includes("v2axis_low_research_grounding"));

  return {
    total,
    ok,
    pass: total >= target,
    target,
    depthTier,
    failReasons: [...new Set(failReasons)],
    scores: {
      brand: brandScore,
      region: regionScore,
      product: productScore,
      seo: seoScore,
      fact: factScore,
      template: templateScore,
      grounding: groundingScore,
      researchVolume: researchVolumeScore,
    },
    grounding,
    factCount,
    counts: { brand: brandCount, region: regionCount, product: productCount },
    productToken,
    bannedHits: banned,
    seoChecks,
  };
}

export function needsV2AxisRegen(v2Axis) {
  if (!v2Axis) return false;
  const target = v2Axis.target ?? V2_AXIS_TARGET;
  return v2Axis.total < target || (v2Axis.failReasons?.length ?? 0) > 0;
}

export function buildV2AxisRegenNote(v2Axis) {
  if (!v2Axis) return "";
  const parts = [];
  if (v2Axis.counts?.brand < V2_AXIS_MIN_MENTIONS) {
    parts.push(`브랜드명을 본문·소제목에 자연스럽게 ${V2_AXIS_MIN_MENTIONS}회 이상`);
  }
  if (v2Axis.counts?.region < V2_AXIS_MIN_MENTIONS) {
    parts.push(`지역명을 ${V2_AXIS_MIN_MENTIONS}회 이상 (키워드 도배 금지)`);
  }
  if (v2Axis.counts?.product < V2_AXIS_MIN_MENTIONS) {
    parts.push(`제품·주제 키워드「${v2Axis.productToken}」${V2_AXIS_MIN_MENTIONS}회 이상`);
  }
  if (v2Axis.bannedHits?.length) {
    parts.push("꽃집·카페·기념일 등 이전 업종 템플릿 문구 제거");
  }
  if (!v2Axis.seoChecks?.titleBrand) parts.push("제목·첫 문단에 브랜드 반영");
  if (!v2Axis.seoChecks?.titleRegion) parts.push("제목·첫 문단에 지역 반영");
  if (v2Axis.depthTier === "contextual" || v2Axis.depthTier === "expanded") {
    parts.push(
      "확인된 실마리만 단정하고, 부족한 부분은 브랜드·지역·독자 질문으로 자연스럽게 전개"
    );
  } else if (v2Axis.grounding?.ratio < V2_MIN_GROUNDING_RATIO) {
    parts.push(
      "조사에서 확인된 브랜드·지역·주제 내용을 중심으로 재작성 (일반론·추측 제거)"
    );
  }
  if (v2Axis.failReasons?.includes("v2axis_off_axis_sentences")) {
    parts.push("브랜드·지역·주제와 무관한 문장·타 업종 템플릿 제거 후 재작성");
  }
  return parts.join(". ");
}
