import { detectContentIssues } from "@/lib/editorAI/detectIssues";
import { scoreCoreContent } from "@/lib/quality/coreQualityEngine";
import { buildImprovementSuggestions } from "@/lib/quality/coreQualityEngine";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { countChars } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";
import { pastedTextToBlogPack } from "@/lib/review/pasteToBlogPack";
import { pastedTextToPlacePack } from "@/lib/review/pasteToPlacePack";
import { pastedTextToInstaPack } from "@/lib/review/pasteToInstaPack";
import { getPasteReviewChannel } from "@/lib/review/pasteChannelConfig";
import { USER_QUALITY_GOAL } from "@/lib/quality/qualityTargets";
import {
  checkPlaceQuality,
  checkInstaQuality,
} from "@/utils/qualityCheck";

const ISSUE_LABELS = {
  placeholder: "비어 있거나 깨진 문구",
  junk: "시스템 오류 문자",
  repeat: "같은 문장 반복",
  gpt: "AI 말투·뻔한 표현",
  keyword_stuff: "키워드 과하게 넣음",
  brand_leak: "다른 브랜드명 혼입",
  region_leak: "무관한 지역명",
  particle: "조사·띄어쓰기 어색함",
  forbidden: "금지어·과장 표현",
  blog_length: "분량 부족",
  integrity: "구조·무결성",
  place_long: "분량 과다",
  place_blog_tone: "블로그체 혼입",
  insta_hook: "Hook 부족",
  insta_explain: "설명형 문체",
  length: "분량",
};

function normalizeAuditChannel(channel) {
  const id = channel === "instagram" || channel === "insta" ? "instagram" : channel;
  return id === "place" || id === "instagram" ? id : "blog";
}

function packForChannel(channel, rawText, ctx = {}) {
  if (channel === "place") {
    return pastedTextToPlacePack(rawText, {
      title: ctx.placeTitle,
      short: ctx.placeShort,
      detail: ctx.placeDetail,
    });
  }
  if (channel === "instagram") {
    return pastedTextToInstaPack(rawText);
  }
  return pastedTextToBlogPack(rawText);
}

function charCountForChannel(channel, pack) {
  if (channel === "blog") return countBlogBodyChars(pack);
  if (channel === "place") {
    return (
      countChars(pack.shortNotice || pack.shortBody) +
      countChars(pack.detailBody || "")
    );
  }
  return countChars(pack.lineBreakBody || pack.body || "");
}

/**
 * @param {string} rawText
 * @param {{ brandName?: string, region?: string, mainKeyword?: string, excludePhrases?: string, placeTitle?: string, placeShort?: string, placeDetail?: string }} ctx
 * @param {'blog'|'place'|'instagram'} [channelId]
 */
export function auditPastedDraft(rawText, ctx = {}, channelId = "blog") {
  const channel = normalizeAuditChannel(channelId);
  const config = getPasteReviewChannel(
    channel === "instagram" ? "instagram" : channel
  );
  const pack = packForChannel(channel, rawText, ctx);
  const auditCtx = {
    brandName: ctx.brandName?.trim() || "",
    region: ctx.region?.trim() || "",
    main: ctx.mainKeyword?.trim() || "",
    excludePhrases: ctx.excludePhrases || "",
    speechStyle: ctx.speechStyle,
    input: ctx,
    emojiDensity: ctx.emojiDensity,
  };

  const detected = detectContentIssues(channel, pack, auditCtx);
  const core = scoreCoreContent(pack, auditCtx, channel);
  const charCount = charCountForChannel(channel, pack);

  const gaps = [];
  for (const issue of detected.issues) {
    gaps.push({
      id: issue.id,
      severity: issue.severity,
      label: ISSUE_LABELS[issue.id] || issue.message,
      message: issue.message,
    });
  }

  if (channel === "blog") {
    const lengthTier = resolveBlogLengthTier(ctx.blogLengthTier || "medium");
    if (charCount < lengthTier.min) {
      gaps.push({
        id: "length",
        severity: "warn",
        label: "분량",
        message: `공백 포함 ${charCount}자 (권장 ${lengthTier.target}자+, 최소 ${lengthTier.min}자)`,
      });
    }
  }

  if (channel === "place") {
    const pq = checkPlaceQuality(pack, auditCtx);
    for (const badge of pq.badges || []) {
      if (badge.ok) continue;
      gaps.push({
        id: badge.id,
        severity: badge.id === "chars" ? "warn" : "warn",
        label: badge.label,
        message: badge.label,
      });
    }
    if (charCount < 80) {
      gaps.push({
        id: "length",
        severity: "warn",
        label: "분량",
        message: `공백 포함 ${charCount}자 (플레이스 권장 150~350자)`,
      });
    }
  }

  if (channel === "instagram") {
    const iq = checkInstaQuality(pack, auditCtx);
    for (const badge of iq.badges || []) {
      if (badge.ok) continue;
      gaps.push({
        id: badge.id,
        severity: "warn",
        label: badge.label,
        message: badge.label,
      });
    }
    if (charCount < 80) {
      gaps.push({
        id: "length",
        severity: "warn",
        label: "분량",
        message: `공백 포함 ${charCount}자 (캡션 권장 180~480자)`,
      });
    }
  }

  for (const reason of core.failReasons || []) {
    const sug = buildImprovementSuggestions([reason]);
    if (sug[0]) {
      gaps.push({
        id: reason,
        severity: "warn",
        label: "품질",
        message: sug[0],
      });
    }
  }

  const seen = new Set();
  const uniqueGaps = gaps.filter((g) => {
    const k = `${g.id}:${g.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const failCount = uniqueGaps.filter((g) => g.severity === "fail").length;

  const lengthTier =
    channel === "blog"
      ? resolveBlogLengthTier(ctx.blogLengthTier || "medium")
      : null;
  let pass =
    detected.pass &&
    failCount === 0 &&
    core.total >= USER_QUALITY_GOAL;
  if (channel === "blog" && lengthTier) {
    pass = pass && charCount >= lengthTier.min;
  }

  return {
    channel,
    channelLabel: config.label,
    pack,
    charCount,
    score: core.total,
    pass,
    issues: uniqueGaps,
    failCount,
    suggestions: buildImprovementSuggestions(core.failReasons || []),
  };
}
