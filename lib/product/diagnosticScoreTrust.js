/**
 * 진단 점수 신뢰도 — 본문 완성도 대비 SQV·등급 과대 책정 방지
 */
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { getChannelFullText } from "@/lib/content/channelPack";
import { assertCompleteBlogPackForDelivery } from "@/lib/product/completeDeliveryGate";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import { B_GRADE_MIN_SCORE } from "@/lib/product/bGradeDeliveryEngine";
import { A_GRADE_MIN_SCORE } from "@/lib/product/aGradeDeliveryEngine";
import { EDITOR_GRADE_A_SCORE } from "@/lib/product/professionalEditorGradeEngine";
import { PLACE_CHANNEL } from "@/styles/channels/placeStyle";
import { INSTAGRAM_CHANNEL } from "@/styles/channels/instagramStyle";

export const DIAGNOSTIC_TRUST_VERSION = "diagnostic-trust-v1";

function gradeFromScore(score) {
  if (score >= EDITOR_GRADE_A_SCORE) return "A";
  if (score >= B_GRADE_MIN_SCORE) return "B";
  if (score >= 64) return "C";
  if (score >= 50) return "D";
  return "F";
}

/** 0–1 — tier 분량·섹션·완성 게이트 종합 */
export function computeBlogCompletionRatio(pack, input = {}) {
  if (!pack?.sections?.length) return 0;

  const tier = resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const sections = pack.sections.length;
  const complete = assertCompleteBlogPackForDelivery(pack, input);

  const lengthRatio = Math.min(1, chars / Math.max(1, tier.min));
  const sectionRatio = Math.min(1, sections / Math.max(1, HUMAN_MIN_SECTIONS));
  const gateRatio = complete.ok
    ? 1
    : Math.max(0.3, 1 - (complete.reasons?.length || 1) * 0.1);

  return (
    Math.round(
      (lengthRatio * 0.58 + sectionRatio * 0.17 + gateRatio * 0.25) * 1000
    ) / 1000
  );
}

/** @param {object} pack @param {"place"|"instagram"} channel @param {object} [input] */
export function computeChannelCompletionRatio(pack, channel = "place", input = {}) {
  if (!pack) return 0;

  const fullLen = getChannelFullText(pack, channel).replace(/\s/g, "").length;
  const instaLen = String(input.instaBodyLength || "medium").toLowerCase();
  const minChars =
    channel === "place"
      ? PLACE_CHANNEL.totalChars?.min || 200
      : instaLen === "short"
        ? 120
        : instaLen === "long"
          ? 260
          : 180;

  const lengthRatio = Math.min(1, fullLen / Math.max(1, minChars));

  let structureRatio = 0.5;
  if (channel === "place") {
    const hasTitle = String(pack.title || "").trim().length >= 8;
    const hasNotice = String(pack.shortNotice || "").trim().length >= 12;
    const hasDetail = String(pack.detailBody || "").trim().replace(/\s/g, "").length >= 80;
    const hasCta = /플레이스|전화|예약|문의|방문/.test(String(pack.cta || ""));
    structureRatio =
      [hasTitle, hasNotice, hasDetail, hasCta].filter(Boolean).length / 4;
  } else {
    const body = String(pack.lineBreakBody || pack.body || "").trim();
    const lines = body.split(/\n+/).filter((l) => l.trim() && !/^#\S+/.test(l.trim()));
    const tagN =
      (pack.hashtags || []).length +
      ((body.match(/#\S+/g) || []).length);
    structureRatio =
      (lines.length >= 3 ? 0.45 : lines.length >= 2 ? 0.3 : 0.15) +
      (tagN >= 4 ? 0.35 : tagN >= 2 ? 0.2 : 0.05) +
      (String(pack.hook || "").trim().length >= 8 ? 0.2 : 0);
    structureRatio = Math.min(1, structureRatio);
  }

  return Math.round((lengthRatio * 0.62 + structureRatio * 0.38) * 1000) / 1000;
}

/** 완성도에 따른 점수 상한 — 100% 완성 시 100점까지, 미달 시 선형 하향 */
export function completionScoreCap(completionRatio) {
  const r = Math.max(0, Math.min(1, completionRatio));
  return Math.round(58 + r * 42);
}

/**
 * 보정·하한 적용 후 점수를 완성도 기준으로 재캡 — UI·진단 SSOT
 * @param {object} sqv
 * @param {object} pack
 * @param {object} [input]
 * @param {"blog"|"place"|"instagram"} [channel]
 */
export function applyDiagnosticScoreTrust(sqv, pack, input = {}, channel = "blog") {
  if (!sqv || !pack) return sqv;

  const completionRatio =
    channel === "blog"
      ? computeBlogCompletionRatio(pack, input)
      : computeChannelCompletionRatio(pack, channel, input);

  const calibratedScore = sqv.score ?? 0;
  const cap = completionScoreCap(completionRatio);
  const score = Math.min(calibratedScore, cap);
  const grade = gradeFromScore(score);
  const completionOk = completionRatio >= 0.88;

  const publishReady =
    Boolean(sqv.publishReady) &&
    completionOk &&
    score >= B_GRADE_MIN_SCORE &&
    (channel !== "blog" || assertCompleteBlogPackForDelivery(pack, input).ok || completionRatio >= 0.95);

  const extraReasons = [];
  if (!completionOk) extraReasons.push("body_completion_low");
  if (calibratedScore > cap + 4) extraReasons.push("score_capped_by_completion");

  return {
    ...sqv,
    calibratedScore,
    score,
    grade,
    completionRatio,
    completionScoreCap: cap,
    completionOk,
    publishReady,
    diagnosticTrustVersion: DIAGNOSTIC_TRUST_VERSION,
    reasons: [...new Set([...(sqv.reasons || []), ...extraReasons])],
  };
}

export function isDiagnosticGradeInflated(sqv = {}) {
  const calibrated = sqv.calibratedScore ?? sqv.score ?? 0;
  const trusted = sqv.score ?? 0;
  return (
    calibrated >= A_GRADE_MIN_SCORE &&
    trusted < A_GRADE_MIN_SCORE &&
    (sqv.completionRatio ?? 1) < 0.88
  );
}
