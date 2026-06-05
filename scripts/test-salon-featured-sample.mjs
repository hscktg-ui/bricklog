/**
 * 미용실 카테고리 — featured 샘플·업종 오염 검사
 */
import assert from "node:assert/strict";
import { FEATURED_SAMPLE_SEEDS } from "@/lib/landing/featuredSampleSeeds.js";
import { LANDING_SAMPLE_SETS } from "@/lib/landing/sampleContent.js";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils.js";
import { detectIndustryCrossContamination } from "@/lib/pipeline/v2/industryLock.js";
import { scoreHumanEditorGuard } from "@/lib/content/humanEditorGuardPass.js";

process.env.BRICLOG_MISSION = "true";

const seed = FEATURED_SAMPLE_SEEDS.find((s) => s.id === "salon_scalp_dye");
assert.ok(seed, "salon featured seed");

const sample = LANDING_SAMPLE_SETS.find((s) => s.id === "salon_scalp_dye");
assert.ok(sample, "landing sample");
const pack = {
  title: sample.blog.title,
  sections: sample.blog.sections,
  conclusion: sample.blog.conclusion,
};
const full = [
  sample.blog.title,
  ...sample.blog.sections.map((s) => `${s.heading}\n${s.body}`),
  sample.blog.conclusion,
]
  .filter(Boolean)
  .join("\n\n");
const chars = countBlogBodyCharsWithSpaces(pack);

assert.ok(chars >= 1400, `body length ${chars}`);
assert.ok(!/보컬|레슨룸|모션베드|꽃다발|베스트슬립/.test(full), "cross industry leak");
assert.ok(/두피|염색|디자이너/.test(full), "salon field smell");

const cross = detectIndustryCrossContamination(full, "salon");
assert.ok(cross.ok, cross.violations);

const guard = scoreHumanEditorGuard(full, {
  brandName: seed.name,
  region: seed.region,
  topic: seed.topic,
  industry: "미용실",
});
assert.ok(guard.checks?.esseoCount <= 6, "esseo count", guard.checks);
assert.ok(!/비교할\s*때\s*가격·조건·이용\s*절차/.test(full), "checklist cliché");

assert.ok(LANDING_SAMPLE_SETS.some((s) => s.id === "salon_scalp_dye"), "landing rotation");

console.log("OK: salon featured blog sample");
console.log("  title:", seed.blogTitle);
console.log("  chars:", chars);
console.log("  guard:", guard.score);
