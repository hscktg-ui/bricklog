/** Research Mode — 조사 유형·결과 스키마 */

export const RESEARCH_TYPE_OPTIONS = [
  { id: "latest", label: "최신 정보 검색" },
  { id: "local", label: "지역 정보 조사" },
  { id: "competitor", label: "경쟁사 조사" },
  { id: "keyword", label: "키워드 조사" },
  { id: "trend", label: "트렌드 조사" },
  { id: "articles", label: "기사 수집" },
];

export const RESEARCH_QUERY_PLACEHOLDERS = [
  "판교 꽃집 소비 트렌드",
  "문경다원 녹차 특징",
  "수원 카페 데이트코스",
  "파마스퀘어 건강식품 시장",
];

export const DEFAULT_RESEARCH_INPUT = {
  researchEnabled: false,
  researchTypes: [],
  researchQuery: "",
};

/** @typedef {{ title?: string, url?: string, note?: string }} ResearchSource */
/** @typedef {{ name?: string, note?: string }} ResearchCompetitor */
/**
 * @typedef {{
 *   summary: string;
 *   sources: ResearchSource[];
 *   keywords: string[];
 *   competitors: ResearchCompetitor[];
 *   mode?: string;
 *   disclaimer?: string;
 *   researchedAt?: string;
 * }} ResearchResult
 */

export function normalizeResearchTypes(types) {
  const allowed = new Set(RESEARCH_TYPE_OPTIONS.map((o) => o.id));
  return [...new Set((types || []).filter((t) => allowed.has(t)))];
}

export function researchTypeLabels(typeIds = []) {
  const map = Object.fromEntries(
    RESEARCH_TYPE_OPTIONS.map((o) => [o.id, o.label])
  );
  return normalizeResearchTypes(typeIds).map((id) => map[id] || id);
}
