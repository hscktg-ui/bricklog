/**
 * 상세페이지 95점 바 — 길이·구성·밀도. 글꼴 스케일은 catalog 토큰.
 */
import { assessDetailPageStandard } from "@/lib/product/detailPageStandard";
import { resolveDetailPageLength } from "@/lib/product/detailPageCatalog";

export const DETAIL_PAGE_TARGET_SCORE = 95;

export const DETAIL_PAGE_BODY_MIN = {
  hero: 120,
  intent: 180,
  problem: 180,
  explain: 200,
  observe: 170,
  feature: 150,
  scene: 150,
  brand: 130,
  notice: 60,
  cta: 80,
  usp: 0,
  spec: 0,
};

export const DETAIL_PAGE_COPY_FLOORS = {
  short: {
    minChars: 1000,
    minSections: 4,
    required: ["hero", "intent", "usp", "cta"],
  },
  standard: {
    minChars: 1500,
    minSections: 8,
    required: ["hero", "intent", "explain", "usp", "observe", "feature", "spec", "cta"],
  },
  long: {
    minChars: 2400,
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
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}

function sectionMeetsDensity(section) {
  const type = section?.type;
  if (type === "usp") return (section.bullets || []).length >= 3;
  if (type === "spec") return (section.rows || []).length >= 3;
  const min = DETAIL_PAGE_BODY_MIN[type] ?? 48;
  return countDetailPageChars(section.body) >= min;
}

export function measureDetailPageCopy(pack, pageLength = "standard") {
  const lengthId = resolveDetailPageLength(pageLength).id;
  const floor = DETAIL_PAGE_COPY_FLOORS[lengthId] || DETAIL_PAGE_COPY_FLOORS.standard;
  const sections = pack?.sections || [];
  const types = new Set(sections.map((s) => s.type));
  const chars = countDetailPageChars(flattenDetailPageText(pack));
  const denseCount = sections.filter(sectionMeetsDensity).length;
  return {
    lengthId,
    chars,
    sectionCount: sections.length,
    compositionOk: floor.required.every((type) => types.has(type)),
    densityOk: sections.length > 0 && denseCount >= Math.ceil(sections.length * 0.75),
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
  if (measured.chars >= measured.floor.minChars) score += 6;
  if (measured.compositionOk) score += 4;
  if (measured.densityOk) score += 4;
  if (brand && text.includes(brand)) score += 2;
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
    const min = DETAIL_PAGE_BODY_MIN[fb.type] ?? 48;
    let body = cur.body || "";
    if (min > 0 && countDetailPageChars(body) < min) {
      body = countDetailPageChars(body) >= 20 ? `${body} ${fb.body || ""}`.trim() : fb.body;
    }
    const bullets =
      (cur.bullets || []).length >= 3 ? cur.bullets : fb.bullets || cur.bullets || [];
    const rows = (cur.rows || []).length >= 3 ? cur.rows : fb.rows || cur.rows || [];
    const title = countDetailPageChars(cur.title) >= 8 ? cur.title : fb.title;
    return {
      ...fb,
      ...cur,
      title,
      heading: title,
      body,
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
