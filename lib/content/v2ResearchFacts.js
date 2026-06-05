/** V2 조사 정보량·본문 근거 비율 */

export const V2_MIN_RESEARCH_FACTS = 20;
export const V2_MIN_GROUNDING_RATIO = 0.7;

function pushFact(bucket, axis, text, source = "research") {
  const t = String(text || "").trim();
  if (t.length < 4) return;
  if (isPromptOnlyResearchFact(t)) return;
  bucket.push({ axis: axis || "mixed", fact: t, source });
}

/** 조사·프롬프트용 — 본문 fact로 쓰이면 안 되는 문장 */
const PROMPT_ONLY_FACT_RES = [
  /지역명은\s*자연스럽게/,
  /동네\s*방문\s*맥락/,
  /고유\s*입력\s*기반/,
  /방문·체험·비교를\s*전제로/,
  /글을\s*읽는\s*경우/,
  /공식·매장\s*안내\s*기준/,
  /안내\s*기준으로\s*확인/,
  /출처·검색·기사/,
  /원문\s*복사\s*금지/,
  /입력\s*우선/,
  /입력된\s*범위\s*안에서/,
  /본문\s*노출\s*금지/,
  /브랜드\s*시선에서\s*정리/,
  /흐름이\s*분명해/,
];

function isPromptOnlyResearchFact(text) {
  return PROMPT_ONLY_FACT_RES.some((re) => re.test(String(text || "").trim()));
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
    if (typeof item === "string") pushFact(facts, "mixed", item);
    else if (item && typeof item === "object") {
      pushFact(facts, item.axis || "mixed", item.fact || item.text || item.value);
    }
  }

  const brandBlock = v2.brandAnalysis || {};
  flattenStrings(brandBlock.features).forEach((t) => pushFact(facts, "brand", t));
  flattenStrings(brandBlock.lineup).forEach((t) => pushFact(facts, "brand", t));
  flattenStrings(brandBlock.strengths).forEach((t) => pushFact(facts, "brand", t));
  if (brandBlock.position) pushFact(facts, "brand", brandBlock.position);

  const regionBlock = v2.regionAnalysis || {};
  flattenStrings(regionBlock.lifeArea).forEach((t) => pushFact(facts, "region", t));
  flattenStrings(regionBlock.searchIntents).forEach((t) =>
    pushFact(facts, "region", t)
  );
  if (regionBlock.regionName) pushFact(facts, "region", regionBlock.regionName);

  const topicBlock = v2.topicAnalysis || {};
  flattenStrings(topicBlock.features).forEach((t) => pushFact(facts, "topic", t));
  flattenStrings(topicBlock.specs).forEach((t) => pushFact(facts, "topic", t));
  flattenStrings(topicBlock.differentiators).forEach((t) =>
    pushFact(facts, "topic", t)
  );
  if (topicBlock.productName) pushFact(facts, "topic", topicBlock.productName);

  for (const ins of research?.channelInsights || []) {
    if (ins?.finding) pushFact(facts, "topic", ins.finding);
  }

  const summary = brandResearch?.summary;
  if (summary) {
    flattenStrings(summary.coreStrengths).forEach((t) =>
      pushFact(facts, "brand", t, "brand_engine")
    );
    if (summary.uniqueness) pushFact(facts, "brand", summary.uniqueness, "brand_engine");
    if (summary.operationStyle) {
      pushFact(facts, "brand", summary.operationStyle, "brand_engine");
    }
    flattenStrings(summary.regionalTraits).forEach((t) =>
      pushFact(facts, "region", t, "brand_engine")
    );
  }

  const regionHints = input.regionKeywordHints || [];
  for (const h of regionHints) {
    pushFact(facts, "region", `${h} 지역 검색·방문 맥락`, "region_hints");
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
