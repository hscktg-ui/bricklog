/**
 * BRICLOG Knowledge Expansion Engine — 주제 분해 20~50 · 파이프라인 · 모션베드 facet
 */
import {
  runKnowledgeExpansionPipeline,
  buildTopicKnowledgeFacets,
  assertKnowledgeExpansionReady,
  assessInformationExpansionCapacity,
  KNOWLEDGE_EXPANSION_STAGES,
} from "../lib/content/knowledgeExpansionEngine.js";
import { assertPreWriteVerified } from "../lib/content/v2PipelineGate.js";
import { expandPackByInformation } from "../lib/content/informationExpansionEngine.js";
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import {
  MIN_INFORMATION_UNITS,
  MAX_INFORMATION_UNITS,
  detectVerbatimTopicUsage,
} from "../lib/content/informationUnitEngine.js";
import { expandSubstantiveBlogPack } from "../lib/qa/substantiveBlogStarter.js";
import { applyEditorQualityPack } from "../lib/content/editorQualityEngine.js";
import { applyDuplicateKiller } from "../lib/content/duplicateKillerEngine.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";

const motionInput = {
  brandName: "템퍼",
  brandType: "매장",
  industry: "가구/침대",
  region: "평택",
  topic: "모션베드",
  blogLengthTier: "medium",
  v2PipelineEnforced: true,
  v3EngineEnforced: true,
  researchFacts: [
    { fact: "3월까지 모션베드 행사" },
    { fact: "평택 매장 체험 예약 가능" },
    { fact: "헤드·각도 조절 체험" },
    { fact: "매트리스 교환 주기 안내" },
    { fact: "설치 일정 매장 조율" },
  ],
  researchFactCount: 5,
};

console.log("\n=== KNOWLEDGE EXPANSION ENGINE ===\n");

if (KNOWLEDGE_EXPANSION_STAGES.length !== 6) {
  console.error("FAIL: pipeline stages", KNOWLEDGE_EXPANSION_STAGES);
  process.exit(1);
}

const expansion = runKnowledgeExpansionPipeline(motionInput);
if (!expansion.ready?.ok) {
  console.error("FAIL: expansion not ready", expansion.ready);
  process.exit(1);
}

if (expansion.unitCount < MIN_INFORMATION_UNITS) {
  console.error("FAIL: units", expansion.unitCount, "<", MIN_INFORMATION_UNITS);
  process.exit(1);
}

if (expansion.unitCount > MAX_INFORMATION_UNITS) {
  console.error("FAIL: units over max", expansion.unitCount);
  process.exit(1);
}

const facets = buildTopicKnowledgeFacets(motionInput);
const requiredMotionLabels = [
  "모션베드란",
  "작동방식",
  "장점",
  "단점",
  "무중력 기능",
  "헤드 각도",
  "매트리스 궁합",
  "구매 체크리스트",
];
for (const label of requiredMotionLabels) {
  if (!facets.facets.some((f) => f.label.includes(label.replace("모션베드란", "모션베드")))) {
    console.error("FAIL: missing motion facet", label, facets.facets.map((f) => f.label).slice(0, 12));
    process.exit(1);
  }
}

const preGate = assertPreWriteVerified({
  ...motionInput,
  ...prepareBriclogPreWriteContext(motionInput),
});
if (!preGate.ok) {
  console.error("FAIL: preWrite gate", preGate);
  process.exit(1);
}

const ctx = { brandName: "템퍼", region: "평택", industryKey: "furniture" };
const preWrite = prepareBriclogPreWriteContext(motionInput);
let pack = expandSubstantiveBlogPack(motionInput, ctx, { ...motionInput, ...preWrite }, {
  minChars: 2800,
  channel: "blog",
});
pack = applyEditorQualityPack(pack, ctx, motionInput);
pack = applyDuplicateKiller(pack, { ...ctx, input: motionInput }, "blog");
const chars = countBlogBodyCharsWithSpaces(pack);
const verbatim = detectVerbatimTopicUsage(pack, motionInput);

if (chars < 1800) {
  console.error("FAIL: expanded chars too low", chars);
  process.exit(1);
}

const headings = new Set((pack.sections || []).map((s) => s.heading));
if (headings.size < (pack.sections || []).length) {
  console.error("FAIL: duplicate headings");
  process.exit(1);
}

if (verbatim.openHits > verbatim.maxOpenHits) {
  console.error("FAIL: topic opens every section", verbatim);
  process.exit(1);
}

const thinPack = {
  title: "test",
  sections: [{ heading: "a", body: "짧음" }],
};
const capacity = assessInformationExpansionCapacity(thinPack, motionInput, 2900);
if (!capacity.canExpand && capacity.reason !== "no_new_information") {
  console.error("FAIL: capacity assessment", capacity);
  process.exit(1);
}

console.log("OK: pipeline stages =", KNOWLEDGE_EXPANSION_STAGES.join(" → "));
console.log("OK: units =", expansion.unitCount, "coverage =", expansion.coverageCount);
console.log("OK: search queries =", expansion.searchQueryCount);
console.log("OK: motion facets =", facets.facetCount);
console.log("OK: expanded blog chars =", chars, "sections =", pack.sections?.length);
console.log("OK: verbatim opens =", verbatim.openHits, "/", verbatim.maxOpenHits);
console.log("\nALL KNOWLEDGE EXPANSION CHECKS OK\n");
