/**
 * V12 — 구성안(PLAN) vs 발행 본문(WRITE) 판별·차단 (blog / place / instagram)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { LLM_USER_MESSAGES } from "@/lib/llm/messages";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";

function channelFullText(pack, channel) {
  if (!pack) return "";
  if (channel === "place") {
    return [pack.title, pack.shortNotice, pack.detailBody]
      .filter(Boolean)
      .join("\n");
  }
  if (channel === "instagram") {
    return [
      pack.hook,
      pack.body,
      pack.lineBreakBody,
      pack.ending,
      (pack.hashtags || []).join(" "),
    ]
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

/** 사용자 노출 금지 — PLAN 단계 전용 소제목 */
export const OUTLINE_PLAN_HEADING_PHRASES = [
  "이 주제가 필요한 실제 상황 정리",
  "비교·선택에서 막히는 지점 확인",
  "브랜드 맥락과 연결되는 근거 정리",
  "실행 전에 확인할 체크포인트",
  "마지막 의사결정 기준 요약",
  "글 구성안",
  "이야기 1",
  "이야기 2",
  "이야기 3",
  "이야기 4",
  "정리: 브랜드 자산으로 남기는 실행 제안",
  "기능 설명: 실제 운영에 필요한 제어 장치",
  "활용 방식: 팀 단위 적용과 검수 루틴",
  "문제 제기: 지금 콘텐츠 운영에서 막히는 지점",
  "원인 분석: 왜 기존 작성 방식이 반복 실패하는가",
  "브랜드 철학: 브랜드 기억과 방향성의 역할",
  "운영 흐름: 옵션값에서 실행 단계까지",
];

export const OUTLINE_BODY_MARKERS = [
  "【글 구성안",
  "【입력 정리】",
  "【추천 제목】",
  "【제목이 답해야 할 질문】",
  "【보완하면 좋은 정보】",
  "【공지 구성안",
  "【캡션 구성안",
  "공지 구성안",
  "캡션 구성안",
  "플레이스 구성안",
  LLM_USER_MESSAGES.briefOnlyBody,
  LLM_USER_MESSAGES.briefOnlyHint,
  "에 대한 글 구성안입니다",
  "에 대한 공지 구성안",
  "AI 생성 엔진이 연결되면",
  "→ 왜 이 주제가",
  "→ 왜 비교",
];

function normalizeHeading(text) {
  return String(text || "")
    .replace(/^[#\s*·\d.)]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function headingMatchesOutline(heading) {
  const h = normalizeHeading(heading);
  if (!h) return false;
  return OUTLINE_PLAN_HEADING_PHRASES.some(
    (phrase) => h === phrase || h.includes(phrase) || phrase.includes(h)
  );
}

function bodyLooksLikeOutlinePlan(body) {
  const t = String(body || "").trim();
  if (!t) return true;
  if (OUTLINE_BODY_MARKERS.some((m) => m && t.includes(m))) return true;
  const lines = t.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 3) {
    const bulletish = lines.filter((l) => /^[\d.)·*-]/.test(l)).length;
    const sceneHits = lines.filter((l) =>
      OUTLINE_PLAN_HEADING_PHRASES.some((p) => l.includes(p))
    ).length;
    if (sceneHits >= 2 || (bulletish >= 3 && t.length < 900)) return true;
  }
  return false;
}

function detectBlogOutlineLeak(pack) {
  const reasons = [];
  if (!pack) return { isOutline: true, reasons: ["empty_pack"] };

  if (pack._meta?.isBriefOnly || pack.mode === "brief_only") {
    reasons.push("brief_only_meta");
  }

  const sections = pack.sections || [];
  let outlineHeadings = 0;
  let thinBodies = 0;

  for (const sec of sections) {
    if (headingMatchesOutline(sec?.heading)) {
      outlineHeadings += 1;
      reasons.push("outline_heading");
    }
    const body = String(sec?.body || "").trim();
    if (body.length < 80 || bodyLooksLikeOutlinePlan(body)) {
      thinBodies += 1;
      reasons.push("outline_body");
    }
  }

  const full = getBlogFullText(pack);
  if (OUTLINE_BODY_MARKERS.some((m) => m && full.includes(m))) {
    reasons.push("outline_marker_in_fulltext");
  }
  if (/구성안입니다|구성안 —|구성안만/.test(full)) {
    reasons.push("outline_phrase_in_fulltext");
  }

  if (sections.length && outlineHeadings >= Math.min(2, sections.length)) {
    reasons.push("majority_outline_headings");
  }
  if (sections.length >= 2 && thinBodies >= sections.length - 1) {
    reasons.push("majority_thin_sections");
  }

  const unique = [...new Set(reasons)];
  return { isOutline: unique.length > 0, reasons: unique };
}

function detectPlaceOutlineLeak(pack) {
  const reasons = [];
  if (!pack) return { isOutline: true, reasons: ["empty_pack"] };
  if (pack.sections?.length) {
    const blogLike = detectBlogOutlineLeak(pack);
    if (blogLike.isOutline) return blogLike;
  }

  const title = String(pack.title || "").trim();
  const shortNotice = String(pack.shortNotice || pack.shortBody || "").trim();
  const detailBody = String(pack.detailBody || "").trim();
  const full = channelFullText(pack, "place");

  if (headingMatchesOutline(title)) reasons.push("outline_title");
  if (bodyLooksLikeOutlinePlan(shortNotice)) reasons.push("outline_short_notice");
  if (
    detailBody.replace(/\s/g, "").length < 80 ||
    bodyLooksLikeOutlinePlan(detailBody)
  ) {
    reasons.push("outline_detail_body");
  }
  if (OUTLINE_BODY_MARKERS.some((m) => m && full.includes(m))) {
    reasons.push("outline_marker_in_fulltext");
  }
  if (/구성안입니다|구성안 —|구성안만|체크포인트\s*확인/.test(full)) {
    reasons.push("outline_phrase_in_fulltext");
  }

  const unique = [...new Set(reasons)];
  return { isOutline: unique.length > 0, reasons: unique };
}

function detectInstagramOutlineLeak(pack) {
  const reasons = [];
  if (!pack) return { isOutline: true, reasons: ["empty_pack"] };
  if (pack.sections?.length) {
    const blogLike = detectBlogOutlineLeak(pack);
    if (blogLike.isOutline) return blogLike;
  }

  const hook = String(pack.hook || "").trim();
  const body = String(pack.lineBreakBody || pack.body || "").trim();
  const full = channelFullText(pack, "instagram");

  if (bodyLooksLikeOutlinePlan(hook)) reasons.push("outline_hook");
  if (body.replace(/\s/g, "").length < 40 || bodyLooksLikeOutlinePlan(body)) {
    reasons.push("outline_body");
  }
  if (OUTLINE_BODY_MARKERS.some((m) => m && full.includes(m))) {
    reasons.push("outline_marker_in_fulltext");
  }
  if (/구성안입니다|캡션\s*구성안|장면\s*→\s*감정/.test(full)) {
    reasons.push("outline_phrase_in_fulltext");
  }

  const unique = [...new Set(reasons)];
  return { isOutline: unique.length > 0, reasons: unique };
}

/**
 * @param {object} pack
 * @param {"blog"|"place"|"instagram"|string} [channel]
 * @returns {{ isOutline: boolean, reasons: string[] }}
 */
export function detectOutlineLeak(pack, channel = "blog") {
  if (channel === "place") return detectPlaceOutlineLeak(pack);
  if (channel === "instagram") return detectInstagramOutlineLeak(pack);
  return detectBlogOutlineLeak(pack);
}

export function isPublishableBlogPack(pack) {
  return !detectOutlineLeak(pack, "blog").isOutline;
}

export function isPublishableChannelPack(channel, pack) {
  if (!pack) return false;
  if (channel === "image") {
    return Boolean(
      pack.thumbnailPrompt?.trim() ||
        pack.placeImagePrompt?.trim() ||
        pack.instagramCardPrompt?.trim()
    );
  }
  return !detectOutlineLeak(pack, channel).isOutline;
}

/**
 * @param {object} input
 * @param {number} [count]
 */
export function buildBrandFocusedSectionHeadings(input = {}, count = 4) {
  const brand = String(input.brandName || "브랜드").trim();
  const region = String(input.region || "").trim();
  const topicRaw =
    String(input.topic || input.mainKeyword || "이야기").trim();
  const topic = topicRaw.split(/[,，]/)[0]?.trim() || topicRaw;
  const topicObj = koreanObjectParticle(topic);

  const templates = [
    region
      ? `${region}에서 ${topicObj} 알아보는 이유`
      : `${topicObj} 알아보는 이유`,
    `${brand} ${topic} 체험·비교 포인트`,
    region
      ? `${brand} ${region} 매장·프로모션 안내`
      : `${brand} 프로모션·행사 안내`,
    `${topic} 방문·구매 전 확인할 것`,
    `${brand}에서 직접 체험할 때`,
    `${region ? `${region} ` : ""}방문·예약·상담 안내`,
  ].filter(Boolean);

  return templates.slice(0, Math.max(1, count));
}

/**
 * 구성안 섹션을 발행용 본문 톤으로 최소 변환 (최후 폴백)
 */
export function rewriteOutlinePackToProse(pack, input = {}) {
  const brand = String(input.brandName || "브랜드").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || input.mainKeyword || "주제")
      .trim()
      .split(/[,，]/)[0]
      ?.trim() || "주제";
  const headings = buildBrandFocusedSectionHeadings(input, 4);

  const sections = (pack?.sections || []).map((sec, i) => {
    const heading = headings[i] || headings[headings.length - 1];
    let body = String(sec?.body || "").trim();
    if (headingMatchesOutline(sec?.heading) || bodyLooksLikeOutlinePlan(body)) {
      body = [
        region
          ? `${region}에서 ${koreanObjectParticle(topic)} 검토하는 분들이 ${brand} 매장을 찾는 경우가 많습니다.`
          : `${brand}를 선택하는 분들이 ${topic} 정보를 먼저 비교합니다.`,
        `이번 글에서는 ${brand}의 ${topic} 관련 체험 포인트, 행사·할인 조건, 방문·예약 방법을 실제 매장 기준으로 정리합니다.`,
        `감성 소개보다 선택 기준·비교 포인트·구매 전 확인 사항을 순서대로 안내합니다.`,
      ].join("\n\n");
    }
    return { heading, body: body.trim() };
  });

  while (sections.length < 4) {
    const i = sections.length;
    sections.push({
      heading: headings[i] || `${brand} ${topic}`,
      body: `${brand}${region ? ` ${region}` : ""} 기준으로 ${topic}를 준비할 때 방문·상담·구매 흐름을 차근차근 확인해 보세요.`,
    });
  }

  return {
    ...pack,
    sections,
    conclusion:
      pack?.conclusion?.trim() &&
      !bodyLooksLikeOutlinePlan(pack.conclusion)
        ? pack.conclusion
        : `${brand}${region ? ` ${region}` : ""}에서 ${topic}를 검토 중이라면, 매장 방문·체험·프로모션 조건을 한 번에 비교해 보시길 권합니다.`,
    _meta: {
      ...(pack._meta || {}),
      isBriefOnly: false,
      outlineRewritten: true,
      mode: "write_fallback",
    },
  };
}

/** @param {"place"|"instagram"} channel */
export function rewriteOutlineChannelPack(channel, pack, input = {}) {
  if (channel === "place") {
    const brand = String(input.brandName || "매장").trim();
    const region = String(input.region || "").trim();
    const topic = String(
      input.placeHeadline || input.topic || input.mainKeyword || "공지"
    )
      .trim()
      .split(/[,，]/)[0]
      ?.trim();
    const period = String(input.placePeriod || "").trim();
    const offer = String(input.placeOffer || "").trim();
    const title = [region, brand, topic].filter(Boolean).join(" ").slice(0, 44);
    const shortNotice = [period, offer || topic]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 120);
    const detailBody = [
      `${region ? `${region} ` : ""}${brand}에서 ${topic} 안내입니다.`,
      period ? `일정: ${period}` : null,
      offer ? `혜택: ${offer}` : null,
      `${brand} 매장 방문·체험·상담 후 ${topic} 조건을 확인해 주세요.`,
    ]
      .filter(Boolean)
      .join("\n\n");
    return {
      ...pack,
      title: title || pack.title,
      shortNotice: shortNotice || pack.shortNotice,
      shortBody: shortNotice || pack.shortBody,
      detailBody,
      body: [shortNotice, detailBody].filter(Boolean).join("\n\n"),
      _meta: {
        ...(pack._meta || {}),
        outlineRewritten: true,
        isBriefOnly: false,
      },
    };
  }

  if (channel === "instagram") {
    const brand = String(input.brandName || "브랜드").trim();
    const region = String(input.region || "").trim();
    const topic = String(input.topic || input.mainKeyword || "이야기")
      .trim()
      .split(/[,，]/)[0]
      ?.trim();
    const hook = `${region ? `${region} ` : ""}${topic} · ${brand}`.slice(
      0,
      56
    );
    const body = [
      `${brand} ${topic} 소식이에요.`,
      region
        ? `${region} 매장에서 체험·비교해 보세요.`
        : `매장에서 직접 확인해 보세요.`,
      `행사·혜택·방문 방법은 매장 안내 기준으로 확인해 주세요.`,
    ].join("\n\n");
    return {
      ...pack,
      hook,
      body,
      lineBreakBody: body,
      ending: `${brand}${region ? ` · ${region}` : ""}`,
      _meta: {
        ...(pack._meta || {}),
        outlineRewritten: true,
        isBriefOnly: false,
      },
    };
  }

  return rewriteOutlinePackToProse(pack, input);
}

/** PLAN 소제목을 고객용 소제목으로 치환 */
export function scrubOutlineHeadingsFromPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const headings = buildBrandFocusedSectionHeadings(input, pack.sections.length);
  return {
    ...pack,
    sections: pack.sections.map((sec, i) => {
      const heading = headingMatchesOutline(sec?.heading)
        ? headings[i] || headings[headings.length - 1]
        : sec.heading;
      return { ...sec, heading };
    }),
  };
}
