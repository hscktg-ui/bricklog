/**
 * Information Unit Engine — 20~50 units, no verbatim topic
 */
import { prepareBriclogPreWriteContext } from "../lib/content/briclogPreWriteContext.js";
import {
  decomposeTopicToInformationUnits,
  detectVerbatimTopicUsage,
  sanitizeVerbatimTopicInPack,
  MIN_INFORMATION_UNITS,
  MAX_INFORMATION_UNITS,
} from "../lib/content/informationUnitEngine.js";
import { applyEditorQualityPack } from "../lib/content/editorQualityEngine.js";
import { expandPackByInformation } from "../lib/content/informationExpansionEngine.js";
import { applyBrandContentEngine } from "../lib/content/brandContentEngine.js";
import { normalizeBlogLengthAndStructure } from "../lib/content/blogLengthControl.js";
import { expandSubstantiveBlogPack } from "../lib/qa/substantiveBlogStarter.js";
import { resolveBlogLengthTier } from "../lib/constants.js";

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드 특별할인",
  industry: "가구/침대",
  blogLengthTier: "medium",
};

const preWrite = prepareBriclogPreWriteContext(input);

if (!preWrite.informationUnits?.meetsMinimum) {
  console.error(
    "FAIL: unit count",
    preWrite.informationUnits?.unitCount,
    "<",
    MIN_INFORMATION_UNITS
  );
  process.exit(1);
}

if (preWrite.informationUnits.unitCount < MIN_INFORMATION_UNITS) {
  console.error("FAIL: below min units");
  process.exit(1);
}

if (preWrite.informationUnits.unitCount > MAX_INFORMATION_UNITS) {
  console.error("FAIL: above max units");
  process.exit(1);
}

if (!preWrite.informationUnitBrief?.includes("그대로 출력 금지")) {
  console.error("FAIL: brief missing verbatim ban");
  process.exit(1);
}

const rawTopic = "모션베드 특별할인";
const ctx = { brandName: "템퍼", region: "평택" };
let pack = expandSubstantiveBlogPack(input, ctx, { ...input, ...preWrite }, {
  minChars: resolveBlogLengthTier("medium").min,
  channel: "blog",
});
pack = applyBrandContentEngine(pack, ctx, input);
pack = applyEditorQualityPack(pack, ctx, input);
pack = normalizeBlogLengthAndStructure(pack, ctx, input).pack;

const verbatim = detectVerbatimTopicUsage(pack, input);
const fullTopicHits = (JSON.stringify(pack).match(/모션베드 특별할인/g) || []).length;

if (fullTopicHits > verbatim.maxAllowed + 2) {
  console.error("FAIL: too many verbatim topic hits", fullTopicHits, verbatim);
  process.exit(1);
}

const decomp = decomposeTopicToInformationUnits({ ...input, ...preWrite });
const uniqueLabels = new Set(decomp.units.map((u) => u.label));
if (uniqueLabels.size < MIN_INFORMATION_UNITS) {
  console.error("FAIL: duplicate unit labels", uniqueLabels.size);
  process.exit(1);
}

console.log(
  "OK: units=",
  preWrite.informationUnits.unitCount,
  "coverage=",
  preWrite.knowledgeCoverage.coverageCount,
  "verbatim_hits=",
  verbatim.count,
  "max=",
  verbatim.maxAllowed,
  "facet=",
  preWrite.informationUnits.topicFacet
);
