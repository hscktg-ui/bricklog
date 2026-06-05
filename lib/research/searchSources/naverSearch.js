/**
 * 네이버 검색 Open API — 블로그·웹문서·뉴스 스니펫만 수집
 * https://developers.naver.com/docs/serviceapi/search/blog.md
 */

const NAVER_API = "https://openapi.naver.com/v1/search";

function envOn(name) {
  return (process.env[name] || "").trim();
}

export function getNaverCredentials() {
  const clientId =
    envOn("NAVER_CLIENT_ID") || envOn("NAVER_SEARCH_CLIENT_ID");
  const clientSecret =
    envOn("NAVER_CLIENT_SECRET") || envOn("NAVER_SEARCH_CLIENT_SECRET");
  return { clientId, clientSecret };
}

export function isNaverSearchConfigured() {
  if ((envOn("BRICLOG_NAVER_SEARCH") || "").toLowerCase() === "false") {
    return false;
  }
  const { clientId, clientSecret } = getNaverCredentials();
  return clientId.length >= 4 && clientSecret.length >= 8;
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNaverItem(item, { source, searchQuery }) {
  const title = stripHtml(item.title);
  const snippet = stripHtml(
    item.description || item.snippet || item.summary || ""
  );
  const url = String(item.link || item.url || "").trim();
  if (!title && !snippet) return null;
  let host = "";
  try {
    if (url) host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  return {
    title: title || host || "네이버 검색 결과",
    snippet: snippet.slice(0, 420),
    url,
    host,
    source,
    searchQuery,
  };
}

/**
 * @param {'blog'|'webkr'|'news'} kind
 */
async function fetchNaverSearch(kind, query, { display = 8, start = 1, sort = "sim" } = {}) {
  const q = String(query || "").trim();
  if (!q) return { ok: false, results: [], query: q };
  if (!isNaverSearchConfigured()) {
    return { ok: false, results: [], query: q, reason: "not_configured" };
  }

  const { clientId, clientSecret } = getNaverCredentials();
  const params = new URLSearchParams({
    query: q,
    display: String(Math.min(100, Math.max(1, display))),
    start: String(Math.min(1000, Math.max(1, start))),
    sort: sort === "date" ? "date" : "sim",
  });

  const res = await fetch(`${NAVER_API}/${kind}.json?${params}`, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    signal: AbortSignal.timeout(12_000),
  });

  if (!res.ok) {
    const err = new Error(`naver_${kind}_http_${res.status}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const source =
    kind === "blog"
      ? "naver_blog"
      : kind === "news"
        ? "naver_news"
        : "naver_webkr";

  const results = (data.items || [])
    .map((it) => normalizeNaverItem(it, { source, searchQuery: q }))
    .filter(Boolean);

  return {
    ok: results.length > 0,
    provider: source,
    query: q,
    results,
  };
}

export async function fetchNaverBlogResults(query, opts = {}) {
  return fetchNaverSearch("blog", query, opts);
}

export async function fetchNaverWebResults(query, opts = {}) {
  return fetchNaverSearch("webkr", query, opts);
}

export async function fetchNaverNewsResults(query, opts = {}) {
  return fetchNaverSearch("news", query, opts);
}

/**
 * 여러 쿼리 × (블로그 + 웹) 검색 후 중복 제거
 */
export async function fetchNaverLeadsForQueries(queries = [], opts = {}) {
  const maxQueries = opts.maxQueries ?? 3;
  const perQuery = opts.perQuery ?? 4;
  const includeBlog = opts.includeBlog !== false;
  const includeWeb = opts.includeWeb !== false;

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

  for (const q of uniqueQ) {
    const kinds = [];
    if (includeBlog) kinds.push("blog");
    if (includeWeb) kinds.push("webkr");

    for (const kind of kinds) {
      try {
        const batch = await fetchNaverSearch(kind, q, { display: perQuery });
        if (!batch.ok) continue;
        providers.add(batch.provider);
        for (const r of batch.results) {
          const key = (r.url || r.title).slice(0, 120).toLowerCase();
          if (seenUrl.has(key)) continue;
          seenUrl.add(key);
          merged.push(r);
        }
      } catch {
        /* 다음 종류/쿼리 */
      }
    }
  }

  return {
    ok: merged.length > 0,
    provider: providers.size ? [...providers].join("+") : "naver",
    queries: uniqueQ,
    results: merged.slice(0, opts.maxResults ?? 20),
  };
}

/** 트렌드 스냅샷용 — 뉴스 검색만 (쿼리 고정) */
export async function collectNaverTrendSignals() {
  const queries = [
    "소상공인 마케팅",
    "네이버 블로그 플레이스",
    "지역 업체 홍보",
  ];
  const items = [];
  const seen = new Set();

  for (const q of queries) {
    try {
      const batch = await fetchNaverNewsResults(q, { display: 6 });
      if (!batch.ok) continue;
      for (const r of batch.results) {
        const key = (r.url || r.title).slice(0, 100);
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          id: `naver-news-${items.length}`,
          source: "naver",
          title: r.title,
          snippet: r.snippet,
          url: r.url,
          keyword: q,
          verified: true,
        });
      }
    } catch {
      /* skip */
    }
  }

  return items;
}

export function formatNaverLeadsForPrompt(leads) {
  if (!leads?.results?.length) return "";
  const lines = [
    "【네이버 검색 실마리 — 제목·요약만, 원문·리뷰 문장 복사 금지】",
    `검색: ${leads.provider || "naver"} · 쿼리 ${(leads.queries || []).join(" / ")}`,
  ];
  leads.results.slice(0, 12).forEach((r, i) => {
    const where = r.host || r.url || r.source || "naver";
    lines.push(
      `${i + 1}. ${r.title} (${where})`,
      `   ${r.snippet || "(요약 없음)"}`
    );
  });
  lines.push(
    "위 스니펫에서 확인된 내용만 단정. 가격·스펙·출시일·효능은 검색에 없으면 쓰지 말 것."
  );
  return lines.join("\n");
}
