import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { topicResearchSystemRules } from "@/lib/research/topicChannelResearch";
import { researchTypeLabels } from "./types";
import {
  V2_MIN_RESEARCH_FACTS,
  countResearchFacts,
} from "@/lib/content/v2ResearchFacts";
import {
  isWebSearchConfigured,
  fetchWebLeadsForQueries,
  formatWebLeadsForPrompt,
  attachWebLeadsToResearch,
} from "@/lib/research/searchSources/webSearch";
import { runGeminiDeepAnalysis } from "@/lib/llm/geminiDeepAnalysis";
import {
  runGeminiResearchPack,
  formatGeminiWriterOutlineBrief,
} from "@/lib/llm/geminiResearchPack";
import {
  getNaverMaxQueries,
  useGeminiResearchProvider,
} from "@/lib/config/briclogFastPipeline";
import { isOfficialSourceFirstEnabled } from "@/lib/config/brandEngineFlags";
import {
  buildSearchExpansionPlan,
  formatExpansionForPrompt,
} from "@/lib/research/searchExpansionEngine";
import { attachKnowledgeMapToResearch } from "@/lib/research/knowledgeMapEngine";
import { buildKnowledgeCoverageMap } from "@/lib/content/knowledgeCoverageEngine";

const FAST_RESEARCH_MODE = process.env.BRICLOG_FAST_RESEARCH !== "0";

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
    disclaimer: "브랜드·지역·주제 맥락으로 글을 구성합니다.",
    researchedAt: new Date().toISOString(),
    v2Axis: {
      researchStatus: "insufficient",
      insufficient: true,
      factVerification: { consistent: false, pass1: "미수집", pass2: "미검증" },
    },
  };
}

function buildV2AxisResearchSystem({ depthPass = false } = {}) {
  return `You are BRICLOG V2 axis researcher (Research Depth Engine). Brand → region → topic order.
Return ONLY one JSON object:
{
  "researchStatus": "ok",
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
- NEVER set researchStatus to "insufficient" to stop writing — downstream always continues. Gather leads on brand, region, category, related products, region visit context, official info, similar models, articles.
- If direct topic facts are thin, expand via brand line, parent category (${depthPass ? "this pass focus" : "sleep/furniture/local"}), region, similar models — still no invented specs/prices/dates.
- Treat user input as CLUES not final truth: try entity spelling variants (e.g. Korean product codes ↔ Latin/roman numerals) before giving up.
- researchFacts: as many VERIFIED concrete sentences as possible (aim ${V2_MIN_RESEARCH_FACTS}+ when available). Each fact one axis: brand|region|topic.
- Do NOT pad with generic flower/cafe/anniversary filler unrelated to user industry.
- Do NOT invent specs, prices, launch dates, medical claims.
- Run fact verification twice (pass1 collect, pass2 cross-check) in factVerification fields. consistent may be true when brand+region leads exist even if topic is thin.
- Never fabricate news URLs.
${isOfficialSourceFirstEnabled() ? "- Prioritize official brand homepage/catalog/blog sources first; treat non-official snippets as secondary clues.\n" : ""}`;
}

async function gatherWebLeads(query, brandContext = {}) {
  if (brandContext._webLeadsCache) return brandContext._webLeadsCache;
  if (!isWebSearchConfigured()) return { block: "", leads: null };

  const expansion =
    brandContext.searchExpansion ||
    buildSearchExpansionPlan({
      brandName: brandContext.brandName,
      region: brandContext.region,
      industry: brandContext.industry,
      topic: brandContext.topic || brandContext.mainKeyword,
      mainKeyword: brandContext.mainKeyword,
      subKeyword: brandContext.subKeyword,
      clueDiscovery: brandContext.clueDiscovery,
    });
  brandContext.searchExpansion = expansion;

  const clue = brandContext.clueDiscovery || {};
  const officialDomain =
    String(
      brandContext.officialDomain ||
        brandContext.website ||
        brandContext.brandMemory?.website ||
        ""
    ).trim();
  const productBase = String(
    brandContext.mainKeyword || brandContext.topic || query
  ).trim();
  const productVariant = productBase
    .replace(/([A-Za-z]+)\s*[-\s]?([IVX0-9]+)/g, "$1-$2")
    .replace(/\s+/g, " ")
    .trim();
  const maxQ = getNaverMaxQueries();
  const queries = [
    ...expansion.searchQueries,
    query,
    isOfficialSourceFirstEnabled() && officialDomain
      ? `${brandContext.brandName || ""} ${productBase} 공식`.trim()
      : null,
    isOfficialSourceFirstEnabled() && officialDomain && productVariant
      ? `${productVariant} 공식 카탈로그`.trim()
      : null,
    clue.searchQueries?.[0],
    clue.searchQueries?.[1],
    brandContext.brandName && brandContext.mainKeyword
      ? `${brandContext.brandName} ${brandContext.mainKeyword}`
      : null,
    clue.entityVariants?.[0]
      ? `${brandContext.brandName || ""} ${clue.entityVariants[0]}`.trim()
      : null,
  ].filter(Boolean);
  try {
    const leads = await fetchWebLeadsForQueries(queries, {
      maxQueries: maxQ,
      perQuery: 4,
      maxResults: 28,
      brandContext: { officialDomain },
    });
    if (!leads.ok) return { block: "", leads: null };
    let block = formatWebLeadsForPrompt(leads);
    const expansionBrief = formatExpansionForPrompt(expansion);
    if (expansionBrief) {
      block = `${expansionBrief}\n\n${block}`;
    }
    if (!FAST_RESEARCH_MODE && !useGeminiResearchProvider()) {
      const gemini = await runGeminiDeepAnalysis({
        brandName: brandContext.brandName,
        region: brandContext.region,
        topic: query,
        memoryBrief: brandContext.brandMemoryBrief || brandContext.memoryBrief,
        naverBrief: block,
        expansionBrief,
        skipGemini: brandContext._geminiDone,
      });
      if (gemini.ok && gemini.analysis) {
        block += `\n\n【V12 심층 맥락 분석 — 브랜드 관점 재해석, 복사 금지】\n${gemini.analysis}`;
        brandContext._geminiDone = true;
      }
    }
    const out = { block, leads };
    brandContext._webLeadsCache = out;
    return out;
  } catch {
    return { block: "", leads: null };
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

  const v2Axis = mode === "v2_axis" || mode === "v2_axis_depth";
  const depthPass = mode === "v2_axis_depth";

  brandContext.searchExpansion =
    brandContext.searchExpansion ||
    buildSearchExpansionPlan({
      brandName: brandContext.brandName,
      region: brandContext.region,
      industry: brandContext.industry,
      topic: brandContext.topic || brandContext.mainKeyword,
      mainKeyword: brandContext.mainKeyword,
      subKeyword: brandContext.subKeyword,
      clueDiscovery: brandContext.clueDiscovery,
      knowledgeCoverage: brandContext.knowledgeCoverage,
    });

  brandContext.knowledgeCoverage =
    brandContext.knowledgeCoverage ||
    buildKnowledgeCoverageMap({
      brandName: brandContext.brandName,
      region: brandContext.region,
      industry: brandContext.industry,
      topic: brandContext.topic || brandContext.mainKeyword,
      mainKeyword: brandContext.mainKeyword,
      clueDiscovery: brandContext.clueDiscovery,
    });

  const web = await gatherWebLeads(q, brandContext);
  const canLlmResearch = isOpenAIConfigured() || useGeminiResearchProvider();

  if (!canLlmResearch) {
    if (web.leads?.results?.length) {
      const base = offlineResearchFallback(q, types, brandContext);
      const enriched = attachWebLeadsToResearch(base, web.leads);
      if (v2Axis) {
        enriched.v2Axis = {
          researchStatus: "ok",
          insufficient: false,
          factVerification: {
            pass1: "네이버 검색 스니펫",
            pass2: "입력·브랜드 맥락",
            consistent: true,
          },
          researchFacts: enriched.researchFacts || [],
        };
      }
      return attachKnowledgeMapToResearch(enriched, {
        expansion: brandContext.searchExpansion,
        research: enriched,
        brandContext,
      });
    }
    if (v2Axis) {
      const off = offlineResearchFallback(q, types, brandContext);
      off.v2Axis = {
        researchStatus: "ok",
        insufficient: false,
        factVerification: {
          pass1: "오프라인 맥락",
          pass2: "브랜드·지역 입력 기반",
          consistent: true,
        },
      };
      return attachKnowledgeMapToResearch(off, {
        expansion: brandContext.searchExpansion,
        research: off,
        brandContext,
      });
    }
    return offlineResearchFallback(q, types, brandContext);
  }

  const typeLabels = researchTypeLabels(types);

  if (v2Axis) {
    const system = buildV2AxisResearchSystem({ depthPass });
    const user = `【브랜드】 ${brandContext.brandName || "(미입력)"}
【지역】 ${brandContext.region || "(미입력)"}
【주제】 ${brandContext.mainKeyword || brandContext.topic || q}
【업종】 ${brandContext.industry || "(미입력)"}
【지역 키워드 힌트】 ${(regionKeywordHints || []).join(", ") || "(없음)"}
조사 쿼리: ${q}
조사 유형: ${typeLabels.join(", ") || "종합"}
${depthPass ? "【이번 패스】 연관·브랜드·카테고리·지역·공식·유사제품·기사 축 중 이 쿼리에 맞는 실마리만 추가." : ""}
${web.block ? `\n${web.block}\n` : ""}
${formatExpansionForPrompt(brandContext.searchExpansion) ? `\n${formatExpansionForPrompt(brandContext.searchExpansion)}\n` : ""}

1) 브랜드 특징·라인업 2) 지역 검색·생활권 3) 주제·제품(확인된 것만)
4) researchFacts 최대한 수집 5) factVerification 2회. researchStatus는 항상 "ok".
6) KNOWLEDGE MAP 축(연관·FAQ·비교·구매·운영·방문)으로 재구성 — 스니펫 복사 금지.
네이버 검색 스니펫이 있으면 그 안에서만 확인된 사실을 researchFacts에 반영. 브랜드 작업실·공식자료가 우선.`;

    let parsed = null;
    if (useGeminiResearchProvider()) {
      const geminiPack = await runGeminiResearchPack({
        system,
        user,
        brandContext,
      });
      if (geminiPack.ok && geminiPack.parsed) {
        parsed =
          parseResearchJson(JSON.stringify(geminiPack.parsed), { v2Axis: true }) ||
          geminiPack.parsed;
        if (geminiPack.writerOutline?.length) {
          parsed.geminiWriterOutline = geminiPack.writerOutline;
          parsed.geminiWriterBrief = formatGeminiWriterOutlineBrief(
            geminiPack.writerOutline,
            geminiPack.sectionPlan
          );
        }
        if (geminiPack.customerQuestions?.length) {
          parsed.geminiCustomerQuestions = geminiPack.customerQuestions;
        }
        parsed.mode = parsed.mode || "gemini_research_pack";
      } else if (geminiPack.reason) {
        brandContext._geminiLastError = geminiPack.reason;
      }
    }
    if (!parsed && isOpenAIConfigured()) {
      const raw = await callOpenAIChat(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        depthPass
          ? { temperature: 0.4, maxTokens: 1400 }
          : { temperature: 0.45, maxTokens: 4000 }
      );
      parsed = parseResearchJson(raw, { v2Axis: true });
    }
    if (!parsed) {
      return offlineResearchFallback(q, types, brandContext);
    }
    if (web.leads) parsed = attachWebLeadsToResearch(parsed, web.leads);
    if (!parsed.summary?.trim()) {
      parsed.summary = `${brandContext.brandName || "브랜드"}·${brandContext.region || "지역"}·${brandContext.mainKeyword || q} 맥락에서 글을 구성합니다.`;
    }
    if (parsed.v2Axis) {
      parsed.v2Axis.researchStatus = "ok";
      parsed.v2Axis.insufficient = false;
    }
    return attachKnowledgeMapToResearch(parsed, {
      expansion: brandContext.searchExpansion,
      research: parsed,
      brandContext,
      coverage: brandContext.knowledgeCoverage,
    });
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
${web.block ? `\n${web.block}\n` : ""}

위 브랜드가 오늘의 주제 글을 쓸 때 쓸 수 있도록, 국내·해외 공개 채널 관점에서 조사 요약을 만드세요.
${isOfficialSourceFirstEnabled() ? "\n공식 홈페이지·카탈로그·공식 블로그를 우선하고, 일반 검색은 보조 근거로만 반영하세요." : ""}`;

  const raw = await callOpenAIChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.55, maxTokens: 2600 }
  );

  let parsed = parseResearchJson(raw);
  if (!parsed?.summary) {
    return offlineResearchFallback(q, types, brandContext);
  }
  if (web.leads) parsed = attachWebLeadsToResearch(parsed, web.leads);
  return attachKnowledgeMapToResearch(parsed, {
    expansion: brandContext.searchExpansion,
    research: parsed,
    brandContext,
  });
}
