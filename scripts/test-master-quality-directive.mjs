import {
  MASTER_QUALITY_DIRECTIVE_VERSION,
  CONTENT_PIPELINE_ORDER,
  INFORMATION_UNIT_RANGE,
  BLOG_LENGTH_TIERS,
  MASTER_FINAL_REVIEW,
  HUMAN_DUPLICATE_POLICY,
  STRUCTURE_DUPLICATE_POLICY,
  buildMasterQualityPromptBlock,
  requiresMasterQualityPipeline,
} from "../lib/product/masterQualityDirective.js";
import { KNOWLEDGE_EXPANSION_STAGES } from "../lib/content/knowledgeExpansionEngine.js";
import { MASTER_QUALITY_GUARD_BRIEF } from "../lib/product/briclogUltimateV20.js";
import { PIPELINE_QUALITY_DEFAULTS } from "../lib/quality/qualityDefaults.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

console.log("\n=== BRICLOG ULTIMATE CONTENT ENGINE V20 ===\n");

assert(MASTER_QUALITY_DIRECTIVE_VERSION === "v20", "version v20");
assert(CONTENT_PIPELINE_ORDER.length === 6, "pipeline 6 stages");
assert(
  CONTENT_PIPELINE_ORDER.every((s, i) => s === KNOWLEDGE_EXPANSION_STAGES[i]),
  "pipeline aligns with knowledge expansion stages"
);
assert(INFORMATION_UNIT_RANGE.min === 20 && INFORMATION_UNIT_RANGE.max === 50, "20~50 units");
assert(BLOG_LENGTH_TIERS.short.min === 1800, "short min");
assert(BLOG_LENGTH_TIERS.medium.min === 2800, "medium min");
assert(BLOG_LENGTH_TIERS.long.max === 5000, "long max");
assert(MASTER_FINAL_REVIEW.length === 6, "final review 6 items");
assert(HUMAN_DUPLICATE_POLICY.similarityPercent === 70, "70% human duplicate");
assert(STRUCTURE_DUPLICATE_POLICY.similarityPercent === 80, "80% structure duplicate");
assert(
  buildMasterQualityPromptBlock("blog").includes("브랜드를 축적하는 AI 콘텐츠 팀"),
  "prompt block v20 positioning"
);
assert(MASTER_QUALITY_GUARD_BRIEF.includes("V20"), "guard brief wired");
assert(
  PIPELINE_QUALITY_DEFAULTS.masterQualityDirective === "v20",
  "quality defaults version"
);
assert(
  requiresMasterQualityPipeline({ v2PipelineEnforced: true }) === true,
  "pipeline required by default flags"
);

console.log("ALL V20 MASTER QUALITY DIRECTIVE TESTS PASSED\n");
