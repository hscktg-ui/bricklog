import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { topicResearchSystemRules } from "@/lib/research/topicChannelResearch";
import { researchTypeLabels } from "./types";
import {
  V2_MIN_RESEARCH_FACTS,
  countResearchFacts,
} from "@/lib/content/v2ResearchFacts";

function parseResearchJson(raw, { v2Axis = false } = {}) {
  try {
    const data = JSON.parse(raw);
    const base = {
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
    if (v2Axis) {
      base.researchFacts = Array.isArray(data.researchFacts)
        ? data.researchFacts
        : [];
      base.v2Axis = {
        researchStatus: data.researchStatus || data.v2Axis?.researchStatus,
        brandAnalysis: data.brandAnalysis || data.v2Axis?.brandAnalysis,
        regionAnalysis: data.regionAnalysis || data.v2Axis?.regionAnalysis,
        topicAnalysis: data.topicAnalysis || data.v2Axis?.topicAnalysis,
        factVerification:
          data.factVerification || data.v2Axis?.factVerification,
        gaps: data.gaps || data.v2Axis?.gaps,
        researchFacts: base.researchFacts,
        insufficient:
          data.researchStatus === "insufficient" || data.insufficient === true,
      };
    }
    return base;
  } catch {
    return null;
  }
}

function v2AxisInsufficientFallback() {
  return {
    summary: "",
    sources: [],
    keywords: [],
    competitors: [],
    channelInsights: [],
    mode: "insufficient",
    disclaimer: "조사 데이터가 부족합니다.",
    researchedAt: new Date().toISOString(),
    v2Axis: {
      researchStatus: "insufficient",
      insufficient: true,
      factVerification: { consistent: false, pass1: "미수집", pass2: "미검증" },
    },
  };
}

function buildV2AxisResearchSystem() {
  return `You are BRICLOG V2 axis researcher. Brand → region → topic order.
Return ONLY one JSON object:
{
  "researchStatus": "ok" | "insufficient",
  "summary": "6-10 Korean sentences — usable writing brief for THIS brand+region+topic",
  "keywords": ["..."],
  "brandAnalysis": {
    "features": ["..."],
    "lineup": ["..."],
    "position": "...",
    "strengths": ["..."]
  },
  "regionAnalysis": {
    "regionName": "...",
    "lifeArea": ["..."],
    "searchIntents": ["..."]
  },
  "topicAnalysis": {
    "productName": "...",
    "features": ["..."],
    "specs": ["..."],
    "differentiators": ["..."],
    "verified": true | false
  },
  "factVerification": {
    "pass1": "1차 수집 요약",
    "pass2": "2차 일치 확인 결과",
    "consistent": true | false,
    "gaps": ["미확인 항목"]
  },
  "gaps": ["..."],
  "researchFacts": [
    {"axis":"brand|region|topic","fact":"one concrete verified fact sentence"}
  ],
  "sources": [{"title":"...","url":"","note":"..."}],
  "channelInsights": [{"channel":"...","finding":"...","keywords":["..."],"confidence":"high|medium|low"}],
  "disclaimer": "one Korean line"
}
Rules:
- Korean text fields only. No markdown.
- researchFacts MUST contain at least ${V2_MIN_RESEARCH_FACTS} distinct items (brand 7+, region 7+, topic 6+). Each fact is one concrete sentence usable in a blog body.
- If you cannot reach ${V2_MIN_RESEARCH_FACTS} verified facts, set researchStatus to "insufficient" — do NOT pad with generic industry filler.
- If product/topic facts cannot be confirmed, set researchStatus to "insufficient" and do NOT invent specs/prices.
- Run fact verification twice (pass1 collect, pass2 cross-check) in factVerification fields.
- Never fabricate news URLs.
- Flower shop / cafe / anniversary cliché examples are irrelevant — focus on user industry.`;
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
 *   mode?: string;
 *   regionKeywordHints?: string[];
 * }} params
 */
export async function runResearch({
  query,
  types = [],
  brandContext = {},
  mode = "standard",
  regionKeywordHints = [],
}) {
  const q = String(query || "").trim();
  if (!q) {
    throw new Error("연구 주제를 입력해 주세요.");
  }

  const v2Axis = mode === "v2_axis";

  if (!isOpenAIConfigured()) {
    if (v2Axis) return v2AxisInsufficientFallback();
    return offlineResearchFallback(q, types, brandContext);
  }

  const typeLabels = researchTypeLabels(types);

  if (v2Axis) {
    const system = buildV2AxisResearchSystem();
    const user = `【브랜드】 ${brandContext.brandName || "(미입력)"}
【지역】 ${brandContext.region || "(미입력)"}
【주제】 ${brandContext.mainKeyword || brandContext.topic || q}
【업종】 ${brandContext.industry || "(미입력)"}
【지역 키워드 힌트】 ${(regionKeywordHints || []).join(", ") || "(없음)"}
조사 쿼리: ${q}
조사 유형: ${typeLabels.join(", ") || "종합"}

1) 브랜드 특징·라인업·포지션 2) 지역 검색 의도·생활권 3) 주제 제품 팩트
4) researchFacts ${V2_MIN_RESEARCH_FACTS}개 이상 5) factVerification 2회. 확인 안 되면 researchStatus=insufficient.`;

    const raw = await callOpenAIChat(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.45, maxTokens: 4000 }
    );
    const parsed = parseResearchJson(raw, { v2Axis: true });
    const factCount = countResearchFacts(
      parsed,
      { ...brandContext, regionKeywordHints },
      null
    );
    if (
      !parsed?.summary ||
      parsed.v2Axis?.insufficient ||
      factCount < V2_MIN_RESEARCH_FACTS
    ) {
      return v2AxisInsufficientFallback();
    }
    return parsed;
  }

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
