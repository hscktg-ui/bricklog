/**
 * 상세페이지 95점 바 — 구성·시각 모듈. 글자 수로 채우지 않는다.
 */
import { assessDetailPageStandard } from "@/lib/product/detailPageStandard";
import { resolveDetailPageLength } from "@/lib/product/detailPageCatalog";
import { firstSentence, isEssayBulletList } from "@/lib/product/detailPageListDesign";

export const DETAIL_PAGE_TARGET_SCORE = 95;

/** 본문 최소. 0이면 카드·표·순서가 본문을 대신한다. */
export const DETAIL_PAGE_BODY_MIN = {
  hero: 24,
  intent: 0,
  problem: 0,
  explain: 0,
  observe: 20,
  feature: 0,
  scene: 20,
  brand: 16,
  notice: 12,
  cta: 16,
  usp: 0,
  spec: 0,
};

export const DETAIL_PAGE_COPY_FLOORS = {
  short: {
    minChars: 180,
    maxChars: 900,
    minSections: 4,
    required: ["hero", "intent", "usp", "cta"],
  },
  standard: {
    minChars: 280,
    maxChars: 2200,
    minSections: 8,
    required: ["hero", "intent", "explain", "usp", "observe", "feature", "scene", "spec", "cta"],
  },
  long: {
    minChars: 360,
    maxChars: 2600,
    minSections: 10,
    required: ["hero", "intent", "explain", "usp", "observe", "feature", "scene", "spec", "brand", "cta"],
  },
};

export function countDetailPageChars(text) {
  return String(text || "").replace(/\s/g, "").length;
}

export function flattenDetailPageText(pack) {
  return [
    pack?.headline,
    pack?.subhead,
    ...(pack?.sections || []).flatMap((s) => [
      s.kicker,
      s.title,
      s.body,
      ...(s.bullets || []),
      ...(s.rows || []).map((r) => (Array.isArray(r) ? r.join(" ") : "")),
      ...(s.faqs || []).flatMap((f) => [f?.q, f?.a]),
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}

function sectionMeetsDensity(section) {
  const type = section?.type;
  if (type === "usp" || type === "intent" || type === "problem") {
    return (
      (section.bullets || []).length >= 2 ||
      countDetailPageChars(section.title) >= 8
    );
  }
  if (type === "spec") return (section.rows || []).length >= 3;
  if (type === "explain") {
    return (
      (section.bullets || []).length >= 3 ||
      (section.rows || []).length >= 2 ||
      countDetailPageChars(section.body) >= 20
    );
  }
  if (type === "hero" || type === "cta" || type === "feature") {
    return countDetailPageChars(section.title) >= 6;
  }
  const min = DETAIL_PAGE_BODY_MIN[type] ?? 16;
  return countDetailPageChars(section.body) >= min || countDetailPageChars(section.title) >= 6;
}

function visualModulesOk(sections, lengthId) {
  const by = Object.fromEntries((sections || []).map((s) => [s.type, s]));
  const uspOk = (by.usp?.bullets || []).length >= 2;
  const intentOk =
    (by.intent?.bullets || []).length >= 2 ||
    countDetailPageChars(by.intent?.title) >= 8;
  if (lengthId === "short") return uspOk && intentOk;
  const specOk = (by.spec?.rows || []).length >= 3;
  const explainOk =
    (by.explain?.bullets || []).length >= 3 ||
    (by.explain?.rows || []).length >= 2 ||
    uspOk;
  return uspOk && intentOk && specOk && explainOk;
}

export function measureDetailPageCopy(pack, pageLength = "standard") {
  const lengthId = resolveDetailPageLength(pageLength).id;
  const floor = DETAIL_PAGE_COPY_FLOORS[lengthId] || DETAIL_PAGE_COPY_FLOORS.standard;
  const sections = pack?.sections || [];
  const types = new Set(sections.map((s) => s.type));
  const chars = countDetailPageChars(flattenDetailPageText(pack));
  const denseCount = sections.filter(sectionMeetsDensity).length;
  const breathOk = chars >= floor.minChars && chars <= floor.maxChars;
  return {
    lengthId,
    chars,
    sectionCount: sections.length,
    compositionOk: floor.required.every((type) => types.has(type)),
    densityOk: sections.length > 0 && denseCount >= Math.ceil(sections.length * 0.75),
    visualOk: visualModulesOk(sections, lengthId),
    breathOk,
    floor,
  };
}

export function scoreDetailPage(pack, input = {}, mode = "fallback") {
  const standard = assessDetailPageStandard(pack, input);
  const measured = measureDetailPageCopy(pack, input.pageLength || pack?.pageLength);
  const brand = String(input.brandName || pack?.brandName || "").trim();
  const text = flattenDetailPageText(pack);

  let score = 72;
  if (standard.ok) score += 8;
  else score -= Math.min(16, (standard.reasons?.length || 1) * 4);
  if (measured.sectionCount >= measured.floor.minSections) score += 5;
  if (measured.visualOk) score += 6;
  else if (measured.chars >= measured.floor.minChars) score += 2;
  if (measured.compositionOk) score += 4;
  if (measured.densityOk) score += 4;
  if (brand && text.includes(brand)) score += 2;
  if (!measured.breathOk && measured.chars > measured.floor.maxChars) score -= 6;
  score = Math.max(50, Math.min(DETAIL_PAGE_TARGET_SCORE, Math.round(score)));

  return {
    score,
    grade: score >= 95 ? "A" : score >= 86 ? "A-" : score >= 76 ? "B" : "C",
    standard,
    ...measured,
  };
}

export function fillDetailPageToGrade(live, fallback) {
  const liveBy = new Map((live?.sections || []).map((s) => [s.type, s]));
  const sections = (fallback?.sections || []).map((fb) => {
    const cur = liveBy.get(fb.type);
    if (!cur) return fb;
    const liveBullets = cur.bullets || [];
    const bullets = isEssayBulletList(liveBullets)
      ? fb.bullets || liveBullets
      : liveBullets.length >= 2
        ? liveBullets
        : fb.bullets || liveBullets;
    const rows =
      (cur.rows || []).length >= 2 ? cur.rows : fb.rows || cur.rows || [];
    const title = countDetailPageChars(cur.title) >= 8 ? cur.title : fb.title;
    return {
      ...fb,
      ...cur,
      title,
      heading: title,
      body: firstSentence(cur.body || fb.body || ""),
      bullets,
      rows,
      kicker: cur.kicker || fb.kicker,
    };
  });
  return {
    ...fallback,
    ...live,
    headline: live?.headline || fallback?.headline,
    subhead: live?.subhead || fallback?.subhead,
    sections,
  };
}
