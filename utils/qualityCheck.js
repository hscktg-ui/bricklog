import { cleanOutputText, isJunkValue } from "./sanitizeInput";
import { buildForbiddenList, containsForbidden } from "./filterForbiddenWords";
import {
  countBlogBodyChars,
  countChars,
  countKeywordOccurrences,
} from "@/lib/prompts/engine/textUtils";
import { containsOverused } from "@/lib/prompts/situations";
import { detectGptTone } from "@/utils/gptToneScrubber";
import { hasMechanicalKeywordPattern } from "@/lib/keywords/naturalKeywordWeave";
import { needsContentRegeneration } from "@/utils/repetitionGuard";
import {
  instaUsesBlogDerivation,
  placeUsesBlogDerivation,
} from "@/lib/content/blogDerive";

const BANNED_OPENERS = [
  "오늘은",
  "소개해드릴게요",
  "검색창에 입력",
  "체크리스트로 삼으면",
  "해당 브랜드는",
  "브랜드가 지향하는",
  "정리하자면",
  "추천드립니다",
  "체크해보세요",
];

const GPT_TONE_MARKERS = [
  "도움이 되길",
  "참고가 되시길",
  "알아보시다 보면",
  "정리해드리",
  "말씀드리",
];

export function getBlogFullText(blog) {
  if (!blog) return "";
  const primary = String(blog.representativeTitle || blog.title || "").trim();
  const primaryKey = primary.replace(/\s/g, "");
  const altTitles = (blog.titles || []).filter((t) => {
    const next = String(t || "").trim();
    return next && next.replace(/\s/g, "") !== primaryKey;
  });
  const parts = [
    ...altTitles,
    primary,
    ...(blog.sections || []).map((s) => `${s.heading} ${s.body}`),
    blog.conclusion,
    (blog.hashtags || []).join(" "),
  ];
  return parts.filter(Boolean).join("\n");
}

function hasDuplicateSentences(text) {
  const sentences = String(text || "")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim().replace(/\s/g, ""))
    .filter((s) => s.length > 18);
  const seen = new Set();
  for (const s of sentences) {
    if (seen.has(s)) return true;
    seen.add(s);
  }
  return false;
}

function hasJunkOutput(text) {
  const t = String(text || "");
  if (/\bundefined\b/i.test(t) || /\bnull\b/i.test(t) || /\bNaN\b/.test(t))
    return true;
  if (/지역에서\s+업종|업종을\s+찾/.test(t)) return true;
  return false;
}

function hasGptTone(text) {
  return GPT_TONE_MARKERS.some((m) => text.includes(m));
}

export function checkBlogQuality(blog, ctx) {
  const fullText = getBlogFullText(blog);
  const forbidden = buildForbiddenList(ctx);
  const charCount = countBlogBodyChars(blog);
  const main = ctx.main || "";
  const mainUses = main ? countKeywordOccurrences(fullText, main) : 0;

  const noUndefined = !hasJunkOutput(fullText);
  const excludeApplied = !containsForbidden(fullText, forbidden);
  const charCountOk = charCount >= 1800 && charCount <= 2800;
  const mainKeywordOk = mainUses >= 4 && mainUses <= 8;
  const lowDuplicates = !hasDuplicateSentences(fullText);
  const noBannedOpeners = !BANNED_OPENERS.some((p) => fullText.includes(p));
  const gptCheck = detectGptTone(fullText);
  const noGptTone = !gptCheck.hasGptTone && !hasGptTone(fullText);
  const noOverused = !containsOverused(fullText);
  const keywordOverload = mainUses > 9;
  const naturalKw = !hasMechanicalKeywordPattern(fullText);
  const regenCheck = needsContentRegeneration(fullText, "blog");

  const badges = [
    { id: "undefined", label: "undefined 없음", ok: noUndefined },
    { id: "exclude", label: "금지어 없음", ok: excludeApplied },
    { id: "chars", label: "1,800자 이상", ok: charCountOk },
    { id: "keyword", label: "메인키워드 자연 삽입", ok: mainKeywordOk },
    { id: "dup", label: "반복문장 최소화", ok: lowDuplicates },
    { id: "opener", label: "금지 도입문 없음", ok: noBannedOpeners },
    { id: "gpt", label: "GPT 말투 없음", ok: noGptTone },
    { id: "overused", label: "감성표현 반복 없음", ok: noOverused },
    { id: "kw", label: "키워드 과다 없음", ok: !keywordOverload },
    { id: "natural", label: "자연 키워드 삽입", ok: naturalKw },
    { id: "scene", label: "장면형 구조", ok: !regenCheck.regen },
  ];

  return {
    noUndefined,
    excludeApplied,
    charCountOk,
    mainKeywordOk,
    lowDuplicates,
    noBannedOpeners,
    noGptTone,
    keywordOverload,
    gptHits: gptCheck.hits,
    charCount,
    mainKeywordUses: mainUses,
    badges,
    pass: badges.every((b) => b.ok),
  };
}

export function checkPlaceQuality(place, ctx) {
  const text = [
    place.title,
    place.shortBody,
    place.detailBody,
    place.cta,
  ].join("\n");
  const total =
    countChars(place.shortBody) + countChars(place.detailBody || "");
  const forbidden = buildForbiddenList(ctx);

  const insights = ctx.blogInsights || null;
  const blogAdapted =
    place._meta?.blogAdapted ?? placeUsesBlogDerivation(place, insights);

  const badges = [
    { id: "undefined", label: "undefined 없음", ok: !hasJunkOutput(text) },
    { id: "exclude", label: "금지어 없음", ok: !containsForbidden(text, forbidden) },
    { id: "chars", label: "150~350자", ok: total >= 150 && total <= 380 },
    { id: "blogTone", label: "블로그체 없음", ok: !/알아보시다|체류|SEO|키워드|소개해드릴/.test(text) },
    { id: "notice", label: "공지형 톤", ok: countChars(place.shortBody) >= 15 },
    {
      id: "blogAdapt",
      label: "블로그 사실 반영",
      ok: insights?.hasDerivation ? blogAdapted : true,
    },
    {
      id: "detail",
      label: "운영 안내 보강",
      ok: countChars(place.detailBody || "") >= 12 || total >= 180,
    },
  ];

  return { badges, pass: badges.every((b) => b.ok), totalChars: total };
}

export function checkInstaQuality(insta, ctx) {
  const text = [insta.hook, insta.body, insta.ending, insta.lineBreakBody].join("\n");
  const bodyChars = countChars(insta.body || insta.lineBreakBody);
  const forbidden = buildForbiddenList(ctx);
  const hasLineBreaks = (insta.lineBreakBody || "").split("\n").length >= 3;

  const insights = ctx.blogInsights || null;
  const blogAdapted =
    insta._meta?.blogAdapted ?? instaUsesBlogDerivation(insta, insights);
  const emojiCount = (text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || [])
    .length;

  const badges = [
    { id: "undefined", label: "undefined 없음", ok: !hasJunkOutput(text) },
    { id: "exclude", label: "금지어 없음", ok: !containsForbidden(text, forbidden) },
    { id: "chars", label: "180~480자", ok: bodyChars >= 180 && bodyChars <= 520 },
    { id: "breaks", label: "줄바꿈 유지", ok: hasLineBreaks },
    { id: "hook", label: "Hook 존재", ok: (insta.hook || "").length >= 8 },
    { id: "overused", label: "반복 표현 없음", ok: !containsOverused(text) },
    { id: "blogTone", label: "블로그체 없음", ok: !/소개해드릴|검색창|체크리스트|정리했습니다/.test(text) },
    {
      id: "blogAdapt",
      label: "블로그 장면 반영",
      ok: insights?.hasDerivation ? blogAdapted : true,
    },
    {
      id: "emoji",
      label: "이모지 2개 이상",
      ok: emojiCount >= 2 || ctx.emojiDensity === "none",
    },
  ];

  return { badges, pass: badges.every((b) => b.ok), bodyChars };
}

export function buildVerificationReport({
  channel,
  quality,
  factCheck,
  brandResearch,
}) {
  const sourceLabel =
    brandResearch?.sourceStatus === "search_based" ||
    brandResearch?.sourceStatus === "search_inferred"
      ? "브랜드 조사 반영"
      : "사용자 입력 기반";

  return {
    sourceLabel,
    needsSearchVerification:
      brandResearch?.sourceStatus === "user_input_only" &&
      !brandResearch?.summary?.coreStrengths?.length,
    noForbidden: quality?.excludeApplied ?? quality?.badges?.find((b) => b.id === "exclude")?.ok ?? true,
    noUndefined: quality?.noUndefined ?? quality?.badges?.find((b) => b.id === "undefined")?.ok ?? true,
    charCountOk: quality?.charCountOk ?? quality?.badges?.find((b) => b.id === "chars")?.ok ?? true,
    factCheckPass: factCheck?.pass ?? true,
    riskyCount: factCheck?.riskyClaims?.length ?? 0,
    channel,
    pass: (quality?.pass ?? false) && (factCheck?.pass ?? true),
  };
}
