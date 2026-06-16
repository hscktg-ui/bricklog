/**
 * Research Stack A — 네이버 풀가동 + Gemini 조사 + CSE 공식자료 보조 (prod 기본)
 * Writer는 GPT 고정. 조사·재료 수집만 강화.
 */
import { isGeminiConfigured } from "@/lib/content/contentIntelligenceV12";
import { isNaverSearchConfigured } from "@/lib/research/searchSources/naverSearch";

function isGoogleCseConfigured() {
  const key = (
    process.env.GOOGLE_CSE_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
  const cx = (
    process.env.GOOGLE_CSE_CX ||
    process.env.GOOGLE_SEARCH_ENGINE_ID ||
    ""
  ).trim();
  return key.length >= 10 && cx.length >= 4;
}

export function isResearchStackAEnabled() {
  if ((process.env.BRICLOG_RESEARCH_STACK_A || "").toLowerCase() === "false") {
    return false;
  }
  if ((process.env.BRICLOG_RESEARCH_STACK_A || "").toLowerCase() === "true") {
    return true;
  }
  return process.env.NODE_ENV === "production";
}

/** Stack A: 공식·카탈로그 쿼리 우선 (env 미설정 시 prod ON) */
export function isOfficialSourceFirstDefault() {
  if (process.env.BRICLOG_OFFICIAL_SOURCE_FIRST === "1") return true;
  if (process.env.BRICLOG_OFFICIAL_SOURCE_FIRST === "0") return false;
  return isResearchStackAEnabled();
}

export function isNaverNewsResearchEnabled() {
  if (!isResearchStackAEnabled()) return false;
  return (process.env.BRICLOG_NAVER_NEWS_SEARCH || "").toLowerCase() !== "false";
}

/**
 * 네이버와 병행 — 공식 도메인·카탈로그 보조 (BRICLOG_GOOGLE_SEARCH 불필요)
 */
export function isGoogleCseSupplementEnabled() {
  if ((process.env.BRICLOG_CSE_SUPPLEMENT || "").toLowerCase() === "false") {
    return false;
  }
  if ((process.env.BRICLOG_CSE_SUPPLEMENT || "").toLowerCase() === "true") {
    return isGoogleCseConfigured();
  }
  return isResearchStackAEnabled() && isGoogleCseConfigured();
}

export function getNaverPerQueryCap() {
  const n = Number(process.env.BRICLOG_NAVER_PER_QUERY);
  if (Number.isFinite(n) && n > 0) return Math.min(10, n);
  return isResearchStackAEnabled() ? 6 : 4;
}

export function getNaverMaxResultsCap() {
  const n = Number(process.env.BRICLOG_NAVER_MAX_RESULTS);
  if (Number.isFinite(n) && n > 0) return Math.min(48, n);
  return isResearchStackAEnabled() ? 32 : 20;
}

/**
 * @param {{ maxQueries?: number }} [ctx]
 */
export function resolveNaverLeadFetchOptions(ctx = {}) {
  return {
    maxQueries: ctx.maxQueries ?? 4,
    perQuery: getNaverPerQueryCap(),
    maxResults: getNaverMaxResultsCap(),
    includeBlog: true,
    includeWeb: true,
    includeNews: isNaverNewsResearchEnabled(),
  };
}

export function buildCseSupplementQueries(queries = [], brandContext = {}) {
  if (!isGoogleCseSupplementEnabled()) return [];

  const brand = String(brandContext.brandName || "").trim();
  const officialDomain = String(brandContext.officialDomain || "")
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();

  const out = [];
  if (officialDomain && brand) {
    out.push(`site:${officialDomain} ${brand}`);
  }
  for (const raw of queries) {
    const q = String(raw || "").trim();
    if (!q) continue;
    if (/공식|카탈로그|catalog|official/i.test(q)) out.push(q);
  }
  if (!out.length && brand) {
    out.push(`${brand} 공식`);
  }

  const seen = new Set();
  const unique = [];
  for (const q of out) {
    const k = q.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(q);
    if (unique.length >= 2) break;
  }
  return unique;
}

/** 운영·상태 API용 — 키 값 노출 없음 */
export function getResearchStackAStatus() {
  return {
    stackA: isResearchStackAEnabled(),
    naver: isNaverSearchConfigured(),
    naverNews: isNaverNewsResearchEnabled(),
    gemini: isGeminiConfigured(),
    cseSupplement: isGoogleCseSupplementEnabled(),
    cseConfigured: isGoogleCseConfigured(),
    officialSourceFirst: isOfficialSourceFirstDefault(),
    naverPerQuery: getNaverPerQueryCap(),
    naverMaxResults: getNaverMaxResultsCap(),
  };
}
