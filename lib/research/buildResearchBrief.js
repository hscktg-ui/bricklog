import { formatChannelInsightsForBrief } from "@/lib/research/topicChannelResearch";
import { researchTypeLabels } from "./types";

/**
 * 블로그 프롬프트·Brand Memory 연동용 조사 요약 텍스트
 * @param {import("./types").ResearchResult|null} result
 * @param {{ query?: string, types?: string[] }} [meta]
 */
export function buildResearchBrief(result, meta = {}) {
  if (!result?.summary?.trim()) return "";

  const typeLine = researchTypeLabels(meta.types || []).join(", ");
  const kw = (result.keywords || []).slice(0, 12).join(", ");
  const comp = (result.competitors || [])
    .slice(0, 6)
    .map((c) => `${c.name || "경쟁"}: ${c.note || ""}`.trim())
    .filter(Boolean)
    .join(" · ");
  const src = (result.sources || [])
    .slice(0, 5)
    .map((s) => s.title || s.note || s.url)
    .filter(Boolean)
    .join(" · ");

  const channelBlock = formatChannelInsightsForBrief(result.channelInsights);
  const publicSignals = meta.publicSignalsBrief?.trim();

  const lines = [
    "【RESEARCH · 브랜드·주제 조사 (국내·해외 채널 참고)】",
    meta.query ? `조사 주제: ${meta.query}` : null,
    typeLine ? `조사 유형: ${typeLine}` : null,
    `요약: ${result.summary.trim()}`,
    channelBlock || null,
    publicSignals || null,
    kw ? `키워드: ${kw}` : null,
    comp ? `경쟁·벤치: ${comp}` : null,
    src ? `참고 출처(검증 필요): ${src}` : null,
    result.disclaimer ? `주의: ${result.disclaimer}` : null,
    "본문 작성 시 위 조사를 이 요청 브랜드·주제·지역에 맞게만 반영하세요. 사실 단정·원문 인용·타 매체 문장 복사 금지.",
  ].filter(Boolean);

  return lines.join("\n").slice(0, 3200);
}

/**
 * DB·Brand Memory 확장용 직렬화
 */
export function serializeResearchForStorage(query, result, types = []) {
  const sources = (result?.sources || []).map((s) => ({
    title: s.title || "",
    url: s.url || "",
    note: s.note || "",
  }));
  return {
    research_query: String(query || "").slice(0, 500),
    research_result: {
      summary: result?.summary || "",
      keywords: result?.keywords || [],
      competitors: result?.competitors || [],
      types: researchTypeLabels(types),
      mode: result?.mode || "llm_synthesis",
    },
    research_date: result?.researchedAt || new Date().toISOString(),
    research_source: sources,
  };
}
