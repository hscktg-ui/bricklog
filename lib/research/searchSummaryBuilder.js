import { stripSourceCitations } from "./reinterpret";

/**
 * Brand Research Summary → 프롬프트·엔진용
 */
export function buildSearchSummary(brandResearch) {
  if (!brandResearch) return "";
  const s = brandResearch.summary;
  const statusLabel =
    brandResearch.sourceStatus === "search_based"
      ? "검색 기반"
      : brandResearch.sourceStatus === "search_inferred"
        ? "공개 맥락 추론(원문 복사 없음)"
        : "사용자 입력 기반";

  const lines = [
    `[브랜드 조사 · ${statusLabel}]`,
    brandResearch.noCopyRule,
    s?.uniqueness && `고유성: ${s.uniqueness}`,
    s?.operationStyle && `운영 방식: ${s.operationStyle}`,
    s?.coreStrengths?.length
      ? `핵심 강점:\n- ${s.coreStrengths.join("\n- ")}`
      : null,
    s?.brandTraits?.length
      ? `브랜드 특징:\n- ${s.brandTraits.join("\n- ")}`
      : null,
    s?.mainKeywords?.length
      ? `주요 키워드: ${s.mainKeywords.join(", ")}`
      : null,
    s?.recentIssues?.length
      ? `최근 이슈(참고): ${s.recentIssues.join(" · ")}`
      : null,
    s?.regionalTraits?.length
      ? `지역: ${s.regionalTraits.join(" · ")}`
      : null,
    brandResearch.knownFacts?.length
      ? `사용자 입력(우선):\n- ${brandResearch.knownFacts.join("\n- ")}`
      : null,
    brandResearch.cautionNotes?.length
      ? `주의:\n- ${brandResearch.cautionNotes.join("\n- ")}`
      : null,
  ].filter(Boolean);

  return stripSourceCitations(lines.join("\n\n"));
}

export function buildSearchSummaryBrief(brandResearch) {
  const full = buildSearchSummary(brandResearch);
  if (!full) return "브랜드 조사: 사용자 입력만 반영";
  return full.slice(0, 1400);
}

/** UI용 한 줄 요약 */
export function buildResearchStatusLabel(brandResearch) {
  if (!brandResearch) return "조사 대기";
  const s = brandResearch.summary;
  const traits = s?.brandTraits?.length || 0;
  const status =
    brandResearch.sourceStatus === "search_inferred"
      ? "브랜드 맥락 반영"
      : "입력 기반";
  return `${status} · 특징 ${traits}건`;
}
