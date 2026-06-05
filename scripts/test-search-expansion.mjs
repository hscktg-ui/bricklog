/**
 * Search Expansion Engine — 템퍼 모션베드 특별할인 시나리오
 */
import {
  buildSearchExpansionPlan,
  extractCoreEntities,
  resolveResearchCategoryKey,
} from "../lib/research/searchExpansionEngine.js";
import {
  buildKnowledgeMap,
  formatKnowledgeMapForPrompt,
} from "../lib/research/knowledgeMapEngine.js";

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 특별할인",
  mainKeyword: "모션베드 특별할인",
  industry: "가구/침대",
};

const plan = buildSearchExpansionPlan(input);
const entities = extractCoreEntities(input);
const category = resolveResearchCategoryKey(input);

if (category !== "furniture") {
  console.error("FAIL: expected furniture category, got", category);
  process.exit(1);
}

if (plan.searchQueries.length < 8) {
  console.error("FAIL: too few expanded queries:", plan.searchQueries.length);
  process.exit(1);
}

const joined = plan.searchQueries.join(" ");
const mustHit = ["모션베드", "할인", "설치", "체험", "비교"];
for (const term of mustHit) {
  const inQueries = joined.includes(term);
  const inBuckets = Object.values(plan.buckets).some((arr) =>
    arr.some((p) => p.includes(term))
  );
  if (!inQueries && !inBuckets) {
    console.error("FAIL: expansion missing axis:", term);
    process.exit(1);
  }
}

const mockResearch = {
  summary: "평택 템퍼 모션베드 행사 맥락",
  researchFacts: [
    { axis: "topic", fact: "모션베드 체험은 매장 예약 후 가능한 경우가 많다." },
    { axis: "region", fact: "평택 생활권에서 매장 방문 동선을 확인한다." },
  ],
  v2Axis: {
    topicAnalysis: { features: ["헤드 각도", "다리 올리기"] },
    brandAnalysis: { lineup: ["Ergo", "프로스마트"] },
  },
};

const map = buildKnowledgeMap({ expansion: plan, research: mockResearch, brandContext: input });
const prompt = formatKnowledgeMapForPrompt(map);

if (!prompt.includes("KNOWLEDGE MAP")) {
  console.error("FAIL: knowledge map prompt missing header");
  process.exit(1);
}
if (!prompt.includes("구매 포인트") || !prompt.includes("비교")) {
  console.error("FAIL: knowledge map missing sections");
  process.exit(1);
}

console.log("OK: category=", category);
console.log("OK: queries=", plan.searchQueries.length);
console.log("OK: buckets=", Object.keys(plan.buckets).join(", "));
console.log("OK: entities=", entities.brand, entities.topic);
console.log("OK: map sections — purchase", map.purchasePoints.length, "compare", map.comparisonPoints.length);
