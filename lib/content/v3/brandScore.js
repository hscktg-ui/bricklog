import { getBlogFullText } from "@/utils/qualityCheck";
import { evaluateV2Axis } from "@/lib/quality/v2AxisQuality";
import { findIndustryDriftHits, findAiContaminationHits } from "@/lib/content/v3/industryPurge";
import { V3_TARGET_SCORE } from "@/lib/content/v3/constants";

function countMention(text, token) {
  const t = String(token || "").trim();
  if (t.length < 2) return 0;
  const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (text.match(new RegExp(esc, "gi")) || []).length;
}

/**
 * V3 11·12단계 — 브랜드 점수 + 독자 기억 검수
 */
export function evaluateV3BrandScore(pack, ctx = {}, input = {}) {
  const full = getBlogFullText(pack);
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const region = String(ctx.region || input.region || "").trim();
  const product = String(
    ctx.v2ProductName || input.v2ProductName || input.topic || ""
  ).trim();
  const productToken =
    product.match(/([A-Za-z0-9가-힣]{2,20})/)?.[1] || product.split(/\s+/)[0];

  const v2Axis = evaluateV2Axis(pack, ctx, input);
  const brandCount = countMention(full, brand);
  const regionCount = countMention(full, region);
  const productCount = countMention(full, productToken);

  const brandScore = Math.min(100, brandCount >= 5 ? 100 : brandCount * 18);
  const regionScore = Math.min(100, regionCount >= 5 ? 100 : regionCount * 18);
  const topicScore = Math.min(100, productCount >= 5 ? 100 : productCount * 18);
  const infoScore = Math.min(
    100,
    (input.researchFactCount ?? 0) >= 20 ? 95 : 50
  );
  const seoScore = v2Axis.scores?.seo ?? 80;
  const trustScore =
    input.v3FactCheck?.pass !== false ? 92 : 55;

  const title = String(pack.representativeTitle || pack.title || "");
  const closing = String(
    pack.conclusion ||
      pack.sections?.[pack.sections.length - 1]?.body ||
      ""
  ).slice(-400);

  const axesPresent = [
    brand && full.includes(brand),
    region && full.includes(region),
    productToken && full.includes(productToken),
  ].filter(Boolean).length;
  const readerRemembers =
    axesPresent >= 3 &&
    (!brand || title.includes(brand) || closing.includes(brand)) &&
    (!region || title.includes(region) || closing.includes(region) || full.includes(region)) &&
    (!productToken ||
      title.includes(productToken) ||
      closing.includes(productToken) ||
      full.includes(productToken));

  const readerScore = readerRemembers ? 100 : 45;

  const industryHits = findIndustryDriftHits(full);
  const aiHits = findAiContaminationHits(full);
  if (industryHits.length || aiHits.length) {
    // penalize heavily
  }

  let total = Math.round(
    brandScore * 0.18 +
      regionScore * 0.18 +
      topicScore * 0.18 +
      infoScore * 0.14 +
      seoScore * 0.12 +
      trustScore * 0.1 +
      readerScore * 0.1
  );

  if (industryHits.length) total = Math.min(total, 70);
  if (aiHits.length) total = Math.min(total, 75);
  if (!readerRemembers) total = Math.min(total, 88);
  if (!v2Axis.ok) total = Math.min(total, v2Axis.total);

  const failReasons = [];
  if (total < V3_TARGET_SCORE) failReasons.push("v3_below_95");
  if (!readerRemembers) failReasons.push("v3_reader_memory_fail");
  if (industryHits.length) failReasons.push("v3_industry_drift");
  if (aiHits.length) failReasons.push("v3_ai_contamination");
  if (!v2Axis.ok) failReasons.push(...(v2Axis.failReasons || []));

  return {
    total,
    ok:
      total >= V3_TARGET_SCORE &&
      !industryHits.length &&
      !aiHits.length &&
      v2Axis.ok,
    pass: total >= V3_TARGET_SCORE,
    target: V3_TARGET_SCORE,
    failReasons: [...new Set(failReasons)],
    scores: {
      brand: brandScore,
      region: regionScore,
      topic: topicScore,
      informational: infoScore,
      seo: seoScore,
      trust: trustScore,
      readerMemory: readerScore,
    },
    counts: { brand: brandCount, region: regionCount, product: productCount },
    readerRemembers,
    industryHits,
    aiHits,
    v2Axis,
  };
}

export function buildV3RegenNote(score) {
  const parts = [];
  if (!score?.readerRemembers) {
    parts.push(
      "독자가 브랜드·지역·제품을 기억할 수 있게 제목·마무리·본문에 세 축을 분명히"
    );
  }
  if (score?.industryHits?.length) {
    parts.push("꽃집·카페·기념일 등 업종 무관 문장 제거");
  }
  if (score?.aiHits?.length) {
    parts.push("혁신·최고·감동·주말 아침 등 AI 관용구 제거");
  }
  if (score?.total < V3_TARGET_SCORE) {
    parts.push(`V3 브랜드 점수 ${V3_TARGET_SCORE}점 이상`);
  }
  return parts.join(". ");
}

export function needsV3Regen(score) {
  if (!score) return false;
  return !score.ok || (score.failReasons?.length ?? 0) > 0;
}
