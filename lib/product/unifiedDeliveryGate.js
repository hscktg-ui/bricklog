/**
 * 송출 판정 SSOT — bench · editor · probe · API 공통
 * 카테고리별 게이트 대신 단일 pass/fail
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";
import {
  assessVisitReviewBenchmark,
  resolveVisitReviewPassMin,
} from "@/lib/product/visitReviewBenchmarkRubric";
import {
  assessProfessionalEditorDelivery,
  isColumnistEditorGradePass,
} from "@/lib/product/professionalEditorGradeEngine";

export const UNIFIED_DELIVERY_GATE_VERSION = "unified-delivery-v1";

function isColumnistDeliveryPack(pack = {}) {
  return Boolean(
    pack._meta?.columnistSovereignLlm ||
      pack._meta?.generationMode === "columnist_sovereign" ||
      pack._meta?.visitReviewBenchmarkOk
  );
}

function resolveDeliveryBenchmark(pack, input, passMin) {
  const stamped = pack._meta?.visitReviewBenchmark;
  if (
    isColumnistDeliveryPack(pack) &&
    pack._meta?.visitReviewBenchmarkOk === true &&
    stamped?.publishOk === true &&
    typeof stamped.score === "number"
  ) {
    return {
      score: stamped.score,
      grade: stamped.grade || "A",
      publishOk: true,
      hardFails: stamped.hardFails || [],
    };
  }
  return assessVisitReviewBenchmark(pack, input, { passMin });
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function assessUnifiedBlogDelivery(pack, input = {}) {
  if (!pack?.sections?.length) {
    return {
      version: UNIFIED_DELIVERY_GATE_VERSION,
      ok: false,
      pass: false,
      reasons: ["empty_pack"],
    };
  }

  const passMin = resolveVisitReviewPassMin({});
  const bench = resolveDeliveryBenchmark(pack, input, passMin);
  const editor = assessProfessionalEditorDelivery(pack, input);
  const ph = countPlaceholderContamination(getBlogFullText(pack));
  const columnist = isColumnistDeliveryPack(pack);

  const reasons = [];
  if (pack._meta?.outputWithheld === true) reasons.push("output_withheld");
  if (ph.total > 0) reasons.push("placeholder_contamination");
  if (bench.hardFails?.length) reasons.push(...bench.hardFails.map((h) => `hard:${h}`));
  if (!bench.publishOk) reasons.push("benchmark_publish_fail");
  if (bench.score < passMin) reasons.push("benchmark_score_low");

  const evalOk =
    editor.evalPass === true ||
    (columnist &&
      pack._meta?.visitReviewBenchmarkOk === true &&
      bench.publishOk &&
      bench.score >= passMin &&
      ph.total === 0) ||
    isColumnistEditorGradePass(pack, input);

  if (!evalOk) reasons.push("editor_eval_fail");

  const ok =
    reasons.length === 0 &&
    bench.publishOk &&
    bench.score >= passMin &&
    ph.total === 0 &&
    evalOk;

  return {
    version: UNIFIED_DELIVERY_GATE_VERSION,
    ok,
    pass: ok,
    reasons: [...new Set(reasons)],
    benchmark: {
      score: bench.score,
      grade: bench.grade,
      publishOk: bench.publishOk,
      hardFails: bench.hardFails || [],
    },
    editor: {
      score: editor.score,
      ok: editor.ok,
      evalPass: editor.evalPass,
    },
    columnistPath: columnist,
    placeholderCount: ph.total,
  };
}

export function isUnifiedBlogDeliveryPass(pack, input = {}) {
  return assessUnifiedBlogDelivery(pack, input).pass === true;
}
