/**
 * 채널 sovereign trim — place·instagram 스팸·지역붙임 제거 (순환 import 방지 SSOT)
 */
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import {
  detectForbiddenIntro,
  FORBIDDEN_INTRO_PATTERNS,
} from "@/lib/product/editorIntroRules";
import {
  ANTI_SEO_SPAM_MAX_TOKEN_REPEAT,
  ANTI_SEO_SPAM_PRONOUNS,
  resolveAntiSeoTopicPronouns,
  softenTokenRepeats,
} from "@/lib/product/antiSeoSpamEngine";
import {
  applyRegionBrandMashRepairToChannelPack,
  assessPackRegionBrandMash,
} from "@/lib/content/regionBrandMashRepair";
import { stripChannelTemplateBoilerplate } from "@/lib/content/templateBoilerplateEngine";
import { humanizeInstaCaptionPack } from "@/lib/content/instaCaptionHumanize";

function softenEntityRepeatsInText(text = "", input = {}) {
  let out = String(text || "");
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const opts = { brandName: brand, region };
  if (brand) {
    out = softenTokenRepeats(
      out,
      brand,
      ANTI_SEO_SPAM_PRONOUNS.brand,
      ANTI_SEO_SPAM_MAX_TOKEN_REPEAT,
      opts
    );
  }
  if (region) {
    out = softenTokenRepeats(
      out,
      region,
      ANTI_SEO_SPAM_PRONOUNS.region,
      ANTI_SEO_SPAM_MAX_TOKEN_REPEAT,
      opts
    );
  }
  if (topic) {
    out = softenTokenRepeats(
      out,
      topic,
      resolveAntiSeoTopicPronouns(input),
      ANTI_SEO_SPAM_MAX_TOKEN_REPEAT + 1,
      opts
    );
  }
  return out;
}

export function applyChannelSovereignTrimPass(pack, channel, input = {}) {
  if (!pack) return pack;
  let next = applyRegionBrandMashRepairToChannelPack(pack, channel, input);
  const polish = (t) =>
    stripChannelTemplateBoilerplate(softenEntityRepeatsInText(t, input), input);

  if (channel === "place") {
    next = {
      ...next,
      title: polish(next.title || ""),
      shortNotice: polish(next.shortNotice || ""),
      detailBody: polish(next.detailBody || ""),
      shortBody: polish(next.shortBody || ""),
      body: polish(next.body || ""),
    };
  } else if (channel === "instagram") {
    const bodyKey = next.lineBreakBody ? "lineBreakBody" : "body";
    next = {
      ...next,
      title: polish(next.title || ""),
      hook: polish(next.hook || ""),
      [bodyKey]: polish(next[bodyKey] || ""),
      body: polish(next.body || ""),
      ending: polish(next.ending || ""),
      caption: polish(next.caption || ""),
    };
    next = humanizeInstaCaptionPack(next);
  }

  const mash = assessPackRegionBrandMash(next, input, channel);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      channelSovereignTrim: true,
      regionBrandMashOk: mash.ok,
      regionBrandMashIssues: mash.issues,
    },
  };
}

export function stripForbiddenIntroText(text = "") {
  let out = String(text || "").trim();
  if (!out) return out;
  const sentences = splitKoreanSentences(out);
  const filtered = sentences.filter((s) => detectForbiddenIntro(s).ok);
  if (filtered.length && filtered.length < sentences.length) {
    return filtered.join(" ").trim();
  }
  for (const re of FORBIDDEN_INTRO_PATTERNS) {
    out = out.replace(re, "").trim();
  }
  return out.replace(/^\s*[,，]\s*/, "").trim();
}

export function softenChannelEntityRepeatsInText(text = "", input = {}) {
  return softenEntityRepeatsInText(text, input);
}
