import { scrubGptToneDeep } from "@/utils/gptToneScrubber";
import { scrubMechanicalSeoPhrases } from "@/lib/keywords/naturalKeywordWeave";
import { fixBrandJosa } from "@/lib/korean/josaFix";
import { checkBlogQuality, checkPlaceQuality, checkInstaQuality } from "@/utils/qualityCheck";
import {
  applyBlogPackIntegrity,
  validateBlogPackIntegrity,
} from "@/lib/integrity/templateIntegrity";
import { enrichBlogPack, enrichPlacePack, enrichInstaPack } from "@/lib/prompts/engine/enrichOutput";
import { learnRewritePreference } from "@/lib/learning/brandLearning";
import { ANTI_SEO_SPAM_PRONOUNS, resolveAntiSeoTopicPronouns, softenTokenRepeats } from "@/lib/product/antiSeoSpamEngine";

const TAG_CATEGORY_MAP = {
  too_ad: "less_ad",
  too_ai: "anti_gpt",
  gpt_tone: "anti_gpt",
  repeat: "less_kw",
  low_emotion: "warmer",
  low_info: "general",
  brand_weak: "brand_tone",
  seo_weak: "less_kw",
  title_weak: "title",
  length_wrong: "shorter",
};

const FEEDBACK_RULES = [
  { re: /광고|과장|홍보|too_ad/i, category: "less_ad", apply: (t) => t.replace(/최고|완벽|대박|혁신/g, "") },
  { re: /감성|따뜻|부드|low_emotion/i, category: "warmer", apply: (t) => t.replace(/\.\s/g, "… ") },
  { re: /담백|간결|짧|length_wrong/i, category: "shorter", apply: shortenText },
  { re: /이모지/, category: "emoji", apply: adjustEmoji },
  { re: /반복|키워드|repeat|seo_weak/i, category: "less_kw", apply: reduceKeywordRepeat },
  { re: /GPT|뻔|어색|too_ai|gpt_tone/i, category: "anti_gpt", apply: scrubGptToneDeep },
  {
    re: /브랜드|brand_weak/i,
    category: "brand_tone",
    apply: (t, ctx) => {
      const brand = String(ctx.brandName || ctx.input?.brandName || "").trim();
      const s = String(t || "").trim();
      if (!brand || s.includes(brand) || s.replace(/\s/g, "").length > 80) return t;
      return `${brand} — ${s}`.replace(/\s+/g, " ").trim();
    },
  },
  { re: /줄바꿈|간격/, category: "spacing", apply: widenBreaks },
  { re: /제목|title_weak/i, category: "title", apply: (t) => t },
  { re: /정보|low_info/i, category: "general", apply: (t) => t },
  { re: /플레이스.*짧|짧.*플레이스/, category: "place_short", apply: shortenText },
  { re: /인스타.*따뜻|따뜻.*인스타/, category: "insta_warm", apply: (t) => t.replace(/\./g, "…") },
];

export function categoriesFromFeedbackTags(tagIds = []) {
  const cats = new Set();
  for (const id of tagIds) {
    const c = TAG_CATEGORY_MAP[id];
    if (c) cats.add(c);
  }
  return [...cats];
}

export function parseFeedbackIntent(feedbackText = "", tagIds = []) {
  const t = feedbackText.trim();
  const fromTags = categoriesFromFeedbackTags(tagIds);
  const matched = [
    ...new Set([
      ...fromTags,
      ...FEEDBACK_RULES.filter((r) => r.re.test(t)).map((r) => r.category),
    ]),
  ];
  let scope = "all";
  if (/제목만|제목만/.test(t)) scope = "title";
  if (/도입|첫\s*문단|첫문단/.test(t)) scope = "intro";
  if (/마무리|결론/.test(t)) scope = "conclusion";
  if (/섹션|소제목/.test(t)) scope = "sections";
  if (/hook/i.test(t) || /훅/.test(t)) scope = "hook";
  if (/CTA|행동/.test(t)) scope = "cta";
  return { categories: matched.length ? matched : ["general"], scope, raw: t };
}

function shortenText(text, maxRatio = 0.85) {
  const blocks = String(text).split(/\n\n+/);
  const kept = blocks.slice(0, Math.max(1, Math.ceil(blocks.length * maxRatio)));
  return kept.join("\n\n");
}

function widenBreaks(text) {
  return String(text).replace(/\n\n/g, "\n\n\n");
}

function adjustEmoji(text, mode = "light") {
  if (mode === "none") return text.replace(/[\u{1F300}-\u{1FAFF}]/gu, "");
  if (/조금|적게|줄/.test(mode)) return text.replace(/([\u{1F300}-\u{1FAFF}])/gu, "");
  return text;
}

function resolveKeywordSubstitutes(ctx = {}, mainKw = "") {
  const input = ctx.input || ctx;
  const brand = String(input.brandName || ctx.brandName || "").trim();
  const region = String(input.region || ctx.region || "").trim();
  const kw = String(mainKw).trim();
  if (brand && kw.includes(brand)) return ANTI_SEO_SPAM_PRONOUNS.brand;
  if (region && kw.includes(region)) return ANTI_SEO_SPAM_PRONOUNS.region;
  return resolveAntiSeoTopicPronouns(ctx);
}

function reduceKeywordRepeat(text, ctx = {}) {
  const input = ctx.input || ctx;
  const mainKw = String(
    input.mainKeyword || input.topic || ctx.mainKeyword || ctx.topic || ""
  ).trim();
  if (!mainKw || mainKw.length < 2) return text;
  return softenTokenRepeats(text, mainKw, resolveKeywordSubstitutes(ctx, mainKw), 5);
}

function applyTextFeedback(text, intent, ctx) {
  let out = String(text || "");
  const categories = new Set(intent.categories || []);
  const generalOnly = categories.size === 1 && categories.has("general");

  for (const rule of FEEDBACK_RULES) {
    const categoryHit = categories.has(rule.category);
    const textHit = rule.re.test(intent.raw || "");
    if (!categoryHit && !(generalOnly && textHit)) continue;
    if (!categoryHit && !textHit) continue;
    out = rule.apply(out, ctx);
  }

  out = scrubMechanicalSeoPhrases(scrubGptToneDeep(out));
  return fixBrandJosa(out, ctx.brandName);
}

export function rewriteBlogPack(pack, feedbackText, ctx, scope = "all", tagIds = []) {
  const intent = parseFeedbackIntent(feedbackText, tagIds);
  const s = intent.scope !== "all" ? intent.scope : scope;
  let next = { ...pack };

  const patchText = (t) => applyTextFeedback(t, intent, ctx);

  if (s === "title" || s === "all") {
    next.representativeTitle = patchText(next.representativeTitle || next.title || "");
    next.title = next.representativeTitle;
  }
  if (s === "intro" || s === "sections" || s === "all") {
    next.sections = (next.sections || []).map((sec, i) =>
      s === "intro" && i > 0
        ? sec
        : {
            ...sec,
            heading: s === "sections" || s === "all" ? patchText(sec.heading) : sec.heading,
            body: patchText(sec.body),
          }
    );
  }
  if (s === "conclusion" || s === "all") {
    next.conclusion = patchText(next.conclusion || "");
  }

  next = applyBlogPackIntegrity(next, ctx);
  const quality = checkBlogQuality(next, ctx);
  next.qualityReport = { ...next.qualityReport, ...quality };
  next._meta = { ...next._meta, quality, rewritten: true, feedbackScope: s };

  return { pack: next, intent, integrity: validateBlogPackIntegrity(next, ctx) };
}

export function rewritePlacePack(pack, feedbackText, ctx) {
  const intent = parseFeedbackIntent(feedbackText);
  let next = { ...pack };
  const patch = (t) => applyTextFeedback(t, intent, ctx);

  if (intent.scope === "title" || intent.scope === "all") next.title = patch(next.title || "");
  if (intent.scope === "cta") next.cta = patch(next.cta || "");
  if (/짧|간결/.test(intent.raw)) {
    next.shortNotice = shortenText(patch(next.shortNotice || next.shortBody || ""), 0.7);
    next.shortBody = next.shortNotice;
    next.detailBody = shortenText(patch(next.detailBody || ""), 0.75);
  } else {
    next.shortNotice = patch(next.shortNotice || next.shortBody || "");
    next.shortBody = next.shortNotice;
    next.detailBody = patch(next.detailBody || "");
  }

  next = enrichPlacePack(next, ctx, ctx.input || {});
  const quality = checkPlaceQuality(next, ctx);
  next.qualityReport = { ...next.qualityReport, ...quality };
  next._meta = { ...next._meta, quality, rewritten: true, feedbackScope: intent.scope };
  return { pack: next, intent };
}

export function rewriteInstaPack(pack, feedbackText, ctx) {
  const intent = parseFeedbackIntent(feedbackText);
  let next = { ...pack };
  const patch = (t) => applyTextFeedback(t, intent, ctx);

  if (intent.scope === "hook" || intent.scope === "all") next.hook = patch(next.hook || "");
  if (intent.scope === "all") {
    next.body = patch(next.body || "");
    next.ending = patch(next.ending || "");
    next.lineBreakBody = widenBreaks(patch(next.lineBreakBody || next.body));
  }
  if (/이모지/.test(intent.raw)) {
    next.body = adjustEmoji(next.body, "less");
    next.lineBreakBody = adjustEmoji(next.lineBreakBody, "less");
  }

  next = enrichInstaPack(next, ctx, ctx.input || {});
  const quality = checkInstaQuality(next, ctx);
  next.qualityReport = { ...next.qualityReport, ...quality };
  next._meta = { ...next._meta, quality, rewritten: true, feedbackScope: intent.scope };
  return { pack: next, intent };
}

export function runRewrite(channel, content, feedbackText, ctx, scope = "all", tagIds = []) {
  if (channel === "blog") return rewriteBlogPack(content, feedbackText, ctx, scope, tagIds);
  if (channel === "place") return rewritePlacePack(content, feedbackText, ctx);
  if (channel === "instagram") return rewriteInstaPack(content, feedbackText, ctx);
  return { pack: content, intent: parseFeedbackIntent(feedbackText) };
}

export function recordRewriteLearning(brandId, channel, feedbackText, intent) {
  if (!brandId) return;
  learnRewritePreference(brandId, channel, feedbackText, intent?.categories || []);
}
