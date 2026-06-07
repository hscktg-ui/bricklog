/**
 * BRAND KNOWLEDGE ENGINE — 브랜드 이해 없이 생성 금지
 */
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { assessBrandWikiReadiness } from "@/lib/evolution/brandWikiEngine";
import { classifyFactVerification } from "@/lib/product/brandJournalistDirective";

export const BRAND_KNOWLEDGE_VERSION = "v1";
export const MIN_BRAND_KNOWLEDGE_ITEMS = 3;

export const BRAND_KNOWLEDGE_DIMENSIONS = [
  { id: "intro", label: "브랜드 소개", patterns: [/소개|브랜드\s*스토리|운영\s*배경/] },
  { id: "service", label: "서비스", patterns: [/서비스|제공|프로그램|코스/] },
  { id: "product", label: "제품", patterns: [/제품|메뉴|라인업|상품|굿즈/] },
  { id: "operation", label: "운영 방식", patterns: [/운영|영업|예약|이용\s*방법/] },
  { id: "feature", label: "대표 특징", patterns: [/특징|강점|차별|시그니처/] },
  { id: "location", label: "위치", patterns: [/위치|주소|매장|지점|오시는/] },
  { id: "philosophy", label: "브랜드 철학", patterns: [/철학|가치|비전|미션/] },
  { id: "differentiation", label: "차별점", patterns: [/차별|다른\s*점|유일|독보/] },
];

function collectKnowledgeBlob(input = {}) {
  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  const factText = facts.map((f) => String(f?.fact || f || "")).join("\n");
  const mem = input.brandMemory || {};
  const parts = [
    factText,
    input.brandDescription,
    input.includePhrases,
    input.researchBrief,
    input.brandWikiBrief,
    mem.brandDescription,
    mem.brandPhilosophy,
    mem.uniqueSellingPoint,
    input.brandName,
    input.region,
    input.topic || input.mainKeyword,
  ];
  return parts.filter(Boolean).join("\n");
}

function dimensionSecured(dim, blob = "", brand = "") {
  const text = String(blob || "");
  if (dim.patterns.some((re) => re.test(text))) return true;
  if (brand && text.includes(brand) && dim.id !== "philosophy") return true;
  return false;
}

/**
 * @returns {{ ok: boolean, securedCount: number, secured: string[], missing: string[], items: object[] }}
 */
export function assessBrandKnowledge(input = {}) {
  const brand = String(input.brandName || "").trim();
  const blob = collectKnowledgeBlob(input);
  const wiki = assessBrandWikiReadiness(input);
  const verifiedFacts = collectMergedResearchFacts(input).filter(
    (row) => classifyFactVerification(row, input).verified
  );

  const items = BRAND_KNOWLEDGE_DIMENSIONS.map((dim) => ({
    ...dim,
    secured: dimensionSecured(dim, blob, brand),
  }));

  let securedCount = items.filter((i) => i.secured).length;
  if (wiki.ok) securedCount = Math.max(securedCount, wiki.entryCount >= 3 ? 3 : wiki.entryCount);
  if (verifiedFacts.length >= MIN_BRAND_KNOWLEDGE_ITEMS) {
    securedCount = Math.max(securedCount, MIN_BRAND_KNOWLEDGE_ITEMS);
  }

  const secured = items.filter((i) => i.secured).map((i) => i.id);
  const missing = items.filter((i) => !i.secured).map((i) => i.label);

  return {
    version: BRAND_KNOWLEDGE_VERSION,
    ok: securedCount >= MIN_BRAND_KNOWLEDGE_ITEMS,
    securedCount,
    minRequired: MIN_BRAND_KNOWLEDGE_ITEMS,
    secured,
    missing,
    items,
    wikiOk: wiki.ok,
    verifiedFactCount: verifiedFacts.length,
  };
}

export function formatBrandKnowledgeBrief(assessment = {}) {
  if (!assessment.items?.length) return "";
  const lines = assessment.items.map(
    (i) => `${i.secured ? "✓" : "·"} ${i.label}`
  );
  return [
    "【브랜드 지식 · BRAND KNOWLEDGE】",
    `확보 ${assessment.securedCount}/${assessment.minRequired}`,
    ...lines,
    assessment.ok ? "브랜드 이해 충분 — 작성 가능" : "브랜드 정보 부족 — 추가 조사",
  ].join("\n");
}
