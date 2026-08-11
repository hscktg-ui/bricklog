/**
 * 무편집 발행 A등급 SSOT — 고객 UI에 나가는 블로그는 벤치 85+ · publishOk · 칼럼 송출법 통과
 */
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import {
  assessVisitReviewBenchmark,
  resolveVisitReviewPassMin,
} from "@/lib/product/visitReviewBenchmarkRubric";
import {
  assertColumnistDeliveryLaw,
  buildColumnistWithholdMessage,
} from "@/lib/product/columnistDeliveryLaw";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import { isMissionFallbackPack } from "@/lib/product/briclogWriterEngine";
import { countPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";
import { isBriclogAlwaysDeliverEnabled } from "@/lib/config/masterRebuildFlags";

export const UNEDITED_PUBLISH_GRADE_VERSION = "unedited-publish-a-v2";
export const UNEDITED_PUBLISH_MIN_SCORE = 85;

export const OPENAI_QUOTA_USER_MESSAGE =
  "지금은 AI 생성 요청이 몰려 잠시 쉬어 가고 있어요. 1~2분 후 다시 「조사 후 글 받기」를 눌러 주세요.";

export const OPENAI_RATE_LIMIT_USER_MESSAGE =
  "요청이 많습니다. 잠시 후 다시 「조사 후 글 받기」를 눌러 주세요.";

export const UNEDITED_PUBLISH_WITHHOLD_MESSAGE =
  "아직 무편집 발행 기준(A)에 닿지 않았어요. 현장 포인트 한 줄을 보강하거나 「다시 받기」를 눌러 주세요.";

function resolveMinPublishChars(input = {}) {
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  return Math.max(1200, Math.floor(tier.min * 0.35));
}

export function resolveUneditedPublishMinChars(input = {}) {
  return resolveMinPublishChars(input);
}

/**
 * @param {object} pack
 * @param {object} [input]
 * @param {{ passMin?: number }} [opts]
 */
export function assessUneditedPublishGrade(pack, input = {}, opts = {}) {
  const passMin = opts.passMin ?? resolveVisitReviewPassMin({ passMin: UNEDITED_PUBLISH_MIN_SCORE });

  if (!pack?.sections?.length) {
    return {
      ok: false,
      version: UNEDITED_PUBLISH_GRADE_VERSION,
      grade: "F",
      score: 0,
      publishOk: false,
      reasons: ["empty_pack"],
      userMessage: UNEDITED_PUBLISH_WITHHOLD_MESSAGE,
    };
  }

  const law = assertColumnistDeliveryLaw(pack, input);
  if (law.shouldWithhold) {
    return {
      ok: false,
      version: UNEDITED_PUBLISH_GRADE_VERSION,
      grade: "F",
      score: 0,
      publishOk: false,
      reasons: law.violations?.map((v) => v.type) || [law.reason || "delivery_law"],
      userMessage: buildColumnistWithholdMessage(input),
      law,
    };
  }

  const bench =
    pack._meta?.visitReviewBenchmark?.publishOk != null
      ? pack._meta.visitReviewBenchmark
      : assessVisitReviewBenchmark(pack, input, { passMin });

  const chars = countBlogBodyCharsWithSpaces(pack);
  const minChars = resolveMinPublishChars(input);
  const ph = countPlaceholderContamination(
    pack.sections?.map((s) => s.body).join("\n") || ""
  );

  const reasons = [];
  if (!bench.publishOk) reasons.push("benchmark_not_publish_ok");
  if ((bench.hardFails || []).length) reasons.push(...bench.hardFails);
  if (bench.score < passMin) reasons.push("benchmark_score_below_a");
  if (chars < minChars) reasons.push("length_under_publish_min");
  if (ph.total > 0) reasons.push("placeholder_contamination");
  if (
    hasUsableResearchFacts(input) &&
    isMissionFallbackPack(pack, input) &&
    !pack._meta?.columnistSovereignLlm
  ) {
    reasons.push("mission_template_with_research");
  }

  const grade =
    bench.score >= 90 ? "A" : bench.score >= passMin ? "A-" : bench.grade || "F";
  const ok =
    bench.publishOk === true &&
    bench.score >= passMin &&
    chars >= minChars &&
    ph.total === 0 &&
    !reasons.includes("mission_template_with_research");

  return {
    ok,
    version: UNEDITED_PUBLISH_GRADE_VERSION,
    grade: ok ? grade : bench.grade || "F",
    score: bench.score,
    publishOk: bench.publishOk,
    passMin,
    chars,
    minChars,
    reasons: [...new Set(reasons)],
    userMessage: ok ? null : UNEDITED_PUBLISH_WITHHOLD_MESSAGE,
    benchmark: bench,
    law,
  };
}

export function shouldWithholdUneditedPublish(pack, input = {}, result = {}) {
  if (result.mode === "server_error" || result.mode === "error") {
    return {
      withhold: true,
      reasons: ["server_error"],
      userMessage: UNEDITED_PUBLISH_WITHHOLD_MESSAGE,
    };
  }

  const assessed = assessUneditedPublishGrade(pack, input);
  if (assessed.ok) {
    return { withhold: false, grade: assessed.grade, score: assessed.score };
  }

  const ph = countPlaceholderContamination(
    pack?.sections?.map((s) => s.body).join("\n") || ""
  );
  const salvageMeta =
    pack?._meta?.qualityLeapSalvage === true ||
    pack?._meta?.generationMode === "sovereign_quality_leap" ||
    pack?._meta?.visitReviewBenchmarkOk === true;
  const bodyOk = (pack?.sections?.length || 0) >= 1 && ph.total === 0;
  const softReasons = (assessed.reasons || []).filter(
    (r) => !/placeholder|empty_pack|delivery_law|server_error/.test(r)
  );
  const onlySoftFails =
    softReasons.length === (assessed.reasons || []).length &&
    !(assessed.reasons || []).some((r) =>
      /placeholder|empty_pack|delivery_law/.test(r)
    );

  if (
    isBriclogAlwaysDeliverEnabled() &&
    bodyOk &&
    onlySoftFails &&
    (salvageMeta || assessed.score >= UNEDITED_PUBLISH_MIN_SCORE - 8)
  ) {
    return {
      withhold: false,
      salvageDeliver: true,
      reasons: assessed.reasons,
      grade: assessed.grade || "salvage",
      score: assessed.score,
      userMessage: null,
    };
  }

  return {
    withhold: true,
    reasons: assessed.reasons,
    userMessage: assessed.userMessage,
    grade: assessed.grade,
    score: assessed.score,
  };
}
