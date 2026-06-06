/**
 * 브랜드 위키 — 브랜드·조사 정보를 검증 가능한 엔티티로 구조화
 */
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";

export const BRAND_WIKI_VERSION = "v1";
export const MIN_WIKI_ENTRIES = 3;

const WIKI_FIELDS = [
  { id: "brand", label: "브랜드", pick: (m) => m.brandName || m.name },
  { id: "region", label: "지역", pick: (m) => m.region },
  { id: "industry", label: "업종", pick: (m) => m.industry || m.industryLabel },
  { id: "product", label: "제품·서비스", pick: (m) => m.productName || m.mainProduct },
  { id: "philosophy", label: "브랜드 철학", pick: (m) => m.brandPhilosophy || m.brandStory },
  { id: "tone", label: "톤·말투", pick: (m) => m.tone || m.brandTone },
  { id: "hours", label: "운영·시간", pick: (m) => m.businessHours || m.hours },
  { id: "contact", label: "문의·연락", pick: (m) => m.contact || m.phone },
  { id: "usp", label: "차별점", pick: (m) => m.uniqueSellingPoint || m.differentiator },
  { id: "audience", label: "고객", pick: (m) => m.targetAudience || m.audience },
];

function normalizeEntry(id, label, value, source = "brand_memory") {
  const text = String(value || "").trim();
  if (!text || text.length < 2) return null;
  return { id, label, value: text.slice(0, 400), source };
}

/**
 * @param {Record<string, unknown>} input
 */
export function buildBrandWiki(input = {}) {
  const mem = input.brandMemory || {};
  const entries = [];

  for (const field of WIKI_FIELDS) {
    const row = normalizeEntry(field.id, field.label, field.pick(mem));
    if (row) entries.push(row);
  }

  if (mem.brandDescription) {
    entries.push(
      normalizeEntry("description", "브랜드 소개", mem.brandDescription)
    );
  }
  if (mem.preferredPhrases) {
    entries.push(
      normalizeEntry("preferred", "선호 표현", mem.preferredPhrases)
    );
  }
  if (mem.avoidedExpressions) {
    entries.push(
      normalizeEntry("avoided", "지양 표현", mem.avoidedExpressions)
    );
  }

  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  for (const [i, row] of facts.entries()) {
    const fact = String(row?.fact || row || "").trim();
    if (fact.length < 6) continue;
    entries.push({
      id: `research_${i}`,
      label: "조사 사실",
      value: fact.slice(0, 400),
      source: row?.source || "research",
    });
  }

  const seen = new Set();
  const unique = entries.filter((e) => {
    const key = `${e.label}:${e.value.slice(0, 48)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    version: BRAND_WIKI_VERSION,
    entries: unique,
    count: unique.length,
    ok: unique.length >= MIN_WIKI_ENTRIES,
  };
}

export function formatBrandWikiBrief(wiki = {}) {
  if (!wiki.entries?.length) return "";
  const lines = wiki.entries.slice(0, 24).map((e) => `- ${e.label}: ${e.value}`);
  return ["【브랜드 위키】", ...lines].join("\n").slice(0, 2400);
}

/**
 * 조사·위키가 주제를 설명할 수 있는지 (생성 전 보조 검증)
 */
export function assessBrandWikiReadiness(input = {}) {
  const wiki = buildBrandWiki(input);
  const blob = wiki.entries.map((e) => e.value).join("\n");
  const brand = String(input.brandName || input.brandMemory?.brandName || "").trim();
  const hasBrand = !brand || blob.includes(brand);
  return {
    ok: wiki.ok && hasBrand,
    wiki,
    entryCount: wiki.count,
    hasBrandAnchor: hasBrand,
    minEntries: MIN_WIKI_ENTRIES,
  };
}
