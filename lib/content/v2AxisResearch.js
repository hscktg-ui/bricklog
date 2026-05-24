import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";
import { buildDefaultResearchQuery } from "@/lib/research/needsOnlineResearch";
import {
  V2_MIN_RESEARCH_FACTS,
  collectResearchFacts,
  formatResearchFactsForPrompt,
} from "@/lib/content/v2ResearchFacts";

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
 */
export function parseV2AxisResearch(research, input, brandResearch = null) {
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();

  const facts = collectResearchFacts(research, input, brandResearch);
  const factCount = facts.length;

  const v2 = research?.v2Axis || {};
  const topicBlock = v2.topicAnalysis || {};
  const fact = v2.factVerification || {};
  const status = String(v2.researchStatus || research?.mode || "").toLowerCase();

  const productName =
    String(topicBlock.productName || topicBlock.product || "").trim() || topic;
  const verified =
    topicBlock.verified !== false &&
    fact.consistent !== false &&
    status !== "insufficient";

  const gaps = [
    ...(Array.isArray(fact.gaps) ? fact.gaps : []),
    ...(Array.isArray(v2.gaps) ? v2.gaps : []),
  ].map(String).filter(Boolean);

  const insufficient =
    status === "insufficient" ||
    v2.insufficient === true ||
    factCount < V2_MIN_RESEARCH_FACTS ||
    fact.consistent === false ||
    !verified;

  const factsBlock = formatResearchFactsForPrompt(facts);

  const briefParts = [
    `【조사 확정 항목 ${factCount}개 — 본문의 70% 이상은 아래 항목만 근거로 작성】`,
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
    gaps.length ? `【미확인】 ${gaps.join(" · ")}` : null,
    `【필수 반영】 브랜드「${brand}」·지역「${region}」·주제「${topic}」·제품「${productName}」 각 5회 이상 자연스럽게.`,
    "확인되지 않은 스펙·가격·효과는 추측하지 말 것.",
  ].filter(Boolean);

  return {
    ok: !insufficient,
    insufficient,
    verified,
    productName,
    brand,
    region,
    topic,
    gaps,
    brief: briefParts.join("\n\n").slice(0, 3200),
    userMessage: insufficient
      ? factCount < V2_MIN_RESEARCH_FACTS
        ? `조사 정보가 부족합니다(수집 ${factCount}개 / 필요 ${V2_MIN_RESEARCH_FACTS}개 이상). 브랜드·지역·주제를 구체적으로 입력한 뒤 다시 시도해 주세요. 일반론으로 채우지 않습니다.`
        : "조사 데이터가 부족합니다. 브랜드·지역·제품(주제)을 더 구체적으로 입력한 뒤 다시 시도해 주세요. 일반론으로 채우지 않습니다."
      : null,
    facts,
    factCount,
    factsPrompt: factsBlock,
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
