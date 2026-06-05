import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";
import { buildDefaultResearchQuery } from "@/lib/research/needsOnlineResearch";
import {
  collectResearchFacts,
  formatResearchFactsForPrompt,
} from "@/lib/content/v2ResearchFacts";
import { isAntiSeoSpamEnforced } from "@/lib/product/antiSeoSpamEngine";
import {
  assessResearchDepth,
  buildDepthWritingBrief,
  formatDepthFactsPrompt,
  augmentFactsFromLocalContext,
} from "@/lib/content/researchDepthEngine";

export function buildV2AxisResearchQuery(input) {
  return buildDefaultResearchQuery(input);
}

export function buildBrandAxisBrief(input, brandResearch) {
  const brand = String(input.brandName || "").trim();
  const summary = brandResearch?.summary || {};
  const lines = [
    "【V2 · 브랜드 분석】",
    `브랜드: ${brand || "(미입력)"}`,
    summary.coreStrengths?.length
      ? `강점: ${summary.coreStrengths.join(" · ")}`
      : null,
    summary.uniqueness ? `포지션: ${summary.uniqueness}` : null,
    summary.operationStyle ? `운영: ${summary.operationStyle}` : null,
    brandResearch?.sourceStatus
      ? `조사 근거: ${brandResearch.sourceStatus}`
      : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export function buildRegionAxisBrief(input) {
  const region = String(input.region || "").trim();
  const hints = buildRegionKeywordHints(input);
  const lines = [
    "【V2 · 지역 분석】",
    `지역: ${region || "(미입력)"}`,
    hints.length ? `지역·생활권 키워드: ${hints.join(", ")}` : null,
    "검색 의도: 지역명 + 업종·브랜드 조합으로 방문·비교·매장 찾기",
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * @param {import('@/lib/research/types').ResearchResult|null} research
 * @param {Record<string, unknown>} input
 * @param {object|null} brandResearch
 * @param {{ facts?: object[], depth?: object }} [depthCtx]
 */
export function parseV2AxisResearch(
  research,
  input,
  brandResearch = null,
  depthCtx = {}
) {
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();

  let facts =
    depthCtx.facts ||
    augmentFactsFromLocalContext(
      collectResearchFacts(research, input, brandResearch),
      input,
      brandResearch
    );
  const factCount = facts.length;

  const depth =
    depthCtx.depth || assessResearchDepth(factCount, input);

  const v2 = research?.v2Axis || {};
  const topicBlock = v2.topicAnalysis || {};
  const fact = v2.factVerification || {};

  const productName =
    String(topicBlock.productName || topicBlock.product || "").trim() || topic;

  const hasSummary = Boolean(String(research?.summary || "").trim());
  const hasAxes = Boolean(brand && region && topic);
  const canWrite = hasAxes && depth.canWrite;

  const gaps = [
    ...(Array.isArray(fact.gaps) ? fact.gaps : []),
    ...(Array.isArray(v2.gaps) ? v2.gaps : []),
  ]
    .map(String)
    .filter(Boolean);

  const factsBlock = formatDepthFactsPrompt(facts, depth, input);
  const depthBrief = buildDepthWritingBrief(depth, input);

  const briefParts = [
    depthBrief,
    "【조사 실마리】 확인된 내용만 단정, 미확인은 독자 질문으로 전개",
    factsBlock,
    research?.summary ? `【조사 요약】\n${research.summary}` : null,
    v2.brandAnalysis
      ? `【브랜드】\n${formatBlock(v2.brandAnalysis)}`
      : null,
    v2.regionAnalysis
      ? `【지역】\n${formatBlock(v2.regionAnalysis)}`
      : null,
    topicBlock && Object.keys(topicBlock).length
      ? `【주제·제품】\n${formatBlock(topicBlock)}`
      : null,
    fact.pass1 || fact.pass2
      ? `【팩트 검증】\n1차: ${fact.pass1 || "-"}\n2차: ${fact.pass2 || fact.note || "-"}`
      : null,
    gaps.length ? `【미확인·단정 금지】 ${gaps.join(" · ")}` : null,
    isAntiSeoSpamEnforced()
      ? `【문맥 반영】 브랜드「${brand}」·지역「${region}」·주제「${topic}」·제품「${productName}」 — 필요한 위치에만, 동일 키워드 3회 초과 반복 금지.`
      : `【필수 반영】 브랜드「${brand}」·지역「${region}」·주제「${topic}」·제품「${productName}」 각 5회 이상 자연스럽게.`,
    "확인되지 않은 스펙·가격·효과·출시일은 추측하지 말 것.",
  ].filter(Boolean);

  return {
    ok: canWrite,
    insufficient: !canWrite,
    verified: canWrite,
    productName,
    brand,
    region,
    topic,
    gaps,
    brief: briefParts.join("\n\n").slice(0, 3800),
    userMessage: null,
    facts,
    factCount,
    factsPrompt: factsBlock,
    researchDepth: depth,
    depthTier: depth.tier,
  };
}

function formatBlock(obj) {
  if (typeof obj === "string") return obj;
  return Object.entries(obj || {})
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${v.join(", ")}`;
      return `${k}: ${v}`;
    })
    .join("\n");
}
