/**
 * 블로그 → 파생 채널 적응용 사실·장면 추출 (요약문 복붙 금지)
 */
import { cleanOutputText } from "@/utils/sanitizeInput";
import { countChars } from "@/lib/prompts/engine/textUtils";

const BLOG_TONE_BANS =
  /알아보시다|체류|SEO|키워드|검색창|체크리스트|정리하자면|소개해드릴|비교해\s*보시면|도움이\s*되/gi;

function blogExcerptLocal(blog, maxChars = 600) {
  if (!blog?.sections?.length) return "";
  const text = blog.sections.map((s) => `${s.heading}\n${s.body}`).join("\n\n");
  const noSpace = text.replace(/\s/g, "");
  if (noSpace.length <= maxChars) return text;
  return text.slice(0, Math.floor(maxChars * 1.15));
}

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => cleanOutputText(s))
    .filter((s) => s.length >= 10 && s.length <= 72);
}

function isUsableLine(s) {
  if (!s || s.length < 10) return false;
  if (BLOG_TONE_BANS.test(s)) return false;
  if (/^#{1,3}\s|^\d+\.|^[-•]/.test(s)) return false;
  return true;
}

function pickConcrete(lines, max = 6) {
  const out = [];
  for (const line of lines) {
    if (!isUsableLine(line)) continue;
    const concrete =
      /\d|시간|주차|예약|입고|메뉴|꽃|커피|방문|문의|위치|가격|이벤트|운영|무인|24/.test(
        line
      ) || line.length <= 48;
    if (concrete) out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * @param {object} blog
 * @returns {{
 *   visitReasons: string[],
 *   practicalTips: string[],
 *   emotionalBeats: string[],
 *   sceneLines: string[],
 *   sectionHooks: string[],
 *   closingLine: string | null,
 *   excerpt: string,
 * }}
 */
export function extractBlogDerivation(blog) {
  if (!blog) {
    return {
      visitReasons: [],
      practicalTips: [],
      emotionalBeats: [],
      sceneLines: [],
      sectionHooks: [],
      closingLine: null,
      excerpt: "",
    };
  }

  const sections = blog.sections || [];
  const allBodies = sections.map((s) => s.body || "").join("\n");
  const allHeadings = sections.map((s) => s.heading || "").filter(Boolean);
  const sentences = splitSentences(
    [blog.title, ...allHeadings, allBodies, blog.conclusion].join("\n")
  );

  const sectionHooks = sections
    .map((s) => splitSentences(s.body)[0])
    .filter(isUsableLine)
    .slice(0, 4);

  const sceneLines = pickConcrete(
    sentences.filter((s) => /늦|비|주말|퇴근|아침|저녁|문득|생각보다|오늘/.test(s)),
    4
  );

  const practicalTips = pickConcrete(
    sentences.filter((s) =>
      /시간|주차|예약|위치|문의|운영|입고|메뉴|가격|접수|안내/.test(s)
    ),
    5
  );

  const emotionalBeats = pickConcrete(
    sentences.filter((s) =>
      /느껴|마음|기분|공감|편해|조용|따뜻|설레|괜찮|좋았|기억/.test(s)
    ),
    4
  );

  const visitReasons = [
    ...pickConcrete(allHeadings.map((h) => h.replace(/—.*/, "").trim()), 2),
    ...sectionHooks.slice(0, 2),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const closingLine = blog.conclusion
    ? splitSentences(blog.conclusion).find(isUsableLine) || null
    : null;

  return {
    visitReasons: visitReasons.slice(0, 4),
    practicalTips: practicalTips.slice(0, 5),
    emotionalBeats: emotionalBeats.slice(0, 4),
    sceneLines: sceneLines.slice(0, 4),
    sectionHooks: sectionHooks.slice(0, 4),
    closingLine,
    excerpt: blogExcerptLocal(blog, 600),
  };
}

/** 피드백 → 파이프라인 입력·컨텍스트 패치 */
export function applyChannelFeedbackPatch(input = {}, feedbackText = "", channel = "place") {
  const t = String(feedbackText || "");
  const patch = { ...input };

  if (/이모지|emoji/i.test(t)) {
    if (channel === "instagram" || channel === "insta") {
      patch.emojiDensity = /줄|적|less|조금|만/i.test(t) ? "low" : "high";
    } else {
      patch.emojiDensity = /없|제거|none/i.test(t) ? "low" : "medium";
    }
  }
  if (/담백|간결|짧|상담\s*안내/i.test(t) && channel === "place") {
    patch.tone = "informative";
  }
  if (/감성|따뜻|공감/i.test(t) && (channel === "instagram" || channel === "insta")) {
    patch.tone = "emotional";
  }
  if (
    /정보형|차분|담백|설명/i.test(t) &&
    (channel === "blog" || channel === "story")
  ) {
    patch.tone = "informative";
  }
  if (/프리미엄|고급/i.test(t)) {
    patch.tone = "premium";
  }
  if (/키워드|검색|seo/i.test(t) && /줄|덜|적|과|반복/i.test(t)) {
    patch.keywordRepeatGuard = true;
    const extra = "최고, 1등, 무조건, 완치";
    patch.excludePhrases = [patch.excludePhrases, extra]
      .filter(Boolean)
      .join(", ");
  }
  if (/의료|광고\s*느낌|과장|완치|진단\s*보장/i.test(t)) {
    patch.sensitiveCategory = patch.sensitiveCategory || "medical";
    const medExtra = "완치, 100%, 최고, 무조건, 보장";
    patch.excludePhrases = [patch.excludePhrases, medExtra]
      .filter(Boolean)
      .join(", ");
  }
  if (/해시|태그|로컬|부산|해운대/i.test(t) && channel !== "place") {
    const regionTag = (patch.region || "").split(/\s+/)[0] || "";
    if (regionTag && !String(patch.instaTags || "").includes(regionTag)) {
      patch.instaLocalTagsHint = regionTag;
    }
  }

  return patch;
}

export function mergeDerivationIntoInsights(insights, blog) {
  const derived = extractBlogDerivation(blog);
  return {
    ...insights,
    ...derived,
    hasDerivation:
      derived.visitReasons.length > 0 ||
      derived.practicalTips.length > 0 ||
      derived.sceneLines.length > 0,
  };
}

export function feedbackRegenSeed(feedbackText = "") {
  let h = 0;
  const s = String(feedbackText);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 5;
}

export function placeUsesBlogDerivation(pack, insights) {
  if (!insights?.hasDerivation) return false;
  const text = [pack.title, pack.shortBody, pack.detailBody].join(" ");
  const needles = [
    ...(insights.practicalTips || []),
    ...(insights.visitReasons || []),
  ].map((n) => n.slice(0, 12));
  return needles.some((n) => n.length >= 8 && text.includes(n.slice(0, 8)));
}

export function instaUsesBlogDerivation(pack, insights) {
  if (!insights?.hasDerivation) return false;
  const text = [pack.hook, pack.body].join(" ");
  const needles = [
    ...(insights.sceneLines || []),
    ...(insights.emotionalBeats || []),
    ...(insights.sectionHooks || []),
  ].map((n) => n.slice(0, 14));
  return needles.some((n) => n.length >= 10 && text.includes(n.slice(0, 10)));
}

export function adaptPlaceLineFromBlog(line, insights, maxChars = 42) {
  const candidates = [
    ...(insights?.practicalTips || []),
    ...(insights?.visitReasons || []),
    insights?.closingLine,
  ].filter(Boolean);
  const pick = candidates.find((c) => countChars(c) <= maxChars) || candidates[0];
  if (!pick) return line;
  const adapted = cleanOutputText(pick);
  return adapted.length >= 12 ? adapted : line;
}

export function adaptInstaLinesFromBlog(lines, insights, toneKey) {
  const pool = [
    ...(insights?.sceneLines || []),
    ...(insights?.emotionalBeats || []),
    ...(insights?.sectionHooks || []),
  ].filter(isUsableLine);
  if (!pool.length) return lines;

  const adapted = [...lines];
  if (pool[0] && adapted.length > 0) {
    adapted[0] =
      toneKey === "minimal"
        ? cleanOutputText(pool[0].slice(0, 36))
        : cleanOutputText(pool[0].slice(0, 56));
  }
  if (pool[1] && adapted.length > 1) {
    adapted[1] = cleanOutputText(pool[1].slice(0, 64));
  }
  return adapted.filter(Boolean);
}
