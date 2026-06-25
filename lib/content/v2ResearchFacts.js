/** V2 조사 정보량·본문 근거 비율 */
import { isPromptOnlyResearchFactText } from "@/lib/content/displayBodyGuards";
import { isPollutedResearchFactText } from "@/lib/content/researchFactSanitize";

export const V2_MIN_RESEARCH_FACTS = 20;
export const V2_MIN_GROUNDING_RATIO = 0.7;

function pushFact(bucket, axis, text, source = "research", input = {}) {
  const t = String(text || "").trim();
  if (t.length < 4) return;
  if (isPromptOnlyResearchFactText(t, source)) return;
  if (isPollutedResearchFactText(t, input, source)) return;
  bucket.push({ axis: axis || "mixed", fact: t, source });
}

function flattenStrings(val) {
  if (!val) return [];
  if (typeof val === "string") return [val];
  if (Array.isArray(val)) return val.map(String).filter((s) => s.trim().length >= 4);
  return [];
}

/**
 * 브랜드·지역·주제 축 조사 항목 통합 (중복 제거)
 */
export function collectResearchFacts(research, input = {}, brandResearch = null) {
  const facts = [];
  const v2 = research?.v2Axis || {};

  const rawFacts = research?.researchFacts || v2.researchFacts || [];
  for (const item of rawFacts) {
    if (typeof item === "string") pushFact(facts, "mixed", item, "research", input);
    else if (item && typeof item === "object") {
      pushFact(
        facts,
        item.axis || "mixed",
        item.fact || item.text || item.value,
        item.source || "research",
        input
      );
    }
  }

  const brandBlock = v2.brandAnalysis || {};
  flattenStrings(brandBlock.features).forEach((t) => pushFact(facts, "brand", t, "research", input));
  flattenStrings(brandBlock.lineup).forEach((t) => pushFact(facts, "brand", t, "research", input));
  flattenStrings(brandBlock.strengths).forEach((t) => pushFact(facts, "brand", t, "research", input));
  if (brandBlock.position) pushFact(facts, "brand", brandBlock.position, "research", input);

  const regionBlock = v2.regionAnalysis || {};
  flattenStrings(regionBlock.lifeArea).forEach((t) => pushFact(facts, "region", t, "research", input));
  flattenStrings(regionBlock.searchIntents).forEach((t) =>
    pushFact(facts, "region", t, "research", input)
  );
  if (regionBlock.regionName) pushFact(facts, "region", regionBlock.regionName, "research", input);

  const topicBlock = v2.topicAnalysis || {};
  flattenStrings(topicBlock.features).forEach((t) => pushFact(facts, "topic", t, "research", input));
  flattenStrings(topicBlock.specs).forEach((t) => pushFact(facts, "topic", t, "research", input));
  flattenStrings(topicBlock.differentiators).forEach((t) =>
    pushFact(facts, "topic", t, "research", input)
  );
  if (topicBlock.productName) pushFact(facts, "topic", topicBlock.productName, "research", input);

  for (const ins of research?.channelInsights || []) {
    if (ins?.finding) pushFact(facts, "topic", ins.finding, "research", input);
  }

  const summary = brandResearch?.summary;
  if (summary) {
    flattenStrings(summary.coreStrengths).forEach((t) =>
      pushFact(facts, "brand", t, "brand_engine", input)
    );
    if (summary.uniqueness) pushFact(facts, "brand", summary.uniqueness, "brand_engine", input);
    if (summary.operationStyle) {
      pushFact(facts, "brand", summary.operationStyle, "brand_engine", input);
    }
    flattenStrings(summary.regionalTraits).forEach((t) =>
      pushFact(facts, "region", t, "brand_engine", input)
    );
  }

  const seen = new Set();
  return facts.filter((f) => {
    const key = f.fact.slice(0, 100).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function countResearchFacts(research, input, brandResearch) {
  return collectResearchFacts(research, input, brandResearch).length;
}

export function formatResearchFactsForPrompt(facts, limit = 28) {
  const list = (facts || []).slice(0, limit);
  if (!list.length) {
    return "(직접 팩트는 적음 — 브랜드·지역·업종 맥락과 독자 질문으로 전개. 미확인 사실 단정 금지)";
  }
  return list
    .map((f, i) => `${i + 1}. [${f.axis}] ${f.fact}`)
    .join("\n");
}

export function factTextsFromList(facts) {
  return (facts || []).map((f) => (typeof f === "string" ? f : f.fact)).filter(Boolean);
}
