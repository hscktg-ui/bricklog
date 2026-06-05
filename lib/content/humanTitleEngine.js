/**
 * BRICLOG Human Title Engine — 지역→상황→브랜드→주제 (키워드 나열 금지)
 * 업종·브랜드·지역·주제 하드코딩 없음
 */
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { buildNaverLearnedTitleCandidates } from "@/lib/channel/naverBlogEngineRules";

const NATURAL_TITLE_MARKERS =
  /에서|라면|있다면|한다면|전에|보다|먼저|찾|기준|포인트|고민|이야기|체험|알아|봐야|정리|읽을|질문|비교|후기|느낀|헷갈|선택|방문|고를|한눈|체크|솔루션|방식|이유|다녀|솔직|FAQ|포인트|맥락|주의|분석|차이|대안|느껴|겪|바라보|설명하는|알두|짚|안내|소식|문의|예약|운영|공지|확인/;

const PROMO_TAIL_RE = /특별\s*할인|할인\s*행사|프로모션|이벤트|행사/gi;

export function topicCore(input = {}, ctx = {}) {
  return String(
    input.topic ||
      input.mainKeyword ||
      ctx.topic ||
      ctx.main ||
      "이용"
  )
    .trim()
    .split(/[,，]/)[0]
    ?.trim()
    .replace(PROMO_TAIL_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function topicFull(input = {}, ctx = {}) {
  return String(
    input.topic ||
      input.mainKeyword ||
      ctx.topic ||
      ctx.main ||
      "이용"
  )
    .trim()
    .split(/[,，]/)[0]
    ?.trim();
}

export function titleContext(ctx = {}, input = {}) {
  const region = String(ctx.region || input.region || "").trim();
  const brand = String(ctx.brandName || input.brandName || "").trim();
  const core = topicCore(input, ctx) || "이용";
  const full = topicFull(input, ctx) || core;
  return { region, brand, topic: core, topicFull: full };
}

export function titleIncludesAllEntities(title, ctx = {}, input = {}) {
  const t = String(title || "");
  const { region, brand, topic, topicFull } = titleContext(ctx, input);
  if (brand && !t.includes(brand)) return false;
  if (region && !t.includes(region)) return false;
  const topicHit =
    (topic && t.includes(topic)) ||
    (topicFull && t.includes(topicFull)) ||
    (topic &&
      topic.split(/\s+/).some((w) => w.length >= 2 && t.includes(w)));
  return Boolean(topicHit);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** SEO 키워드 나열·기계적 · 구분 제목 */
export function isMechanicalListingTitle(title, ctx = {}, input = {}) {
  const t = String(title || "").trim();
  if (!t || t.length < 8) return false;

  const { region, brand, topic, topicFull } = titleContext(ctx, input);

  if (/[?？]/.test(t) && NATURAL_TITLE_MARKERS.test(t)) return false;
  if (/[,，].{4,}/.test(t) && NATURAL_TITLE_MARKERS.test(t)) return false;

  const mechanicalDot = [region, brand, topicFull || topic].filter(Boolean).join(" · ");
  if (mechanicalDot && t.replace(/\s/g, "") === mechanicalDot.replace(/\s/g, "")) {
    return true;
  }

  const parts = t.split(/\s*[·｜|]\s*/).filter(Boolean);
  if (parts.length >= 3 && parts.every((p) => p.length <= 22) && !NATURAL_TITLE_MARKERS.test(t)) {
    return true;
  }

  if (
    /^[^,，?！!]+[\s·｜|]+[^,，?！!]+[\s·｜|]+[^,，?！!]+$/u.test(t) &&
    !NATURAL_TITLE_MARKERS.test(t)
  ) {
    return true;
  }

  if (region && brand && (topic || topicFull)) {
    const hasAll =
      t.includes(region) && t.includes(brand) && (t.includes(topic) || t.includes(topicFull));
    if (hasAll && !NATURAL_TITLE_MARKERS.test(t)) {
      const stackRe = new RegExp(
        `${escapeRegExp(region)}\\s+${escapeRegExp(brand)}\\b`,
        "i"
      );
      if (stackRe.test(t)) return true;

      const tokens = t.split(/\s+/).filter(Boolean);
      if (tokens.length <= 7) {
        const entityLike = tokens.filter(
          (tok) =>
            tok.includes(region) ||
            tok.includes(brand) ||
            (topic && tok.includes(topic)) ||
            (topicFull && tok.includes(topicFull)) ||
            /특별할인|할인|프로모션|이벤트|행사/.test(tok)
        );
        if (entityLike.length >= 3 && entityLike.length >= tokens.length - 1) {
          return true;
        }
      }
    }
  }

  return false;
}

const SITUATION_BY_PERSPECTIVE = {
  brand: (c) => [
    `${koreanObjectParticle(c.topic)} 바라보는 시선`,
    `${c.topic}에 담긴 이야기`,
  ],
  customer: (c) => [
    `${koreanObjectParticle(c.topic)} 고민한다면`,
    `${c.topic} 고민할 때`,
  ],
  informational: (c) => [
    `${koreanObjectParticle(c.topic)} 확인 전`,
    `${c.topic} 알아두면 좋은 정보`,
  ],
  expert: (c) => [
    `${c.topic} 선택이 어려울 때`,
    `${koreanObjectParticle(c.topic)}, 헷갈리기 쉬운 기준`,
  ],
  comparison: (c) => [
    `${koreanObjectParticle(c.topic)} 할인보다 먼저`,
    `${koreanObjectParticle(c.topic)} 비교 전`,
  ],
  review: (c) => [
    `${koreanObjectParticle(c.topic)} 다녀온 뒤`,
    `${c.topic} 체험 후`,
  ],
  storytelling: (c) => [
    `${koreanObjectParticle(c.topic)} 찾게 된 이유`,
    `이 선택의 순간`,
  ],
};

function perspectiveSituation(c, perspective = "brand", slot = 0) {
  const fn = SITUATION_BY_PERSPECTIVE[perspective] || SITUATION_BY_PERSPECTIVE.brand;
  const list = fn(c);
  return list[slot % list.length];
}

/**
 * 지역 → 상황 → 브랜드 → 주제 구조의 클릭형 제목 후보
 * @param {string} [perspective] — brand|customer|informational|expert|comparison|review|storytelling
 */
export function buildHumanClickTitles(ctx = {}, input = {}, perspective = "brand") {
  const c = titleContext(ctx, input);
  if (!c.brand && !c.topic) return ["오늘의 브랜드 이야기"];

  const regionBit = c.region ? `${c.region}에서 ` : "";
  const regionComma = c.region ? `${c.region} ` : "";
  const sit0 = perspectiveSituation(c, perspective, 0);
  const sit1 = perspectiveSituation(c, perspective, 1);

  const naverTitles = buildNaverLearnedTitleCandidates(ctx, input).filter((s) =>
    titleIncludesAllEntities(s, ctx, input)
  );

  const perspectiveLead =
    perspective === "comparison"
      ? c.region
        ? `${regionComma}${c.brand} ${c.topic}, ${sit0}`
        : `${c.brand} ${c.topic}, ${sit0}`
      : perspective === "brand"
        ? c.region
          ? `${regionBit}${sit0}, ${c.brand} ${c.topic} 체험 전 알아둘 것`
          : `${c.brand} ${c.topic}, ${sit0}`
        : null;

  const templates = [
    perspectiveLead,
    ...naverTitles,
    c.region
      ? `${regionBit}${sit0}, ${c.brand} ${c.topic} 체험 전 알아둘 것`
      : null,
    c.region
      ? `${regionComma}${c.brand}, ${sit1} 봐야 할 기준`
      : null,
    c.region
      ? `${regionBit}${koreanObjectParticle(c.topicFull || c.topic)} 찾게 된 이유, ${c.brand} ${c.topicFull} 이야기`
      : null,
    `${regionComma}${c.brand} ${c.topic}, ${sit1}`
      ? `${regionComma}${c.brand} ${c.topic}, ${sit1}`
      : null,
    c.region
      ? `${c.region}에서 ${c.brand} ${c.topic} — ${sit0}`
      : `${c.brand} ${c.topic}, ${sit0}`,
    `${c.brand} ${c.topic}, ${sit1}`,
    c.region ? `${regionBit}${sit0}, ${c.brand} ${c.topic}` : `${c.brand} ${c.topic}, ${sit0}`,
  ]
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, " ").trim().slice(0, 52))
    .filter((s) => titleIncludesAllEntities(s, ctx, input));

  return [...new Set(templates)].slice(0, 8);
}

export function rewriteMechanicalTitle(title, ctx = {}, input = {}, perspective = "brand") {
  const t = String(title || "").trim();
  if (!isMechanicalListingTitle(t, ctx, input) && titleIncludesAllEntities(t, ctx, input)) {
    return t;
  }
  return buildHumanClickTitles(ctx, input, perspective)[0] || t;
}
