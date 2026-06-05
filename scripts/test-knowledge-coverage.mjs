/**
 * Knowledge Coverage Engine — 15+ areas, no numbered duplicate headings
 */
import {
  buildKnowledgeCoverageMap,
  MIN_COVERAGE_AREAS,
  buildCoverageAreaBody,
} from "../lib/content/knowledgeCoverageEngine.js";
import { expandPackByInformation } from "../lib/content/informationExpansionEngine.js";
import {
  detectCoverageGateFailures,
  enforceKnowledgeCoverageRules,
} from "../lib/content/knowledgeCoverageGate.js";
import { isSubstantiveSectionBody } from "../lib/content/sectionWriterBodies.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { normalizeBlogLengthAndStructure } from "../lib/content/blogLengthControl.js";
import { assertBlogLengthTier } from "../lib/content/blogLengthDelivery.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";
import { expandSubstantiveBlogPack } from "../lib/qa/substantiveBlogStarter.js";

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 특별할인",
  industry: "가구/침대",
  blogLengthTier: "medium",
};

const map = buildKnowledgeCoverageMap(input);
if (map.coverageCount < MIN_COVERAGE_AREAS) {
  console.error("FAIL: coverage areas", map.coverageCount, "<", MIN_COVERAGE_AREAS);
  process.exit(1);
}

const requiredLabels = ["라인업", "할인", "설치", "체험", "FAQ", "비교"];
for (const label of requiredLabels) {
  if (!map.areas.some((a) => a.label.includes(label) || a.headingSuffix.includes(label))) {
    console.error("FAIL: missing coverage label", label);
    process.exit(1);
  }
}

for (const area of map.areas.slice(0, 5)) {
  const body = buildCoverageAreaBody(area, input);
  if (!isSubstantiveSectionBody(body)) {
    console.error("FAIL: thin body for", area.label);
    process.exit(1);
  }
}

const badPack = {
  title: "테스트",
  sections: [
    {
      heading: "평택 템퍼 — 선택 기준",
      body: "짧음.",
    },
    {
      heading: "평택 템퍼 — 선택 기준 (2)",
      body: "동일한 선택 기준을 다시 설명합니다. 방문해 보세요. 방문해 보세요.",
    },
    {
      heading: "평택 템퍼 — 선택 기준 (3)",
      body: "또 같은 내용입니다. 확인해 보세요. 확인해 보세요.",
    },
  ],
};

const gate = detectCoverageGateFailures(badPack, { ...input, knowledgeCoverage: map });
if (gate.ok) {
  console.error("FAIL: gate should fail on numbered duplicates");
  process.exit(1);
}
if (!gate.failures.some((f) => f.type === "numbered_duplicate_heading")) {
  console.error("FAIL: expected numbered_duplicate_heading failure");
  process.exit(1);
}

const ctx = { brandName: "템퍼", region: "평택", industryKey: "furniture" };
let pack = expandSubstantiveBlogPack(
  input,
  ctx,
  { ...input, knowledgeCoverage: map },
  { minChars: 2800, channel: "blog" }
);
pack = enforceKnowledgeCoverageRules(pack, { ...input, knowledgeCoverage: map });
const normalized = normalizeBlogLengthAndStructure(pack, ctx, { ...input, knowledgeCoverage: map });
pack = normalized.pack;

const tier = resolveBlogLengthTier("medium");
const chars = countBlogBodyCharsWithSpaces(pack);
if (!assertBlogLengthTier(input, pack).ok || chars < tier.min) {
  console.error("FAIL: medium tier min not met", chars, "<", tier.min);
  process.exit(1);
}

const headings = (pack.sections || []).map((s) => s.heading);
const numbered = headings.filter((h) => /\(\d+\)\s*$/.test(h));
if (numbered.length > 0) {
  console.error("FAIL: numbered headings in output:", numbered);
  process.exit(1);
}

const thin = (pack.sections || []).filter((s) => !isSubstantiveSectionBody(s.body));
if (thin.length > 0) {
  console.error("FAIL: thin sections:", thin.map((s) => s.heading));
  process.exit(1);
}

const full = getChannelFullText(pack, "blog");
console.log(
  "OK: areas=",
  map.coverageCount,
  "sections=",
  pack.sections.length,
  "chars=",
  chars,
  "gate_failures_blocked=",
  gate.failures.length
);
