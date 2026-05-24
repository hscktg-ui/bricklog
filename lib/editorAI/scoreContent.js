import { detectContentIssues } from "./detectIssues";
import { detectGPTTone } from "@/utils/detectGPTTone";
import { detectRepeatedSentences } from "@/utils/detectRepeatedSentences";
import { detectKeywordStuffing } from "@/utils/detectKeywordStuffing";
import { detectBrandLeak } from "@/utils/detectBrandLeak";
import { detectLocationLeak } from "@/utils/detectLocationLeak";
import { countBlogBodyChars, countChars, countKeywordOccurrences } from "@/lib/prompts/engine/textUtils";
import { BLOG_MIN_BODY_CHARS } from "@/lib/constants";
import { hasMechanicalKeywordPattern } from "@/lib/keywords/naturalKeywordWeave";

function clamp(n) {
  return Math.max(0, Math.min(99, Math.round(n)));
}

function scoreFromRisk(riskPercent) {
  return clamp(100 - riskPercent);
}

export function scoreContent(channel, content, ctx = {}, issueReport = null) {
  const report = issueReport || detectContentIssues(channel, content, ctx);
  const text = report.text || "";
  const gpt = detectGPTTone(text);
  const repeat = detectRepeatedSentences(text);
  const kw = detectKeywordStuffing(text, ctx.main);
  const brand = detectBrandLeak(text, ctx.brandName);
  const loc = detectLocationLeak(text, ctx.region);

  const repeatRisk = repeat.hasRepeat ? 35 : 4;
  const gptRisk = gpt.riskPercent;
  const kwNatural = scoreFromRisk(kw.riskPercent);

  const common = {
    overall: 0,
    brandFit: brand.score,
    gptRisk: gptRisk,
    gptScore: gpt.score,
    repeatRisk: repeatRisk,
    repeatScore: scoreFromRisk(repeatRisk),
    naturalness: clamp((gpt.score + kwNatural) / 2),
    forbiddenSafety: report.pass ? 92 : 48,
    regionKeywordFit: loc.score,
    timeliness: ctx.contentDate ? 85 : 78,
    channelFit: 80,
  };

  const channelScores = {};

  if (channel === "blog") {
    const chars = countBlogBodyChars(content);
    const mainUses = ctx.main ? countKeywordOccurrences(text, ctx.main) : 0;
    const opener = content?.sections?.[0]?.body?.slice(0, 120) || "";
    const openerOk = opener.length > 40 && !/^오늘은|소개해/.test(opener);

    channelScores.retention = clamp(chars >= BLOG_MIN_BODY_CHARS ? 82 : 58);
    channelScores.openerPull = openerOk ? 86 : 62;
    channelScores.infoDensity = clamp(
      (content?.sections?.length || 0) >= 4 ? 84 : 65
    );
    channelScores.keywordNatural = kwNatural;
    channelScores.lengthOk = chars >= BLOG_MIN_BODY_CHARS ? 95 : 45;

    common.channelFit = clamp(
      (channelScores.openerPull +
        channelScores.keywordNatural +
        channelScores.lengthOk) /
        3
    );
  }

  if (channel === "place") {
    const short = countChars(content?.shortBody || content?.shortNotice || "");
    channelScores.noticeClarity = short >= 15 && short <= 120 ? 88 : 65;
    channelScores.visitDrive = /방문|예약|영업|주차|문의/.test(text) ? 85 : 70;
    channelScores.messageFocus = !/블로그|체류/.test(text) ? 90 : 55;
    channelScores.compression = countChars(text) <= 380 ? 88 : 60;
    common.channelFit = clamp(
      Object.values(channelScores).reduce((a, b) => a + b, 0) /
        Object.keys(channelScores).length
    );
  }

  if (channel === "instagram") {
    const hookLen = (content?.hook || "").length;
    channelScores.emotionTemp = /요|네요|더라|같아|편해/.test(text) ? 86 : 72;
    channelScores.savePull = hookLen <= 42 && hookLen >= 8 ? 84 : 68;
    channelScores.hookStrength = hookLen >= 10 ? 85 : 55;
    const emojiCount = (text.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
    channelScores.emojiFit = emojiCount <= 6 ? 88 : emojiCount <= 12 ? 75 : 58;
    const breaks = (content?.lineBreakBody || "").split("\n").length;
    channelScores.lineRhythm = breaks >= 3 ? 87 : 65;
    common.channelFit = clamp(
      Object.values(channelScores).reduce((a, b) => a + b, 0) /
        Object.keys(channelScores).length
    );
  }

  if (channel === "image") {
    channelScores.promptClarity = text.length > 40 ? 85 : 60;
    channelScores.brandMood = ctx.brandName && text.includes(ctx.brandName.slice(0, 2)) ? 80 : 75;
    common.channelFit = 82;
  }

  const vals = [
    common.brandFit,
    common.naturalness,
    common.forbiddenSafety,
    common.regionKeywordFit,
    common.timeliness,
    common.channelFit,
    scoreFromRisk(gptRisk),
    scoreFromRisk(repeatRisk),
  ];
  common.overall = clamp(
    vals.reduce((a, b) => a + b, 0) / vals.length - (report.failCount || 0) * 8
  );
  if (report.pass && common.overall < 80) common.overall = 80;

  return {
    common,
    channel: channelScores,
    pass: report.pass,
    failCount: report.failCount,
  };
}
