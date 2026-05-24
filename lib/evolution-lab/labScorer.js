import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { BLOG_MIN_BODY_CHARS } from "@/lib/constants";
import { runV4CoreAudit } from "@/lib/quality/v4ContentAudit";
import { computeFinalQualityScore } from "@/lib/pipeline/v2/finalQualityScore";
import { loadRuleSet } from "@/lib/evolution-lab/rulesStore";
import { detectAiSmells } from "@/lib/evolution-lab/aiSmellTracker";
import { NAVER_CATEGORY_BASELINES } from "@/lib/evolution-lab/naverTrendBaselines";

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function scoreDimension(id, value) {
  return { id, score: clamp(Math.round(value)) };
}

/**
 * 12차원 품질 평가 → 총점 (목표 90+)
 */
export function scoreEvolutionBlog(pack, ctx = {}, trendCtx = {}) {
  if (!pack?.sections?.length) {
    return {
      total: 0,
      dimensions: [],
      blockers: ["empty"],
      pass: false,
    };
  }

  const rules = loadRuleSet("quality_rules.json");
  const w = rules.weights || {};
  const text = getBlogFullText(pack);
  const core = runV4CoreAudit(pack, ctx);
  const quality = computeFinalQualityScore(pack, ctx);
  const smells = detectAiSmells(pack, ctx);
  const baseline =
    NAVER_CATEGORY_BASELINES[ctx.industry] ||
    NAVER_CATEGORY_BASELINES[ctx.industryLabel] ||
    null;

  const charCount = countBlogBodyChars(pack);
  const blockers = [...new Set([...core.blockers, ...smells])];
  if (charCount < BLOG_MIN_BODY_CHARS) blockers.push("length");

  const topicFit = baseline
    ? 75 + (text.includes(ctx.brandName || "") ? 15 : 0)
    : quality.total * 0.85;
  const searchIntent = core.searchIntentScore;
  const personaConsistency = core.blockers.includes("personaConsistent")
    ? 55
    : 88;
  const emotionTone = core.humanityScore;
  const brandFeatures = core.blockers.includes("brand_feature")
    ? 60
    : 85;
  const factualCaution = core.blockers.includes("sensitive")
    ? 70
    : 90;
  const scenePresence = core.blockers.includes("scene")
    ? 55
    : 88;
  const aiSmell = smells.includes("ai_cliche") || smells.includes("placeholder")
    ? 50
    : 92;
  const repetition = smells.includes("repetition") ? 45 : 90;
  const readability = quality.breakdown?.readability ?? 80;
  const dwellTime = baseline?.paragraphLength ? 82 : 75;
  const clickIntent = searchIntent >= 50 ? 80 : 60;

  const dimensions = [
    scoreDimension("topicFit", topicFit),
    scoreDimension("searchIntent", searchIntent),
    scoreDimension("personaConsistency", personaConsistency),
    scoreDimension("emotionTone", emotionTone),
    scoreDimension("brandFeatures", brandFeatures),
    scoreDimension("factualCaution", factualCaution),
    scoreDimension("scenePresence", scenePresence),
    scoreDimension("aiSmell", aiSmell),
    scoreDimension("repetition", repetition),
    scoreDimension("readability", readability),
    scoreDimension("dwellTime", dwellTime),
    scoreDimension("clickIntent", clickIntent),
  ];

  const weightSum =
    Object.values(w).reduce((a, b) => a + b, 0) || 100;
  let weighted = 0;
  const dimMap = Object.fromEntries(dimensions.map((d) => [d.id, d.score]));
  for (const [key, weight] of Object.entries(w)) {
    const dimKey =
      key === "aiSmell"
        ? "aiSmell"
        : key === "searchIntent"
          ? "searchIntent"
          : key;
    weighted += (dimMap[dimKey] ?? quality.total) * (weight / weightSum);
  }

  let total = Math.round(
    (weighted + quality.total + core.humanityScore) / 3
  );
  if (charCount < BLOG_MIN_BODY_CHARS) total = Math.min(total, 78);
  if (smells.includes("placeholder")) total = Math.min(total, 70);

  const minTotal = rules.minTotalScore ?? 90;
  return {
    total,
    dimensions,
    blockers,
    smells,
    pass: total >= minTotal && !blockers.includes("placeholder"),
    qualityBreakdown: quality.breakdown,
    trendApplied: !!trendCtx.category,
  };
}
