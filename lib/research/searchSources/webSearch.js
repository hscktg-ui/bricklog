/**
 * 외부 검색 연동 — V11: 네이버 검색 Open API 기본 (Google CSE 비활성)
 * 스니펫·제목·URL만 수집 (원문 복사 금지 → 브랜드 메모리로 재해석)
 */

import { isGoogleSearchEnabledInV12 } from "@/lib/content/contentIntelligenceV12";
import { isOfficialSourceFirstEnabled } from "@/lib/config/brandEngineFlags";
import {
  isNaverSearchConfigured,
  fetchNaverLeadsForQueries,
} from "@/lib/research/searchSources/naverSearch";

const CSE_ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const SERP_ENDPOINT = "https://serpapi.com/search.json";

export { isNaverSearchConfigured } from "@/lib/research/searchSources/naverSearch";

function envOn(name) {
  return (process.env[name] || "").trim();
}

export function isGoogleCseConfigured() {
  const key = envOn("GOOGLE_CSE_API_KEY") || envOn("GOOGLE_API_KEY");
  const cx = envOn("GOOGLE_CSE_CX") || envOn("GOOGLE_SEARCH_ENGINE_ID");
  return key.length >= 10 && cx.length >= 4;
}

export function isSerpApiConfigured() {
  const key = envOn("SERPAPI_API_KEY") || envOn("SERP_API_KEY");
  return key.length >= 8;
}

/** V11: 네이버만 기본. Google은 BRICLOG_GOOGLE_SEARCH=true 일 때만 */
export function isWebSearchConfigured() {
  if ((envOn("BRICLOG_WEB_SEARCH") || "").toLowerCase() === "false") {
    return false;
  }
  if (isNaverSearchConfigured()) return true;
  if (isGoogleSearchEnabledInV12()) {
    return isGoogleCseConfigured() || isSerpApiConfigured();
  }
  return false;
}

function normalizeResult(item) {
  const title = String(item.title || "").trim();
  const snippet = String(item.snippet || item.description || "").trim();
  const url = String(item.url || item.link || "").trim();
  if (!title && !snippet) return null;
  let host = "";
  try {
    if (url) host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  return {
    title: title || host || "검색 결과",
    snippet: snippet.slice(0, 420),
    url,
    host,
    source: item.source || "google",
    tier: "external",
  };
}

function classifySourceTier(result, brandContext = {}) {
  const host = String(result.host || "").toLowerCase();
  const brandHost = String(brandContext.officialDomain || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "");
  if (brandHost && host.includes(brandHost)) return "official";
  if (/official|catalog|product|press|newsroom/.test(host)) return "official";
  if (/blog|cafe|post|story/.test(host)) return "owned";
  return "external";
}

function tierScore(tier) {
  if (tier === "official") return 0;
  if (tier === "owned") return 1;
  return 2;
}

async function fetchGoogleCse(query, { num = 8, hl = "ko" } = {}) {
  const key = envOn("GOOGLE_CSE_API_KEY") || envOn("GOOGLE_API_KEY");
  const cx = envOn("GOOGLE_CSE_CX") || envOn("GOOGLE_SEARCH_ENGINE_ID");
  const params = new URLSearchParams({
    key,
    cx,
    q: query,
    num: String(Math.min(10, Math.max(1, num))),
    hl,
    gl: "kr",
    safe: "active",
  });
  const res = await fetch(`${CSE_ENDPOINT}?${params}`, {
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    const err = new Error(`google_cse_http_${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const items = (data.items || []).map((it) =>
    normalizeResult({
      title: it.title,
      snippet: it.snippet,
      url: it.link,
      source: "google_cse",
    })
  );
  return {
    ok: true,
    provider: "google_cse",
    query,
    results: items.filter(Boolean),
  };
}

async function fetchSerpApi(query, { num = 8, hl = "ko" } = {}) {
  const apiKey = envOn("SERPAPI_API_KEY") || envOn("SERP_API_KEY");
  const params = new URLSearchParams({
    engine: "google",
    q: query,
    api_key: apiKey,
    num: String(Math.min(10, Math.max(1, num))),
    hl,
    gl: "kr",
  });
  const res = await fetch(`${SERP_ENDPOINT}?${params}`, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const err = new Error(`serpapi_http_${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const organic = data.organic_results || [];
  const items = organic.map((it) =>
    normalizeResult({
      title: it.title,
      snippet: it.snippet,
      url: it.link,
      source: "serpapi",
    })
  );
  return {
    ok: true,
    provider: "serpapi",
    query,
    results: items.filter(Boolean),
  };
}

/**
 * @param {string} query
 * @param {{ num?: number, hl?: string }} [opts]
 */
export async function fetchWebSearchResults(query, opts = {}) {
  const q = String(query || "").trim();
  if (!q) return { ok: false, results: [], query: q };
  if (!isWebSearchConfigured()) {
    return { ok: false, results: [], query: q, reason: "not_configured" };
  }

  if (isGoogleCseConfigured()) {
    try {
      return await fetchGoogleCse(q, opts);
    } catch {
      /* SerpAPI 폴백 */
    }
  }
  if (isSerpApiConfigured()) {
    try {
      return await fetchSerpApi(q, opts);
    } catch {
      return { ok: false, results: [], query: q, reason: "fetch_failed" };
    }
  }
  return { ok: false, results: [], query: q, reason: "not_configured" };
}

/**
 * 여러 쿼리(표기 변형 포함)를 검색해 중복 제거
 */
function ingestSearchBatch(merged, seenUrl, providers, batch) {
  if (!batch?.ok) return;
  if (batch.provider) {
    const p = String(batch.provider);
    for (const part of p.split("+")) {
      if (part) providers.add(part);
    }
  }
  for (const r of batch.results || []) {
    const key = (r.url || r.title).slice(0, 120).toLowerCase();
    if (seenUrl.has(key)) continue;
    seenUrl.add(key);
    merged.push(r);
  }
}

export async function fetchWebLeadsForQueries(queries = [], opts = {}) {
  const maxQueries = opts.maxQueries ?? 4;
  const perQuery = opts.perQuery ?? 5;
  const uniqueQ = [];
  const seenQ = new Set();
  for (const raw of queries) {
    const q = String(raw || "").trim();
    if (q.length < 2) continue;
    const k = q.toLowerCase();
    if (seenQ.has(k)) continue;
    seenQ.add(k);
    uniqueQ.push(q);
    if (uniqueQ.length >= maxQueries) break;
  }

  const merged = [];
  const seenUrl = new Set();
  const providers = new Set();

  if (isNaverSearchConfigured()) {
    try {
      const naver = await fetchNaverLeadsForQueries(uniqueQ, {
        maxQueries,
        perQuery: Math.min(perQuery, 6),
        maxResults: opts.maxResults ?? 20,
      });
      ingestSearchBatch(merged, seenUrl, providers, naver);
    } catch {
      /* 브랜드 메모리·로컬 단서로 계속 */
    }
  } else if (isGoogleSearchEnabledInV11()) {
    for (const q of uniqueQ) {
      const batch = await fetchWebSearchResults(q, { num: perQuery });
      ingestSearchBatch(merged, seenUrl, providers, batch);
    }
  }

  const withTier = merged.map((r) => ({
    ...r,
    tier: classifySourceTier(r, opts.brandContext || {}),
  }));
  const ordered = (isOfficialSourceFirstEnabled() ? withTier : withTier).sort(
    (a, b) => {
      const t = tierScore(a.tier) - tierScore(b.tier);
      if (t !== 0) return t;
      return String(a.host || "").localeCompare(String(b.host || ""));
    }
  );

  return {
    ok: merged.length > 0,
    provider: providers.size ? [...providers].join("+") : null,
    queries: uniqueQ,
    results: ordered.slice(0, opts.maxResults ?? 20),
  };
}

export function formatWebLeadsForPrompt(leads) {
  if (!leads?.results?.length) return "";
  const providerLabel = String(leads.provider || "naver");
  const lines = [
    "【네이버 검색 실마리 — 재료만, 복사 금지 · 브랜드 메모리 관점으로 재해석】",
    `검색: ${providerLabel} · 쿼리 ${(leads.queries || []).join(" / ")}`,
  ];
  leads.results.slice(0, 14).forEach((r, i) => {
    const where = r.host || r.url || "web";
    lines.push(
      `${i + 1}. ${r.title} (${where})`,
      `   ${r.snippet || "(요약 없음)"}`
    );
  });
  lines.push(
    "스니펫은 FACT 후보만. 브랜드 작업실·공식자료와 충돌 시 메모리·공식 우선. 미확인 스펙·가격 단정 금지."
  );
  return lines.join("\n");
}

/** 조사 JSON에 sources·요약 힌트 병합 */
export function attachWebLeadsToResearch(parsed, leads) {
  if (!parsed || !leads?.results?.length) return parsed;
  const next = { ...parsed };
  const webSources = leads.results.map((r) => ({
    title: r.title,
    url: r.url || "",
    note: `${r.snippet || ""}`.slice(0, 200),
    provider: leads.provider,
    tier: r.tier || "external",
  }));
  next.sources = [...(next.sources || []), ...webSources].slice(0, 24);
  next.mode = next.mode || "llm_web_hybrid";
  next.webSearch = {
    provider: leads.provider,
    queryCount: leads.queries?.length ?? 0,
    resultCount: leads.results.length,
  };
  next.disclaimer =
    "네이버·브랜드 작업실·입력 단서를 바탕으로 재해석했습니다. 발행 전 공식·매장 정보를 확인하세요.";

  if (Array.isArray(next.researchFacts) || next.v2Axis) {
    const facts = [...(next.researchFacts || next.v2Axis?.researchFacts || [])];
    for (const r of leads.results.slice(0, 10)) {
      if (!r.snippet) continue;
      facts.push({
        axis: "topic",
        fact: `${r.title}: ${r.snippet}`.slice(0, 280),
        source: String(r.source || "").includes("naver")
          ? "naver_search_snippet"
          : "web_search_snippet",
      });
    }
    next.researchFacts = facts;
    if (next.v2Axis) {
      next.v2Axis = { ...next.v2Axis, researchFacts: facts };
    }
  }

  const snippetSummary = leads.results
    .slice(0, 4)
    .map((r) => r.snippet)
    .filter(Boolean)
    .join(" ");
  if (!next.summary?.trim() && snippetSummary) {
    next.summary = snippetSummary.slice(0, 800);
  } else if (snippetSummary && next.summary) {
    next.summary = `${next.summary}\n\n[검색 스니펫 참고] ${snippetSummary.slice(0, 400)}`;
  }

  return next;
}
