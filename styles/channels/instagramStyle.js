/**
 * 인스타그램 채널 — 저장되는 캡션 (2025~2026 로컬 브랜드 감성)
 */
import { polishInstaPack } from "@/lib/korean/writingTrends";
import { buildForbiddenList } from "@/utils/filterForbiddenWords";
import { cleanOutputText } from "@/utils/sanitizeInput";
import {
  countChars,
  clampByChars,
  formatHashtag,
  regionCompact,
  toInstaLineBreaks,
} from "@/lib/prompts/engine/textUtils";
import { getSeasonHint } from "@/lib/prompts/engine/seasonHints";
import { enrichInstaPack } from "@/lib/prompts/engine/enrichOutput";
import { INSTA_STYLE_HINTS } from "@/lib/prompts/examples/instagramExamples";
import { pickSituation, containsOverused } from "@/lib/prompts/situations";
import { pickSceneHook, pickSceneLine } from "@/lib/scene/sceneEngine";
import { applyEmojiDensity } from "@/lib/emoji/emojiDensityEngine";
import { INSTA_EMOJI_LEVEL_OPTIONS } from "@/lib/constants";
import { parseList } from "@/lib/prompts/engine/textUtils";
import { scrubExampleBrandsFromPack } from "@/utils/exampleBrandGuard";
import { buildWithRepetitionGuard } from "@/utils/repetitionGuard";
import { getInstaPersonaStyle } from "@/lib/persona/personaChannelStyle";
import { overlapsChannelText } from "@/lib/content/channelIsolation";
import { stripSourceCitations } from "@/lib/research/reinterpret";
import {
  adaptInstaLinesFromBlog,
  instaUsesBlogDerivation,
} from "@/lib/content/blogDerive";

export const INSTAGRAM_CHANNEL = {
  id: "instagram",
  goal: "저장 · 공감 · 감성",
  bodyMin: 60,
  bodyMax: 480,
  hookMax: 56,
  emojiMax: 5,
  sentenceStyle: "short-poetic",
  lineBreakEvery: 1,
  ctaStyle: "save-soft",
  emotionLevel: "high",
  banned: [
    "안녕하세요 여러분",
    "소개해드릴게요",
    "오늘은",
    "검색창",
    "키워드",
    "블로그",
    "체크리스트",
    "상권",
    "비교해 보시면",
    "도움이 되길 바라요",
    "정리했습니다",
    "저장해두세요",
    "필요할 때 다시",
    "다시 보세요",
    "체크해보세요",
  ],
};

const SCROLL_STOP_HOOKS = [
  "생각보다 사람은 작은 변화에 기분이 달라진다",
  "오늘 하루가 길었다면",
  "괜찮은 하루는 의외로 단순하다",
  "문득 선물이 필요해지는 날이 있다",
  "비 오는 날, 집이 유난히 조용할 때",
  "늦은 시간에도 문이 열려 있다는 것만으로",
];

const HOOKS = {
  flower: {
    emotional: [
      "꽃은 생각보다 많은 말을 대신한다",
      "퇴근길에 괜히 꽃 한 다발 사고 싶은 날이 있다",
      "기념일이 갑자기 다가오면, 먼저 떠오르는 게 꽃인 날",
    ],
    informative: [
      "꽃 고를 때 이것만 기억해 두면 편해요",
      "생화 상태, 리본, 메시지 카드 — 순서만 달라요",
    ],
    premium: [
      "말 없이 분위기로 전해지는 선물",
      "꽃다발 하나로 공간 톤이 바뀌는 날",
    ],
    minimal: ["{region} · 꽃", "짧게 남겨둡니다"],
  },
  cafe: {
    emotional: [
      "커피 한 잔이 하루의 속도를 바꿀 때가 있다",
      "창밖만 바라봐도 괜찮은 오후",
    ],
    informative: [
      "좌석·소음·와이파이 — 카페 고를 때 이 세 가지",
    ],
    premium: [
      "조용한 테이블, 은은한 조도",
    ],
    minimal: ["☕", "오늘의 자리"],
  },
  hospital: {
    emotional: ["몸이 먼저 신호를 보내는 날이 있다"],
    informative: [
      "내원 전에 확인하면 편한 것들",
      "접수·주차·대기 — 미리 보면 마음이 가벼워요",
    ],
    premium: ["차분한 공간이 먼저 와닿는 곳"],
    minimal: ["방문 전 안내"],
  },
  default: {
    emotional: [
      "괜히 이곳이 떠올라서, 솔직히 적어봤어요",
      "사진보다 현장이 더 나은 날이 있다",
    ],
    informative: [
      "처음 가기 전에, 이것만 확인해 두면 돼요",
    ],
    premium: ["말 없이 분위기가 먼저 말해 주는 곳"],
    minimal: ["짧은 기록"],
  },
};

function industryKey(ctx, flavor) {
  const k = flavor?.legacyKey || ctx.industryKey;
  if (k === "flower" || /꽃/.test(ctx.industryLabel || "")) return "flower";
  if (k === "cafe") return "cafe";
  if (k === "hospital") return "hospital";
  return "default";
}

function hasUnmanned(ctx) {
  return /무인|24시간/.test((ctx.includeList || []).join(" "));
}

function pickHook(ctx, toneKey, usedPhrases, insights) {
  const marketerScene = (ctx.instaScene || "").trim();
  if (
    marketerScene.length >= 8 &&
    marketerScene.length <= INSTAGRAM_CHANNEL.hookMax
  ) {
    return clampByChars(cleanOutputText(marketerScene), 12, INSTAGRAM_CHANNEL.hookMax);
  }
  const angle = ctx.instaHookAngle || toneKey;
  if (angle === "tip" && ctx.topic) {
    return clampByChars(
      cleanOutputText(`${ctx.topic} — 이것만 기억해 두세요`),
      12,
      INSTAGRAM_CHANNEL.hookMax
    );
  }
  if (angle === "offer" && (ctx.placeOffer || ctx.benefit)) {
    const o = (ctx.placeOffer || ctx.benefit || "").trim();
    if (o.length < 40) {
      return clampByChars(cleanOutputText(o), 12, INSTAGRAM_CHANNEL.hookMax);
    }
  }
  const scene = insights?.sceneLines?.[0];
  if (scene && scene.length >= 12 && scene.length <= INSTAGRAM_CHANNEL.hookMax) {
    return clampByChars(cleanOutputText(scene), 12, INSTAGRAM_CHANNEL.hookMax);
  }
  const seed = countChars(ctx.main) + countChars(ctx.region) + (ctx.feedbackSeed || 0);
  const scroll = SCROLL_STOP_HOOKS[seed % SCROLL_STOP_HOOKS.length];
  if (scroll && !containsOverused(scroll)) {
    return clampByChars(cleanOutputText(scroll), 12, INSTAGRAM_CHANNEL.hookMax);
  }
  const sceneHook = pickSceneHook(ctx, ctx.flavor);
  if (sceneHook && !containsOverused(sceneHook)) {
    return clampByChars(cleanOutputText(sceneHook), 12, INSTAGRAM_CHANNEL.hookMax);
  }
  const sit = pickSituation(ctx, usedPhrases);
  if (sit.hook && !containsOverused(sit.hook)) {
    return clampByChars(cleanOutputText(sit.hook), 12, INSTAGRAM_CHANNEL.hookMax);
  }
  const key = industryKey(ctx, ctx.flavor);
  const pool = HOOKS[key]?.[toneKey] || HOOKS.default[toneKey] || HOOKS.default.emotional;
  let hook = pool[(countChars(ctx.main) + countChars(ctx.region)) % pool.length];
  hook = hook.replace("{region}", ctx.region || "");
  return clampByChars(cleanOutputText(hook), 12, INSTAGRAM_CHANNEL.hookMax);
}

const INSTA_BODY_LENGTH = {
  short: { min: 60, max: 180, blogLines: 2 },
  medium: { min: 120, max: 320, blogLines: 3 },
  long: { min: 200, max: 480, blogLines: 5 },
};

function instaEmojiDensity(ctx) {
  const level = ctx.instaEmojiLevel || "balanced";
  const opt = INSTA_EMOJI_LEVEL_OPTIONS.find((o) => o.value === level);
  return opt?.density || "medium";
}

function resolveInstaHashtags(ctx, flavor, season, toneKey) {
  const count = Math.min(
    5,
    Math.max(0, Number(ctx.instaHashtagCount ?? 5))
  );
  if (ctx.instaHashtagMode === "manual") {
    const manual = parseList(ctx.instaManualHashtags || "")
      .map(formatHashtag)
      .filter(Boolean);
    return manual.slice(0, count);
  }
  return buildHashtags(ctx, flavor, season).slice(0, count);
}

function buildBodyLines(ctx, flavor, toneKey, insights, usedPhrases) {
  const lenSpec =
    INSTA_BODY_LENGTH[ctx.instaBodyLength || "medium"] ||
    INSTA_BODY_LENGTH.medium;
  const { region, brandName, includeList } = ctx;
  const b = brandName;
  const inc = includeList?.[0];
  const key = industryKey(ctx, flavor);
  const sit = pickSituation(ctx, usedPhrases);
  const sceneLine = pickSceneLine(ctx, flavor, usedPhrases);
  const instaPersona = getInstaPersonaStyle(ctx.contentPersona || "brand_story", ctx);
  const prefixedScene =
    instaPersona.bodyPrefix && sceneLine
      ? `${instaPersona.bodyPrefix}\n${sceneLine}`
      : sceneLine;

  const voice = ctx.brandResearch?.searchVoices?.[0];
  const lines =
    key === "flower"
      ? compact([
          "생각보다 꽃은\n기분을 빨리 바꾼다",
          prefixedScene && prefixedScene.length < 80 ? prefixedScene : null,
          hasUnmanned(ctx) ? "늦은 시간에도 들를 수 있어요." : null,
          voice && voice.length < 44 ? voice : null,
          b ? b : null,
        ])
      : key === "cafe"
        ? compact([
            "조용한 자리, 은은한 조도 — 오래 머물기 좋은 타입",
            `${region} 근처에서 잠깐 쉬고 싶을 때 떠올리는 곳`,
            inc,
            b,
          ])
        : compact([
            insights?.emotionalLine?.slice(0, 50) || null,
            b ? `${b} · ${region}` : `${region}`,
            inc,
            sit.line || "말 길게 안 할게요. 사진만 봐도 느낌이 전해질 거예요.",
          ]);

  let body = adaptInstaLinesFromBlog(
    lines.slice(0, lenSpec.blogLines),
    insights,
    toneKey
  ).join("\n");
  body = stripSourceCitations(body);
  if (ctx._blogFingerprint && overlapsChannelText(body, ctx._blogFingerprint)) {
    body = lines.filter((l) => !overlapsChannelText(l, ctx._blogFingerprint)).join("\n") || body;
  }
  const maxBody = lenSpec.max;
  if (countChars(body) > maxBody) {
    body = clampByChars(body, lenSpec.min, maxBody);
  } else if (countChars(body) < lenSpec.min && insights?.emotionalLine) {
    body = clampByChars(
      `${body}\n\n${insights.emotionalLine}`.trim(),
      lenSpec.min,
      maxBody
    );
  }
  return body;
}

function compact(arr) {
  return arr.filter(Boolean).map((s) => cleanOutputText(String(s)));
}

function buildEnding(toneKey, ctx) {
  const marketerCta = (ctx.instaCta || "").trim();
  if (marketerCta) {
    return clampByChars(cleanOutputText(marketerCta), 4, 72);
  }
  const goal = ctx.instaCampaignGoal || "save";
  if (goal === "engage") {
    return ctx.brandName
      ? `${ctx.brandName} · 댓글·DM 환영해요`
      : "댓글·DM 환영해요";
  }
  if (goal === "visit") {
    return ctx.brandName
      ? `${ctx.brandName} · 프로필·플레이스에서 확인`
      : "프로필·플레이스에서 확인";
  }
  const instaPersona = getInstaPersonaStyle(ctx.contentPersona || "brand_story", ctx);
  if (instaPersona.ending) return instaPersona.ending;
  const b = ctx.brandName;
  if (toneKey === "minimal") return "";
  if (toneKey === "informative") {
    return b ? `${b} · 플레이스에서 운영 시간 확인` : "플레이스에서 운영 시간 확인";
  }
  if (toneKey === "premium") {
    return b ? `${b}` : "";
  }
  return b ? `${b}` : "";
}

function buildHashtags(ctx, flavor, season) {
  const rc = regionCompact(ctx.region);
  const raw = [
    ctx.main,
    ...ctx.subList.slice(0, 4),
    rc,
    ctx.brandName?.replace(/\s/g, ""),
    flavor.label,
    season.label,
    "일상기록",
    "저장각",
    "감성",
    "로컬브랜드",
    "주말",
  ];
  return [...new Set(raw.map(formatHashtag).filter(Boolean))].slice(0, 22);
}

function buildInstagramPackOnce({ ctx, flavor, purpose, tone, toneKey, insights }) {
  const key = toneKey || tone?.value || "emotional";
  const season = getSeasonHint();
  const usedPhrases = new Set();
  const isShortForm = ctx.instaFormat === "short";
  let hook = pickHook(ctx, key, usedPhrases, insights);
  if (isShortForm && hook) {
    hook = clampByChars(hook, 12, 48);
  }
  const body = buildBodyLines(ctx, flavor, key, insights, usedPhrases);
  const ending = buildEnding(key, ctx);
  const blocks = isShortForm
    ? [hook, body, ending]
    : compact([hook, body, ending]);
  const lineBreakBody = toInstaLineBreaks(
    blocks.filter(Boolean).join("\n\n")
  );
  const hashtags = resolveInstaHashtags(ctx, flavor, season, key);
  const ctxForEmoji = { ...ctx, emojiDensity: instaEmojiDensity(ctx) };

  let pack = {
    hook,
    body,
    lineBreakBody,
    ending,
    hashtags,
    legacyBody: lineBreakBody,
    _meta: {
      channel: "instagram",
      style: "insta-scene-caption",
      styleHints: INSTA_STYLE_HINTS,
      bodyChars: countChars(body),
      hashtagCount: hashtags.length,
      instaTone: key,
      instaFormat: ctx.instaFormat || "feed",
      instaBodyLength: ctx.instaBodyLength || "medium",
      instaHashtagMode: ctx.instaHashtagMode || "auto",
      blogAdapted: instaUsesBlogDerivation({ hook, body }, insights),
    },
  };

  pack = filterInstaPack(pack, buildForbiddenList(ctx));
  pack = polishInstaPack(pack);
  pack = scrubExampleBrandsFromPack(pack, "instagram", ctx.brandName);
  pack = applyEmojiDensity(pack, "instagram", ctxForEmoji);
  return enrichInstaPack(pack, ctx, {
    includePhrases: ctx.includePhrases,
    includeList: ctx.includeList,
    industryKey: ctx.industryKey,
  });
}

export function buildInstagramContent(args) {
  const { pack, regenAttempts, regenReason } = buildWithRepetitionGuard(
    (seedCtx) =>
      buildInstagramPackOnce({
        ...args,
        ctx: seedCtx,
      }),
    args.ctx,
    [],
    { channel: "instagram", maxAttempts: 3 }
  );
  return {
    ...pack,
    _meta: { ...pack._meta, regenAttempts, regenReason },
  };
}

function filterInstaPack(insta, forbidden) {
  const scrub = (t) => {
    let s = cleanOutputText(t);
    forbidden.forEach((w) => {
      if (w?.length >= 2) s = s.replace(new RegExp(w, "gi"), "");
    });
    INSTAGRAM_CHANNEL.banned.forEach((b) => {
      if (s.includes(b)) s = s.replace(b, "");
    });
    return s.trim();
  };

  const hook = scrub(insta.hook);
  const body = scrub(insta.body);
  const ending = scrub(insta.ending);
  const lineBreakBody = toInstaLineBreaks([hook, body, ending].filter(Boolean).join("\n\n"));

  return {
    ...insta,
    hook,
    body,
    ending,
    lineBreakBody,
    legacyBody: lineBreakBody,
  };
}

export function buildInstagramFromBlog(ctx, insights, toneKey, baseLabel) {
  const pack = buildInstagramContent({
    ctx,
    flavor: ctx.flavor,
    purpose: ctx.purpose,
    tone: ctx.tone,
    toneKey,
    insights,
  });
  return {
    ...pack,
    _meta: {
      ...pack._meta,
      pipeline: "blog-derive",
      derivedFrom: "blogContent",
      sourceBlogTitle: insights?.title,
      baseLabel,
      channelVoice: "save-caption",
    },
  };
}
