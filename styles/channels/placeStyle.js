/**
 * 플레이스 채널 — 공지/방문 유도 (블로그 요약 금지)
 */
import { polishPlacePack } from "@/lib/korean/writingTrends";
import { enrichPlacePack } from "@/lib/prompts/engine/enrichOutput";
import { PLACE_STYLE_HINTS } from "@/lib/prompts/examples/placeExamples";
import { buildForbiddenList } from "@/utils/filterForbiddenWords";
import { cleanOutputText } from "@/utils/sanitizeInput";
import { countChars, clampByChars, formatHashtag, regionCompact } from "@/lib/prompts/engine/textUtils";
import { getSeasonHint } from "@/lib/prompts/engine/seasonHints";
import { overlapsChannelText } from "@/lib/content/channelIsolation";
import { stripSourceCitations } from "@/lib/research/reinterpret";
import { applyEmojiDensity } from "@/lib/emoji/emojiDensityEngine";
import { scrubExampleBrandsFromPack } from "@/utils/exampleBrandGuard";
import { buildWithRepetitionGuard } from "@/utils/repetitionGuard";
import { getPlacePersonaStyle } from "@/lib/persona/personaChannelStyle";
import {
  adaptPlaceLineFromBlog,
  placeUsesBlogDerivation,
} from "@/lib/content/blogDerive";

const PLACE_TYPE_SPECS = {
  notice: {
    prefix: "[공지]",
    detailLead: "안내 내용",
    detailMax: 320,
  },
  holiday: {
    prefix: "[연휴·휴무]",
    detailLead: "운영 일정",
    detailMax: 340,
  },
  newProduct: {
    prefix: "[신제품]",
    detailLead: "상품·구성",
    detailMax: 360,
  },
  event: {
    prefix: "[이벤트]",
    detailLead: "혜택·기간",
    detailMax: 340,
  },
  hours: {
    prefix: "[운영]",
    detailLead: "영업·예약",
    detailMax: 300,
  },
  general: {
    prefix: "",
    detailLead: "상세 안내",
    detailMax: 280,
  },
};

export const PLACE_CHANNEL = {
  id: "smartplace",
  goal: "보고 방문 — 사장님 공지",
  totalChars: { min: 200, max: 520 },
  titleChars: { min: 14, max: 44 },
  shortMax: 120,
  detailMax: 380,
  emojiMax: 2,
  sentenceStyle: "short-direct",
  ctaStyle: "visit-now",
  emotionLevel: "low",
  banned: [
    "알아보시다 보면",
    "체류",
    "SEO",
    "키워드",
    "블로그",
    "검색창",
    "상권 분석",
    "비교해 보시면",
    "과장 없이 적었",
    "감성",
    "분위기",
    "저장",
    "정리하자면",
    "소개해드릴",
    "솔직 후기",
    "다녀왔",
    "방문 후기",
  ],
};

function hasUnmanned(ctx) {
  const inc = (ctx.includeList || []).join(" ");
  return /무인|24시간|셀프/.test(inc) || ctx.purposeType === "newOpen";
}

function pickOps(ctx) {
  const inc = ctx.includeList || [];
  return {
    line1: inc[0] || ctx.benefit || null,
    line2: inc[1] || null,
    hours: inc.find((x) => /24|시간|운영/.test(x)),
    event: inc.find((x) => /이벤트|행사|가정의달|시즌/.test(x)),
  };
}

function industryKey(ctx, flavor) {
  return flavor?.legacyKey || ctx.industryKey || "default";
}

/** 한 게시물 = 핵심 메시지 1개만 */
function pickSinglePlaceMessage(ctx, flavor, season, ops, insights = {}) {
  const key = industryKey(ctx, flavor);
  const research = ctx.brandResearch?.summary;
  const reinterpreted = ctx.brandResearch?.searchVoices?.[0];

  const candidates = [];

  if (ops.event) {
    candidates.push({
      type: "event",
      core: ops.event.includes("완료") ? ops.event : `${ops.event} 안내드립니다.`,
    });
  }
  if (ctx.benefit && ctx.benefit.length < 36) {
    candidates.push({ type: "event", core: `${ctx.benefit}` });
  }
  if (research?.recentIssues?.[0]) {
    candidates.push({
      type: "season",
      core: `${research.recentIssues[0]} 관련 안내드립니다.`,
    });
  }

  if (key === "flower") {
    if (hasUnmanned(ctx)) {
      candidates.push({
        type: "hours",
        core: "늦은 시간 구매 가능하도록 수량 보충해 두었습니다.",
      });
    }
    candidates.push(
      { type: "stock", core: "주말 한정 꽃다발 입고되었습니다." },
      { type: "stock", core: "이번 주 생화 입고 — 인기 구성 수량 보충했습니다." }
    );
  } else if (key === "cafe") {
    candidates.push({ type: "menu", core: "이번 주 시즌 메뉴 입고되었습니다." });
  } else if (key === "hospital") {
    candidates.push({
      type: "reservation",
      core: "이번 주 예약·접수 일정 안내드립니다.",
    });
  } else {
    candidates.push({
      type: "ops",
      core: `${season.label} 운영 안내드립니다.`,
    });
  }

  if (ops.blogTip && ops.blogTip.length >= 12 && ops.blogTip.length <= 44) {
    candidates.unshift({
      type: "blog_fact",
      core: adaptPlaceLineFromBlog(ops.blogTip, insights, 44),
    });
  }
  if (ops.line1 && ops.line1.length < 40 && !/많은|문의주/.test(ops.line1)) {
    candidates.unshift({ type: "ops", core: `${ops.line1}` });
  }
  const offer = (ctx.placeOffer || "").trim();
  if (offer && offer.length < 44) {
    candidates.unshift({ type: "event", core: offer });
  }
  const period = (ctx.placePeriod || "").trim();
  if (period && period.length < 42) {
    candidates.unshift({ type: "hours", core: period });
  }
  if (reinterpreted && reinterpreted.length < 42) {
    candidates.push({ type: "brand", core: reinterpreted });
  }

  const seed =
    (ctx.feedbackSeed || 0) + countChars(ctx.main) + countChars(ctx.region);
  const pick =
    candidates.find((c) => c.core.length >= 12 && c.core.length <= 42) ||
    candidates[seed % candidates.length] ||
    candidates[0];
  const core = cleanOutputText(pick?.core || "운영 소식 안내드립니다.");
  let detail =
    pick?.type === "hours" || pick?.type === "reservation"
      ? "플레이스·전화로 문의 주세요."
      : null;
  if (!detail && ops.blogOps && ops.blogOps.length >= 12 && ops.blogOps.length <= 58) {
    detail = adaptPlaceLineFromBlog(ops.blogOps, insights, 58);
  }

  return { coreMessage: core, detailLine: detail, messageType: pick?.type };
}

function compact(arr) {
  return arr.filter(Boolean).map((s) => cleanOutputText(s));
}

function getPlaceTypeSpec(ctx) {
  const key = ctx.placePostType || "general";
  return PLACE_TYPE_SPECS[key] || PLACE_TYPE_SPECS.general;
}

function buildStructuredDetail(ctx, single, ops, typeSpec, personaStyle) {
  const parts = [];
  const period = (ctx.placePeriod || "").trim();
  if (period) {
    parts.push(stripSourceCitations(clampByChars(`일정: ${period}`, 6, 90)));
  }
  const offer = (ctx.placeOffer || "").trim();
  if (offer) {
    parts.push(stripSourceCitations(clampByChars(offer, 8, typeSpec.detailMax)));
  }
  const hint = (ctx.placeKeyFacts || ctx.placeDetailHint || "").trim();
  if (hint) {
    parts.push(stripSourceCitations(clampByChars(hint, 24, typeSpec.detailMax)));
  } else if (single.detailLine) {
    parts.push(
      stripSourceCitations(clampByChars(single.detailLine, 12, typeSpec.detailMax))
    );
  }

  const type = ctx.placePostType || "general";
  if (type === "holiday") {
    if (ops.hours) parts.unshift(clampByChars(`운영: ${ops.hours}`, 8, 80));
    else if (ctx.hours) parts.unshift(clampByChars(`운영: ${ctx.hours}`, 8, 80));
    else parts.unshift("연휴·휴무 일정은 플레이스·전화로 확인해 주세요.");
  } else if (type === "hours") {
    if (ops.hours || ctx.hours) {
      parts.unshift(clampByChars(`운영 시간: ${ops.hours || ctx.hours}`, 8, 90));
    }
    if (ctx.phone) parts.push(clampByChars(`문의: ${ctx.phone}`, 6, 40));
  } else if (type === "newProduct") {
    if (ctx.benefit) parts.push(clampByChars(ctx.benefit, 8, 100));
    if (ops.line2) parts.push(clampByChars(ops.line2, 8, 90));
  } else if (type === "event" && ops.event) {
    parts.push(clampByChars(ops.event, 8, 120));
  } else if (type === "notice" && ops.line1) {
    parts.push(clampByChars(ops.line1, 8, 100));
  }

  if (!parts.length && personaStyle?.detailHint) {
    parts.push(
      clampByChars(stripSourceCitations(personaStyle.detailHint), 12, 120)
    );
  }

  const joined = parts.filter(Boolean).join("\n");
  return joined
    ? clampByChars(joined, 20, typeSpec.detailMax)
    : clampByChars(
        `${typeSpec.detailLead}: 방문·문의 환영합니다. 자세한 내용은 플레이스에서 확인해 주세요.`,
        20,
        typeSpec.detailMax
      );
}

function ensurePlaceInformationDensity(detailBody, ctx = {}, typeSpec = PLACE_TYPE_SPECS.general) {
  const raw = String(detailBody || "").trim();
  let next = raw;
  const detailLen = raw.replace(/\s/g, "").length;
  if (detailLen >= 150) return clampByChars(next, 20, typeSpec.detailMax);
  const pads = [
    (ctx.placeOffer || "").trim() ? `혜택: ${(ctx.placeOffer || "").trim()}` : "",
    (ctx.placePeriod || "").trim() ? `기간: ${(ctx.placePeriod || "").trim()}` : "",
    "방문 전 확인: 예약·대기·이용 가능 시간은 매장·시기마다 달라질 수 있어, 플레이스·전화로 문의해 주세요.",
  ]
    .map((v) => cleanOutputText(v))
    .filter(Boolean);
  for (const line of pads) {
    if (!line || next.includes(line)) continue;
    next = `${next}\n${line}`.trim();
    if (next.replace(/\s/g, "").length >= 150) break;
  }
  return clampByChars(next, 20, typeSpec.detailMax);
}

const PLACE_CTA_COPY = {
  visit: "플레이스에서 자세히 확인해 주세요",
  call: "전화로 문의해 주세요",
  reserve: "예약·주문은 플레이스·전화로",
  today: "오늘 방문 환영합니다",
};

function buildCta(ctx, purpose) {
  const custom = (ctx.placeCtaNote || "").trim();
  if (custom) {
    return clampByChars(cleanOutputText(custom), 8, 48);
  }
  const typed = PLACE_CTA_COPY[ctx.placeCtaType];
  if (typed) {
    return clampByChars(cleanOutputText(typed), 8, 48);
  }
  const style = getPlacePersonaStyle(ctx.contentPersona || "brand_story", ctx);
  const cta = style.cta || purpose.cta?.replace(/[!！]+$/, "") || "방문·문의 환영합니다";
  return clampByChars(cleanOutputText(cta), 12, 48);
}

function buildHashtags(ctx, flavor, season) {
  const rc = regionCompact(ctx.region);
  const raw = [
    ctx.main,
    rc,
    ctx.brandName?.replace(/\s/g, ""),
    ...ctx.subList.slice(0, 3),
    flavor.label,
    season.label,
    "플레이스소식",
    "네이버플레이스",
    "동네소식",
  ];
  return [...new Set(raw.map(formatHashtag).filter(Boolean))].slice(0, 12);
}

/**
 * 블로그 인사이트 → 운영 사실만 추출 (요약문 복붙 금지)
 */
function factsFromInsights(insights, ctx) {
  if (!insights) return {};
  const points = (insights.keyPoints || [])
    .map((h) => h.replace(/—.*/, "").trim())
    .filter((h) => h.length < 24);
  const tip =
    insights.practicalTips?.[0] ||
    insights.visitReasons?.[0] ||
    insights.sectionHooks?.[0];
  return {
    topic: points[0] || null,
    mood: insights.emotionalLine?.slice(0, 40) || null,
    blogTip: tip || null,
    blogOps: insights.practicalTips?.[1] || null,
  };
}

function buildPlacePackOnce({ ctx, flavor, purpose, tone, insights }) {
  const ops = { ...pickOps(ctx), ...factsFromInsights(insights, ctx) };
  const season = getSeasonHint();
  const single = pickSinglePlaceMessage(ctx, flavor, season, ops, insights);
  const placeStyle = getPlacePersonaStyle(ctx.contentPersona || "brand_story", ctx);
  const typeSpec = getPlaceTypeSpec(ctx);
  const headline = (ctx.placeHeadline || "").trim();

  let title = headline
    ? stripSourceCitations(clampByChars(headline, 14, PLACE_CHANNEL.titleChars.max))
    : stripSourceCitations(clampByChars(single.coreMessage, 14, PLACE_CHANNEL.titleChars.max));
  if (typeSpec.prefix && !title.startsWith("[")) {
    title = clampByChars(`${typeSpec.prefix} ${title}`, 14, PLACE_CHANNEL.titleChars.max);
  } else if (placeStyle.titlePrefix && !title.startsWith("[")) {
    title = clampByChars(
      `${placeStyle.titlePrefix} ${title}`,
      14,
      PLACE_CHANNEL.titleChars.max
    );
  }
  if (ctx.contentPersona === "local_guide" && ctx.region && !headline) {
    title = clampByChars(`${ctx.region} ${ctx.brandName || ""} 매장 안내`.trim(), 14, 36);
  }
  if (ctx._blogFingerprint && overlapsChannelText(title, ctx._blogFingerprint)) {
    title = clampByChars(`${season.label} 운영 안내드립니다.`, 14, 36);
  }
  const shortBody = clampByChars(
    stripSourceCitations(single.coreMessage),
    20,
    PLACE_CHANNEL.shortMax
  );
  let detailBody = buildStructuredDetail(
    ctx,
    single,
    ops,
    typeSpec,
    placeStyle
  );
  detailBody = ensurePlaceInformationDensity(detailBody, ctx, typeSpec);
  const cta = buildCta(ctx, purpose);
  const hashtags = buildHashtags(ctx, flavor, season);

  let pack = {
    title,
    shortNotice: shortBody,
    shortBody,
    detailBody,
    cta,
    hashtags,
    body: `${shortBody}\n\n${detailBody}`.trim(),
    _meta: {
      channel: "smartplace",
      style: "place-structured-notice",
      placePostType: ctx.placePostType || "general",
      messageType: single.messageType,
      singleMessage: true,
      styleHints: PLACE_STYLE_HINTS,
      titleChars: countChars(title),
      shortChars: countChars(shortBody),
      detailChars: countChars(detailBody),
      totalChars: countChars(shortBody) + countChars(detailBody),
      hashtagCount: hashtags.length,
      blogAdapted: placeUsesBlogDerivation(
        { title, shortBody, detailBody },
        insights
      ),
    },
  };

  const forbidden = buildForbiddenList(ctx);
  pack = filterPlacePack(pack, forbidden);
  pack = polishPlacePack(pack);
  pack = scrubExampleBrandsFromPack(pack, "place", ctx.brandName);
  pack = applyEmojiDensity(pack, "place", ctx);
  return enrichPlacePack(pack, ctx, {
    includePhrases: ctx.includePhrases,
    includeList: ctx.includeList,
    benefit: ctx.benefit,
    storeFeatures: ctx.storeFeatures,
    industryKey: ctx.industryKey,
  });
}

export function buildPlaceContent(args) {
  const { pack, regenAttempts, regenReason } = buildWithRepetitionGuard(
    (seedCtx) =>
      buildPlacePackOnce({
        ...args,
        ctx: seedCtx,
      }),
    args.ctx,
    [],
    { channel: "place", maxAttempts: 3 }
  );
  return {
    ...pack,
    _meta: { ...pack._meta, regenAttempts, regenReason },
  };
}

function filterPlacePack(place, forbidden) {
  const f = (t) => {
    let s = cleanOutputText(t);
    for (const w of forbidden) {
      if (w.length >= 2) s = s.replace(new RegExp(w, "gi"), "");
    }
    PLACE_CHANNEL.banned.forEach((b) => {
      if (s.includes(b)) s = s.replace(b, "");
    });
    return s.trim();
  };

  return {
    ...place,
    title: f(place.title),
    shortBody: f(place.shortBody),
    detailBody: f(place.detailBody),
    cta: f(place.cta),
    body: `${f(place.shortBody)}\n\n${f(place.detailBody)}`.trim(),
  };
}

/** 파이프라인: 블로그 기반 → 공지형 (요약문 아님) */
export function buildPlaceFromBlog(ctx, insights, baseLabel) {
  const pack = buildPlaceContent({
    ctx,
    flavor: ctx.flavor,
    purpose: ctx.purpose,
    tone: ctx.tone,
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
      channelVoice: "owner-notice",
      blogInsights: insights,
    },
  };
}
