import { getTodayInspiration } from "@/lib/inspiration/todayInspiration";
import { getActiveSeasonContext } from "@/lib/season/seasonEngine";
import { buildSessionWritingTips } from "@/lib/inspiration/writingContextTips";
import { adaptWritingContextPack } from "@/lib/inspiration/channelSuggestionAdapter";
import { buildBrandLogSuggestionChips } from "@/lib/memory/brandLogTopicEngine";

const STOP = new Set([
  "을",
  "를",
  "이",
  "가",
  "은",
  "는",
  "의",
  "에",
  "와",
  "과",
  "로",
  "으로",
  "에서",
  "에게",
  "까지",
  "부터",
  "하기",
  "하는",
  "있는",
  "없는",
  "대한",
  "위한",
  "오늘",
  "이번",
  "주제",
]);

/** 주제·키워드·포함 문구에서 맥락 토큰 추출 */
export function extractTopicTokens(...texts) {
  const joined = texts.filter(Boolean).join(" ");
  const tokens = [];
  for (const part of joined.split(/[\s,，·、/|]+/)) {
    const t = part.replace(/[^\p{L}\p{N}]/gu, "").trim();
    if (t.length < 2 || STOP.has(t)) continue;
    tokens.push(t);
  }
  return [...new Set(tokens)];
}

function relevanceScore(text, tokens) {
  if (!tokens.length) return 1;
  const hay = String(text || "").toLowerCase();
  let score = 0;
  for (const tok of tokens) {
    const key = tok.toLowerCase();
    if (hay.includes(key)) score += Math.min(key.length, 8);
  }
  return score;
}

function rankByRelevance(items, tokens, textFn = (x) => x) {
  return [...items]
    .map((item) => ({
      item,
      score: relevanceScore(textFn(item), tokens),
    }))
    .sort((a, b) => b.score - a.score);
}

function seasonTagsForDate(date) {
  const ctx = getActiveSeasonContext(date);
  return [
    ctx.label,
    ctx.mood,
    ...(ctx.tags || []),
    ...(ctx.eventTags || []),
    ctx.eventLabel,
  ].filter(Boolean);
}

function seasonRelevantToTopic(tokens, date) {
  if (!tokens.length) return false;
  const tags = seasonTagsForDate(date);
  return tags.some((tag) => relevanceScore(tag, tokens) > 0);
}

function buildTopicAngles(topic, tokens, date) {
  const t = topic.trim();
  const angles = [
    {
      type: "topic",
      title: `${t} — 방문·이용 전에 드는 생각`,
      body: "검색·비교하다 매장을 고르는 순간을 가볍게 담아보세요.",
    },
    {
      type: "topic",
      title: `${t} — 오늘의 한 장면`,
      body: "실제 이용·구매·상담 장면 하나만 구체적으로 그려보세요.",
    },
    {
      type: "topic",
      title: `${t} — 다시 찾는 이유`,
      body: "단골·재방문·추천으로 이어지는 포인트를 짧게 정리해 보세요.",
    },
  ];

  if (seasonRelevantToTopic(tokens, date)) {
    const ctx = getActiveSeasonContext(date);
    angles.push({
      type: "topic-season",
      title: `${t} · ${ctx.label} 흐름`,
      body: `${ctx.eventLabel || ctx.label}과 맞는 장면·혜택을 주제에 자연스럽게 엮어 보세요.`,
    });
  }

  return angles;
}

function buildTopicScenes(topic, rankedScenes, tokens) {
  const t = topic.trim();
  const derived = [
    `${t} 첫 방문`,
    `${t} 단골 이야기`,
    `${t} 후기·추천`,
  ];
  const picked = rankedScenes
    .filter((r) => r.score > 0)
    .map((r) => r.item)
    .slice(0, 4);
  return [...new Set([...picked, ...derived])].slice(0, 6);
}

/**
 * 작성 맥락 힌트 — 주제가 있으면 시의성·장면을 주제에 맞게 정렬·필터
 */
function filterLowRelevanceStories(stories, tokens) {
  if (!tokens.length) return stories;
  return stories.filter((s) => {
    if (s.title === "비 오는 날입니다") {
      const rainHints = ["비", "장마", "실내", "창가", "따뜻"];
      return tokens.some((t) => rainHints.some((h) => t.includes(h) || h.includes(t)));
    }
    return relevanceScore(`${s.title} ${s.body}`, tokens) > 0 || s.type === "calendar";
  });
}

/** 입력·맥락 기반 주제/장면 추천 칩 (최대 6) */
export function buildTopicSuggestionChips(pack, options = {}) {
  const focus = String(options.topic || options.mainKeyword || "").trim();
  const brand = String(options.brandName || "").trim();
  const chips = [];

  const brandLogChips = buildBrandLogSuggestionChips(
    {
      brandName: brand,
      region: options.region,
      industry: options.industryKey || options.industryLabel,
      storeFeatures: options.storeFeatures,
      brandDescription: options.brandDescription,
      includePhrases: options.includePhrases || options.services,
      services: options.services,
      preferredKeywords: options.preferredKeywords,
      recentTopics: options.recentTopics,
    },
    4
  );
  chips.push(...brandLogChips);

  if (focus) {
    chips.push(focus);
    const angles = (pack?.stories || [])
      .filter((s) => s.type?.startsWith("topic"))
      .map((s) => s.title?.split("—")[0]?.trim() || s.title)
      .filter(Boolean);
    chips.push(...angles.slice(0, 2));
  }

  for (const scene of (pack?.scenes || []).slice(0, 4)) {
    if (scene && !chips.includes(scene)) chips.push(scene);
  }

  if (brand && focus) {
    chips.push(`${brand} · ${focus.slice(0, 16)}`);
  } else if (brand) {
    chips.push(`${brand} 소개`);
  }

  const timely = (pack?.stories || []).find(
    (s) => s.type === "calendar" || s.type === "event" || s.type === "season"
  );
  if (timely?.title && chips.length < 6) {
    const t = timely.title.split("—")[0].trim();
    if (focus) chips.push(`${focus.slice(0, 12)} · ${t.slice(0, 14)}`);
    else chips.push(t);
  }

  return [...new Set(chips.map((c) => c.trim()).filter(Boolean))].slice(0, 6);
}

function buildWritingPack(options) {
  const base = getTodayInspiration(options);
  const sessionTips = buildSessionWritingTips({
    contentDate: options.date,
    industryKey: options.industryKey,
    brandName: options.brandName,
    region: options.region,
    industryLabel: options.industryLabel,
    brandTone: options.brandTone || options.differentiator,
    brandPhilosophy: options.brandPhilosophy,
    services: options.services,
    targetCustomer: options.targetCustomer,
    topic: options.topic,
    mainKeyword: options.mainKeyword,
    subKeyword: options.subKeyword,
    includePhrases: options.includePhrases,
    recentTopics: options.recentTopics,
    generationCount: options.generationCount,
    trendLine: options.trendLine,
  });
  const topic = String(options.topic || "").trim();
  const mainKeyword = String(options.mainKeyword || "").trim();
  const subKeyword = String(options.subKeyword || "").trim();
  const includePhrases = String(options.includePhrases || "").trim();

  if (!topic && !mainKeyword && !subKeyword) {
    return {
      ...base,
      scoped: false,
      topicLabel: null,
      tips: sessionTips.tips,
      previewLine:
        sessionTips.previewLine ||
        (base.stories[0]?.title != null
          ? `${base.dateLabel} · ${base.stories
              .slice(0, 2)
              .map((s) => s.title)
              .join(" · ")}`
          : `${base.dateLabel} · ${base.seasonLabel}`),
      suggestionChips: buildTopicSuggestionChips(
        { stories: base.stories, scenes: base.scenes },
        options
      ),
    };
  }

  const focus = topic || mainKeyword || subKeyword.split(/[,，]/)[0]?.trim() || "";
  const tokens = extractTopicTokens(topic, mainKeyword, subKeyword, includePhrases);
  const date = options.date
    ? new Date(`${options.date}T12:00:00`)
    : new Date();

  const rankedStories = rankByRelevance(
    base.stories,
    tokens,
    (s) => `${s.title} ${s.body}`
  );
  const matchedStories = filterLowRelevanceStories(
    rankedStories.filter((r) => r.score > 0).map((r) => r.item),
    tokens
  );

  const topicAngles = buildTopicAngles(focus, tokens, date);
  const stories = [
    ...topicAngles.slice(0, 3),
    ...matchedStories.slice(0, 2),
  ].slice(0, 4);

  const rankedScenes = rankByRelevance(base.scenes, tokens);
  const scenes = buildTopicScenes(focus, rankedScenes, tokens);

  const topicShort =
    focus.length > 28 ? `${focus.slice(0, 28)}…` : focus;

  const previewLine = scenes[0]
    ? `「${topicShort}」 · ${scenes[0]}`
    : `「${topicShort}」 · ${base.seasonLabel}`;

  const pack = {
    ...base,
    scoped: true,
    topicLabel: topicShort,
    tips: sessionTips.tips,
    previewLine: sessionTips.previewLine || previewLine,
    brandLine: base.brandLine
      ? `${base.brandLine} · 주제「${topicShort}」`
      : `주제「${topicShort}」에 맞춘 맥락`,
    stories,
    scenes,
    emotions: rankByRelevance(base.emotions, tokens, (e) => e)
      .filter((r) => r.score > 0)
      .map((r) => r.item)
      .concat(base.emotions)
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 4),
    suggestionChips: buildTopicSuggestionChips(
      { stories, scenes, topicLabel: topicShort },
      { ...options, topic: focus }
    ),
  };
  return pack;
}

export function getWritingContextHints(options = {}) {
  const channel = options.channel || "blog";
  const pack = buildWritingPack(options);
  return adaptWritingContextPack(pack, channel);
}
