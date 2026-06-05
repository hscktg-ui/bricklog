/**
 * BRICLOG 엔진 통합 스모크 — Coverage · Brand · Length · Leak
 */
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import { expandPackByInformation } from "../lib/content/informationExpansionEngine.js";
import {
  applyBrandContentEngine,
  detectBrandContentIssues,
  isMechanicalSectionHeading,
} from "../lib/content/brandContentEngine.js";
import { normalizeBlogLengthAndStructure } from "../lib/content/blogLengthControl.js";
import { sanitizeBlogPackPlannerLeak } from "../lib/content/sectionPlannerSanitize.js";
import { assertV17PreOutput } from "../lib/content/v17ContentGate.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
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

const ctx = { brandName: "템퍼", region: "평택", industryKey: "furniture" };
const preWrite = prepareBriclogPreWriteContext(input);

if (!preWrite.knowledgeCoverage?.meetsMinimum) {
  console.error("FAIL: coverage minimum not met");
  process.exit(1);
}
if (!preWrite.informationUnits?.meetsMinimum) {
  console.error("FAIL: information units minimum not met", preWrite.informationUnits?.unitCount);
  process.exit(1);
}
if (!preWrite.searchExpansion?.searchQueries?.length) {
  console.error("FAIL: search expansion empty");
  process.exit(1);
}
if (!preWrite.customerQuestionBrief?.includes("왜 찾는가")) {
  console.error("FAIL: customer question brief missing from preWrite");
  process.exit(1);
}

const mechanicalHeadings = preWrite.knowledgeCoverage.areas.filter((a, i) =>
  i > 2 && /^평택\s+템퍼\s+모션베드/.test(a.heading)
);
if (mechanicalHeadings.length > 2) {
  console.error(
    "FAIL: too many repetitive coverage headings",
    mechanicalHeadings.slice(0, 3).map((a) => a.heading)
  );
  process.exit(1);
}

let pack = expandSubstantiveBlogPack(input, ctx, { ...input, ...preWrite }, {
  minChars: resolveBlogLengthTier("medium").min,
  channel: "blog",
});

pack = applyBrandContentEngine(pack, ctx, input);
const normalized = normalizeBlogLengthAndStructure(pack, ctx, input);
pack = sanitizeBlogPackPlannerLeak(normalized.pack);
pack = applyBrandContentEngine(pack, ctx, input);

const full = getChannelFullText(pack, "blog");
const leak = /\([a-z]+_x\d+\)|lineup_x|feature_x/i.test(full);
if (leak) {
  console.error("FAIL: planner leak in output");
  process.exit(1);
}

const numbered = (pack.sections || []).filter((s) => /\(\d+\)\s*$/.test(s.heading || ""));
if (numbered.length) {
  console.error("FAIL: numbered headings", numbered.map((s) => s.heading));
  process.exit(1);
}

const mechanicalSections = (pack.sections || []).filter((s) =>
  isMechanicalSectionHeading(s.heading, ctx, input)
);
if (mechanicalSections.length > 2) {
  console.error(
    "FAIL: mechanical section headings remain",
    mechanicalSections.map((s) => s.heading)
  );
  process.exit(1);
}

const brandIssues = detectBrandContentIssues(pack, ctx, input);
if (!brandIssues.ok) {
  console.error("FAIL: brand issues", brandIssues.issues);
  process.exit(1);
}

const v17 = assertV17PreOutput(pack, "blog", { ...ctx, input });
if (!v17.checklist.brand_content_ok) {
  console.error("FAIL: v17 brand_content_ok");
  process.exit(1);
}

const tier = resolveBlogLengthTier("medium");
const chars = countBlogBodyCharsWithSpaces(pack);
if (chars < tier.min) {
  console.error("FAIL: below tier min", chars, "<", tier.min);
  process.exit(1);
}

const sectionCount = (pack.sections || []).length;
if (sectionCount > 14) {
  console.error("FAIL: too many sections", sectionCount);
  process.exit(1);
}

console.log(
  "OK: integrated pipeline sections=",
  sectionCount,
  "chars=",
  chars,
  "coverage=",
  preWrite.knowledgeCoverage.coverageCount,
  "units=",
  preWrite.informationUnits.unitCount,
  "queries=",
  preWrite.searchExpansion.searchQueries.length,
  "title=",
  pack.representativeTitle
);
