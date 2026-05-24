import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { topicResearchSystemRules } from "@/lib/research/topicChannelResearch";
import { researchTypeLabels } from "./types";

function parseResearchJson(raw) {
  try {
    const data = JSON.parse(raw);
    return {
      summary: String(data.summary || "").trim(),
      sources: Array.isArray(data.sources) ? data.sources : [],
      keywords: Array.isArray(data.keywords)
        ? data.keywords.map(String).filter(Boolean)
        : [],
      competitors: Array.isArray(data.competitors) ? data.competitors : [],
      channelInsights: Array.isArray(data.channelInsights)
        ? data.channelInsights
        : [],
      mode: data.mode || "llm_synthesis",
      disclaimer:
        data.disclaimer ||
        "실시간 웹 검색이 연결되지 않은 경우, 공개 학습 지식·입력 맥락 기반 조사 초안입니다. 발행 전 사실을 확인하세요.",
      researchedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function offlineResearchFallback(query, types, brandContext = {}) {
  const typeLabels = researchTypeLabels(types);
  const region = brandContext.region || "";
  const brand = brandContext.brandName || "";
  return {
    summary: `「${query}」에 대한 조사 초안입니다. ${typeLabels.length ? `${typeLabels.join(", ")} 관점에서` : ""} ${region ? `${region} 지역` : "해당"} 맥락과 ${brand ? `「${brand}」` : "브랜드"} 포지션을 함께 고려해 글을 쓰면 좋습니다. AI 엔진이 연결되면 더 구체적인 요약이 제공됩니다.`,
    sources: [
      {
        title: "BRICLOG 조사 모드 (오프라인 초안)",
        url: "",
        note: "OpenAI 미연결 — 입력·브랜드 맥락만 반영",
      },
    ],
    keywords: query
      .split(/[\s,，·]+/)
      .filter((w) => w.length > 1)
      .slice(0, 8),
    competitors: brandContext.competitors
      ? String(brandContext.competitors)
          .split(/[,，]/)
          .map((n) => ({ name: n.trim(), note: "사용자 입력 경쟁사" }))
          .filter((c) => c.name)
      : [],
    mode: "offline_fallback",
    disclaimer:
      "OpenAI가 연결되지 않아 간단 초안만 제공됩니다. 연결 후 다시 조사해 주세요.",
    researchedAt: new Date().toISOString(),
  };
}

/**
 * @param {{
 *   query: string;
 *   types?: string[];
 *   brandContext?: Record<string, unknown>;
 * }} params
 */
export async function runResearch({ query, types = [], brandContext = {} }) {
  const q = String(query || "").trim();
  if (!q) {
    throw new Error("연구 주제를 입력해 주세요.");
  }

  if (!isOpenAIConfigured()) {
    return offlineResearchFallback(q, types, brandContext);
  }

  const typeLabels = researchTypeLabels(types);
  const system = `You are BRICLOG topic research — gather public signals for a specific brand's content request.
Return ONLY one JSON object:
{
  "summary": "4-8 sentences in Korean — synthesis for THIS brand to write about THIS topic",
  "keywords": ["..."],
  "competitors": [{"name":"...","note":"..."}],
  "sources": [{"title":"...","url":"","note":"..."}],
  "channelInsights": [{"channel":"...","finding":"...","keywords":["..."],"confidence":"high|medium|low"}],
  "disclaimer": "one line in Korean"
}
${topicResearchSystemRules()}
Rules:
- No markdown. Korean only for text fields.
- Write summary and findings so the downstream writer can draft for the requester brand (not generic SEO filler).
- If you cannot access live web, say so in disclaimer and infer cautiously from topic + brand context only.
- Do not invent specific statistics or news dates unless clearly labeled as general trend.
- sources.url may be empty if unknown; never fabricate real news URLs.`;

  const user = `조사 쿼리(브랜드·주제): ${q}
조사 유형: ${typeLabels.join(", ") || "종합"}
요청 주체 — 브랜드: ${brandContext.brandName || "(미입력)"}
지역: ${brandContext.region || "(미입력)"}
업종: ${brandContext.industry || "(미입력)"}
메인 키워드/주제: ${brandContext.mainKeyword || "-"}
경쟁사 힌트: ${brandContext.competitors || "-"}
브랜드 설명: ${brandContext.brandDescription || "-"}

위 브랜드가 오늘의 주제 글을 쓸 때 쓸 수 있도록, 국내·해외 공개 채널 관점에서 조사 요약을 만드세요.`;

  const raw = await callOpenAIChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.55, maxTokens: 2600 }
  );

  const parsed = parseResearchJson(raw);
  if (!parsed?.summary) {
    return offlineResearchFallback(q, types, brandContext);
  }
  return parsed;
}
