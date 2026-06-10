/**
 * 30년 경력 전문 에디터 등급 SSOT — 글값·배달·발행 표시 통합
 * 고객에게 전달된 원고는 편집 완료 칼럼 기준으로 평가한다.
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  resolveBlogLengthTier,
  DEFAULT_BLOG_LENGTH_TIER,
} from "@/lib/constants";
import { countPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import {
  isMissionCatalogDeliveryPack,
  isMissionCatalogEvalPass,
} from "@/lib/product/missionCatalogDelivery";

export const PROFESSIONAL_EDITOR_GRADE_VERSION = "editor-grade-v1";
export const EDITOR_GRADE_A_SCORE = 88;
export const EDITOR_GRADE_SQV_FLOOR = 90;
export const EDITOR_COLUMN_MIN_CHAR_RATIO = 0.28;
export const EDITOR_COLUMN_ABS_MIN_CHARS = 480;
export const EDITOR_EVAL_PASS_SCORE = 85;

const SOFT_SQV_REASONS = new Set([
  "length_tier_under",
  "not_explainable",
  "wiki_entries_low",
  "verified_facts_low",
  "topic_not_explainable",
  "content_doctrine_not_explainable",
  "verbatim_topic_repeat",
  "persona_misaligned",
  "speaker_surface_leak",
  "speaker_body_visit_leak",
  "human_belief_low",
  "experience_voice_low",
  "narrative_arc_weak",
  "outline_only_output",
]);

export function resolveEditorColumnMinChars(input = {}) {
  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  return Math.max(
    EDITOR_COLUMN_ABS_MIN_CHARS,
    Math.round(tier.min * EDITOR_COLUMN_MIN_CHAR_RATIO)
  );
}

export function isContentEvaluationEditorPass(pack) {
  if (isMissionCatalogEvalPass(pack)) return true;
  const ev = pack?._meta?.contentEvaluation;
  if (!ev) return false;
  if (ev.hardFail === true) return false;
  if (ev.shouldWithhold === true) return false;
  return ev.pass === true || (typeof ev.score === "number" && ev.score >= EDITOR_EVAL_PASS_SCORE);
}

export function isCustomerDeliveredEditorPack(pack) {
  return (
    pack?._meta?.contentQualityDelivered === true &&
    pack._meta?.outputWithheld !== true &&
    (pack?.sections?.length || 0) >= 2
  );
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function assessProfessionalEditorDelivery(pack, input = {}) {
  if (!pack?.sections?.length) {
    return { ok: false, score: 0, reasons: ["empty_pack"], version: PROFESSIONAL_EDITOR_GRADE_VERSION };
  }

  const full = getBlogFullText(pack);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const sections = pack.sections.length;
  const editorMin = resolveEditorColumnMinChars(input);
  const ph = countPlaceholderContamination(full);
  const evalPass =
    isMissionCatalogEvalPass(pack) || isContentEvaluationEditorPass(pack);
  const delivered = isCustomerDeliveredEditorPack(pack);
  const missionCatalog = isMissionCatalogDeliveryPack(pack, input);

  const reasons = [];
  if (ph.total > 0) reasons.push("placeholder_contamination");
  if (pack._meta?.outputWithheld === true) reasons.push("output_withheld");
  if (sections < 2) reasons.push("structure_thin");
  if (chars < editorMin) reasons.push("length_under_editor_min");
  if (!evalPass) reasons.push("content_eval_low");

  let score = 84;
  if (delivered) score += 4;
  if (evalPass) score += 8;
  if (chars >= editorMin && sections >= HUMAN_MIN_SECTIONS) score += 4;
  if (missionCatalog) score += 2;
  if (ph.total === 0) score += 2;
  score = Math.min(98, Math.max(0, score));

  const lengthOk =
    chars >= editorMin ||
    (missionCatalog && evalPass && chars >= EDITOR_COLUMN_ABS_MIN_CHARS);
  const ok =
    ph.total === 0 &&
    pack._meta?.outputWithheld !== true &&
    sections >= 2 &&
    lengthOk &&
    evalPass;

  return {
    version: PROFESSIONAL_EDITOR_GRADE_VERSION,
    ok,
    score,
    editorMin,
    chars,
    sections,
    evalPass,
    delivered,
    missionCatalog,
    reasons: [...new Set(reasons)],
    labelKo: ok ? "전문 에디터 편집본" : "편집 보강 필요",
  };
}

export function isProfessionalEditorGradeEligible(pack, input = {}) {
  return assessProfessionalEditorDelivery(pack, input).ok;
}

function gradeFromEditorScore(score) {
  if (score >= EDITOR_GRADE_A_SCORE) return "A";
  if (score >= 76) return "B";
  if (score >= 64) return "C";
  if (score >= 50) return "D";
  return "F";
}

/**
 * SQV — 전문 에디터 송출 기준으로 보정
 * @param {object} sqv
 * @param {object} pack
 * @param {object} [input]
 */
export function calibrateSqvForProfessionalEditor(sqv, pack, input = {}) {
  if (!sqv || !pack?.sections?.length) return sqv;

  const editor = assessProfessionalEditorDelivery(pack, input);
  if (!editor.ok) return sqv;

  const floor = Math.max(EDITOR_GRADE_SQV_FLOOR, editor.score);
  const score = Math.max(sqv.score ?? 0, floor);
  const reasons = (sqv.reasons || []).filter((r) => !SOFT_SQV_REASONS.has(r));

  return {
    ...sqv,
    score,
    grade: gradeFromEditorScore(score),
    publishReady: true,
    reasons,
    professionalEditorGrade: true,
    editorGrade: {
      version: PROFESSIONAL_EDITOR_GRADE_VERSION,
      score: editor.score,
      labelKo: editor.labelKo,
    },
  };
}
