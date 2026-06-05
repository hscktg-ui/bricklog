/**
 * Section Planner 내부 ID가 발행 본문에 노출되지 않는지 검증
 */
import { expandPackByInformation } from "../lib/content/informationExpansionEngine.js";
import { sanitizeBlogPackPlannerLeak } from "../lib/content/sectionPlannerSanitize.js";
import {
  isSubstantiveSectionBody,
  countSubstantiveSentences,
} from "../lib/content/sectionWriterBodies.js";
import { getChannelFullText } from "../lib/content/channelPack.js";
import { normalizeBlogLengthAndStructure } from "../lib/content/blogLengthControl.js";
import { assertBlogLengthTier } from "../lib/content/blogLengthDelivery.js";
import { countBlogBodyCharsWithSpaces } from "../lib/prompts/engine/textUtils.js";
import { resolveBlogLengthTier } from "../lib/constants.js";

const LEAK_RE = /\([a-z][a-z0-9]*_x\d+\)/i;

const ctx = { brandName: "템퍼", region: "평택", industryKey: "furniture" };
const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "매트리스",
  mainKeyword: "평택 템퍼 매트리스",
  blogLengthTier: "medium",
};

const thin = {
  title: "평택 템퍼 매트리스",
  sections: [
    {
      heading: "평택 템퍼 매트리스 — 라인업 (lineup_x0)",
      body: "한 줄.",
    },
  ],
};

let pack = expandPackByInformation(thin, ctx, input, {
  minChars: 2900,
  channel: "blog",
});
const normalized = normalizeBlogLengthAndStructure(pack, ctx, input);
pack = sanitizeBlogPackPlannerLeak(normalized.pack);
const tier = resolveBlogLengthTier("medium");
const chars = countBlogBodyCharsWithSpaces(pack);
const lengthGate = assertBlogLengthTier(input, pack);
if (!lengthGate.ok || !normalized.lengthOk) {
  console.error("FAIL: medium tier length", chars, "expected", tier.min, "-", tier.max);
  process.exit(1);
}
const full = getChannelFullText(pack, "blog");

if (LEAK_RE.test(full)) {
  console.error("FAIL: internal planner id in output:", full.match(LEAK_RE)[0]);
  process.exit(1);
}

const thinSections = (pack.sections || []).filter(
  (s) => !isSubstantiveSectionBody(s.body)
);
if (thinSections.length > 0) {
  console.error(
    "FAIL: thin sections remain:",
    thinSections.map((s) => s.heading)
  );
  process.exit(1);
}

const avgSentences =
  pack.sections.reduce(
    (n, s) => n + countSubstantiveSentences(s.body),
    0
  ) / Math.max(1, pack.sections.length);

if (avgSentences < 3) {
  console.error("FAIL: avg sentences per section too low:", avgSentences);
  process.exit(1);
}

console.log(
  "OK: no planner leak, sections=",
  pack.sections.length,
  "chars=",
  chars,
  "avgBlocks=",
  avgSentences.toFixed(1)
);
