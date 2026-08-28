/**
 * 스마트스토어 상위 상세 조사 + 리스트 활용 대조 + GPT 결과 출고.
 * 가짜 후기·모델컷은 결과에 넣지 않는다.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { callOpenAIChat } from "../lib/llm/openaiClient.js";
import { parseOpenAIJson } from "../lib/prompts/parseResponse.js";
import {
  fetchNaverBlogResults,
  fetchNaverWebResults,
  isNaverSearchConfigured,
} from "../lib/research/searchSources/naverSearch.js";
import { generateDetailPagePack } from "../lib/product/detailPageEngine.js";
import { getDetailPageExample } from "../lib/product/detailPageCompanyPresets.js";
import { detailPageSampleShots } from "../lib/product/detailPagePublicSample.js";
import { renderDetailPageBodyHtml, wrapMallHtml } from "../lib/product/detailPageHtml.js";
import { assessDetailPageSuccess } from "../lib/product/detailPageSuccessStandard.js";
import { assessDetailPageCompeteWins } from "../lib/product/detailPageCompeteWins.js";
import {
  DETAIL_PAGE_LIST_TOOL_USE,
  DETAIL_PAGE_RANKING_SEQUENCE,
  formatRankingPlaybookForPrompt,
} from "../lib/product/detailPageRankingPlaybook.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  for (const raw of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const line = raw.replace(/\r$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* no env */
}

const outDir = join(root, "artifacts", "detail-page-ranking");
mkdirSync(outDir, { recursive: true });

const QUERIES = [
  "여주햅쌀 10kg 스마트스토어",
  "대왕님표 여주쌀 진상미 10kg 상세",
  "원두 200g 당일로스팅 스마트스토어",
  "하우스블렌드 원두 200g 상세페이지",
];

const LIST_PAGES = [
  { id: "hookable", url: "https://www.hookable.ai/" },
  { id: "creazy", url: "https://creazy.app/ko" },
  { id: "draph", url: "https://draph.art/overview/detail-page-maker" },
  { id: "gency", url: "https://gency.ai/ko/" },
];

function stripTags(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(14_000),
    });
    const html = await res.text();
    const text = stripTags(html).slice(0, 4000);
    return {
      ok: res.ok,
      status: res.status,
      url: res.url,
      bytes: html.length,
      imgCount: (html.match(/<img\s/gi) || []).length,
      headings: [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
        .map((m) => stripTags(m[1]))
        .filter(Boolean)
        .slice(0, 16),
      hasReview: /리뷰|별점|실구매/.test(html),
      hasGif: /\.gif|image\/gif/i.test(html),
      hasSpec: /스펙|SPEC|상세정보/.test(html),
      snippet: text.slice(0, 900),
    };
  } catch (err) {
    return { ok: false, url, error: String(err.message || err) };
  }
}

async function gptJson(system, user, maxTokens = 5000) {
  const raw = await callOpenAIChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { maxTokens, emptyRetries: 2, temperature: 0.3 }
  );
  return parseOpenAIJson(raw) || JSON.parse(raw);
}

console.log("1) naver shop rank");
if (!isNaverSearchConfigured()) {
  throw new Error("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 필요");
}

const shopBatches = [];
for (const q of QUERIES) {
  const [web, blog] = await Promise.all([
    fetchNaverWebResults(q, { display: 8 }),
    fetchNaverBlogResults(q, { display: 6 }),
  ]);
  const results = [...(web.results || []), ...(blog.results || [])].map((r, i) => ({
    rank: i + 1,
    title: r.title,
    url: r.url,
    host: r.host,
    snippet: r.snippet,
    mallName: r.host,
    brand: "",
    category: r.source,
    searchQuery: q,
  }));
  shopBatches.push({
    ok: results.length > 0,
    query: q,
    total: results.length,
    results,
    provider: [web.provider, blog.provider].filter(Boolean).join("+"),
  });
  console.log(`  ${q} n=${results.length} web=${web.ok} blog=${blog.ok}`);
}

const rankItems = shopBatches.flatMap((b) =>
  (b.results || []).slice(0, 8).map((r) => ({
    query: b.query,
    rank: r.rank,
    title: r.title,
    mallName: r.mallName,
    brand: r.brand,
    category: r.category,
    host: r.host,
    url: r.url,
    snippet: r.snippet,
  }))
);

console.log("2) inspect top product pages");
const uniqueUrls = [];
const seen = new Set();
for (const item of rankItems) {
  if (!item.url || seen.has(item.url)) continue;
  seen.add(item.url);
  uniqueUrls.push(item);
  if (uniqueUrls.length >= 8) break;
}
const extraProductUrls = [
  "https://www.enuri.com/detail.jsp?modelno=138343585",
  "https://www.chjm.kr/goods/goods_view.php?goodsNo=1000002884",
  "https://conyhub.kr/products/98490/",
  "https://blog.hookable.ai/98281",
];
for (const url of extraProductUrls) {
  if (seen.has(url)) continue;
  seen.add(url);
  uniqueUrls.push({ title: url, mallName: "", url });
}
const pageInspects = [];
for (const item of uniqueUrls) {
  const page = await fetchPage(item.url);
  pageInspects.push({ title: item.title, mallName: item.mallName, ...page });
  console.log(
    `  ${page.status || "err"} imgs=${page.imgCount ?? "-"} ${item.mallName || item.host}`
  );
}

console.log("3) list tool pages");
const listInspects = [];
for (const tool of LIST_PAGES) {
  const page = await fetchPage(tool.url);
  listInspects.push({ id: tool.id, ...page });
  console.log(`  ${tool.id} ${page.status || "err"} bytes=${page.bytes || 0}`);
}

console.log("4) GPT ranking structure");
const rankingGpt = await gptJson(
  [
    "너는 스마트스토어 상세 조사기다. JSON만.",
    "입력된 랭킹 상품 제목·몰·카테고리·페이지 실측만 쓴다.",
    "없는 후기·매출·전환율은 만들지 않는다.",
    'JSON: {"patterns":[{"id","evidence","weDo"}],"photoRhythm","sectionRhythm","avoid":[]}',
  ].join("\n"),
  JSON.stringify({
    shop: rankItems.slice(0, 32),
    pages: pageInspects.map((p) => ({
      title: p.title,
      mallName: p.mallName,
      status: p.status,
      imgCount: p.imgCount,
      headings: p.headings,
      hasReview: p.hasReview,
      hasGif: p.hasGif,
      hasSpec: p.hasSpec,
      snippet: p.snippet,
    })),
  }),
  6500
);

console.log("5) GPT list-tool use of ranking formula");
const listGpt = await gptJson(
  [
    "너는 상세페이지 AI 리스트 분석기다. JSON만.",
    "각 툴이 스마트스토어 상위 상세 공식을 어떻게 쓰는지 대조한다.",
    "가져올 것 / 따라가지 않을 것을 나눈다.",
    'JSON: {"tools":[{"id","rankingUse","take","leave"}],"briclogSequence":[],"hardNo":[]}',
  ].join("\n"),
  JSON.stringify({
    playbook: {
      sequence: DETAIL_PAGE_RANKING_SEQUENCE,
      tools: DETAIL_PAGE_LIST_TOOL_USE,
    },
    ranking: rankingGpt,
    listPages: listInspects.map((p) => ({
      id: p.id,
      status: p.status,
      headings: p.headings,
      snippet: p.snippet,
    })),
  }),
  6500
);

console.log("6) GPT generate rice + beans with ranking playbook");
const examples = ["open-rice", "open-beans"].map((id) => {
  const example = getDetailPageExample(id);
  const shots = detailPageSampleShots(id).map((p) => ({
    ...p,
    src: existsSync(join(root, "public", p.src.replace(/^\//, "")))
      ? p.src
      : p.src,
  }));
  return { id, example, shots };
});

const generated = [];
for (const item of examples) {
  const facts = [
    ...(rankingGpt.sectionRhythm ? [String(rankingGpt.sectionRhythm)] : []),
    ...(Array.isArray(listGpt.briclogSequence)
      ? listGpt.briclogSequence.slice(0, 8)
      : []),
    formatRankingPlaybookForPrompt(),
  ];
  const result = await generateDetailPagePack(
    {
      ...item.example,
      photos: item.shots,
      researchFacts: facts,
    },
    { allowLlm: true, allowImages: false, logLlmError: true }
  );
  const html = renderDetailPageBodyHtml(result.pack, result.photos || item.shots);
  const documentHtml = wrapMallHtml(html, result.pack, "smartstore");
  const success = assessDetailPageSuccess({
    pack: result.pack,
    html,
    photoCount: (result.photos || item.shots).length,
    input: item.example,
  });
  const compete = assessDetailPageCompeteWins({ html, wrapHtml: documentHtml });
  const file = join(outDir, `${item.id}.html`);
  writeFileSync(file, documentHtml, "utf8");
  generated.push({
    id: item.id,
    mode: result.mode,
    productName: result.pack.productName,
    sections: (result.pack.sections || []).map((s) => s.type),
    imgCount: (html.match(/<img /g) || []).length,
    engine: result.pack._meta?.sqv?.score || 0,
    success: success.score,
    panel: success.panel?.mean || 0,
    pad: success.measured?.padHits || 0,
    successOk: success.ok,
    competeOk: compete.ok,
    file,
  });
  console.log(
    `  ${item.id} mode=${result.mode} success=${success.score} panel=${success.panel?.mean} imgs=${generated.at(-1).imgCount}`
  );
}

const summary = {
  at: new Date().toISOString(),
  version: "detail-ranking-research-v1",
  shop: {
    queries: QUERIES,
    itemCount: rankItems.length,
    items: rankItems.slice(0, 24),
  },
  pages: pageInspects,
  listPages: listInspects.map((p) => ({
    id: p.id,
    status: p.status,
    bytes: p.bytes,
    headings: p.headings,
  })),
  rankingGpt,
  listGpt,
  generated,
  playbook: {
    sequence: DETAIL_PAGE_RANKING_SEQUENCE,
    tools: DETAIL_PAGE_LIST_TOOL_USE,
  },
};

writeFileSync(join(outDir, "latest.json"), JSON.stringify(summary, null, 2));
writeFileSync(
  join(outDir, "latest-summary.json"),
  JSON.stringify(
    {
      at: summary.at,
      shopItems: rankItems.length,
      generated,
      hardNo: listGpt.hardNo || [],
      take: (listGpt.tools || []).map((t) => `${t.id}:${t.take}`),
    },
    null,
    2
  )
);

const failed = generated.filter((g) => !g.successOk || g.mode !== "llm");
if (failed.length) {
  console.error("generate not clean", failed);
  process.exitCode = 1;
}
console.log(`ok detail-page-ranking-research out=${outDir}`);
