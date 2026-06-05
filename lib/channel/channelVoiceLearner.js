/**
 * 스마트플레이스·인스타그램 채널 음성 — 네이버 API 스니펫 학습
 */
import {
  fetchNaverBlogResults,
  fetchNaverWebResults,
} from "@/lib/research/searchSources/naverSearch";
import { queryChannelHint } from "@/lib/channel/channelVoiceQueryCatalog";

const PLACE_OWNER_RES = [
  /안내(?:드립|해)/,
  /(?:운영|영업|휴무|입고|예약|방문)/,
  /(?:공지|소식|이벤트|프로모|할인|행사)/,
  /(?:준비|마련|보충|오픈|시작)/,
  /(?:매장|저희|당일|기간)/,
  /(?:확인(?:해\s*주| 부탁)|문의)/,
  /(?:~했습니다|~해두었|~해\s*두)/,
];

const PLACE_BLOG_LEAK_RES = [
  /솔직\s*후기/,
  /다녀(?:왔|온)/,
  /직접\s*가\s*봤/,
  /블로그/,
  /SEO|키워드|검색창/,
  /체크리스트/,
  /알아보시다\s*보면/,
  /상권\s*분석/,
  /비교해\s*보/,
  /내돈내산/,
];

const INSTA_VOICE_RES = [
  /(?:^|\n)[^.!?]{4,42}$/m,
  /(?:더라고요|더라구요|같아요|해요|했어요)/,
  /(?:감성|분위기|무드|장면|순간|오늘|요즘)/,
  /(?:저장|공감|스친|피드)/,
  /(?:~인\s*날|~한\s*날)/,
  /(?:\.{3}|…)/,
  /(?:근데|그래서|사실|솔직히)/,
];

const INSTA_PLACE_LEAK_RES = [
  /안내(?:드립|해)\s*니다/,
  /영업\s*시간/,
  /휴무\s*일/,
  /예약\s*(?:문의|확인)/,
  /플레이스/,
  /공지\s*사항/,
  /블로그/,
  /체크리스트/,
  /확인하세요/,
  /권합니다/,
];

const INSTA_BLOG_LEAK_RES = [
  /솔직\s*후기/,
  /다녀(?:왔|온)\s*후기/,
  /섹션|소제목/,
  /정리(?:하|해)\s*(?:봤|드)/,
  /(?:1800|2800|3000|3200|3800|5000)\s*자/,
];

function countRes(text, list) {
  let n = 0;
  for (const re of list) {
    if (re.test(text)) n += 1;
  }
  return n;
}

function normTitleKey(title = "") {
  return String(title || "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .slice(0, 72);
}

function splitSentences(text) {
  return String(text || "")
    .replace(/#[^\s]+/g, " ")
    .split(/(?<=[.!?…])\s+|\.{2,}|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 6 && s.length <= 88);
}

export function analyzeSmartPlaceSample({ title = "", snippet = "", query = "" } = {}) {
  const text = `${title} ${snippet}`.trim();
  const ownerHits = countRes(text, PLACE_OWNER_RES);
  const blogLeakHits = countRes(text, PLACE_BLOG_LEAK_RES);
  const shortNoticeLike = splitSentences(snippet).filter((s) => s.length <= 72).length;
  return {
    title: String(title || "").trim(),
    snippet: String(snippet || "").slice(0, 280),
    query: String(query || "").trim(),
    category: queryChannelHint(query, "smartplace"),
    ownerHits,
    blogLeakHits,
    shortNoticeLike,
    titleLen: String(title || "").replace(/\s/g, "").length,
    score: ownerHits * 4 + shortNoticeLike * 2 - blogLeakHits * 8,
  };
}

export function analyzeInstagramSample({ title = "", snippet = "", query = "" } = {}) {
  const text = `${title} ${snippet}`.trim();
  const voiceHits = countRes(text, INSTA_VOICE_RES);
  const placeLeakHits = countRes(text, INSTA_PLACE_LEAK_RES);
  const blogLeakHits = countRes(text, INSTA_BLOG_LEAK_RES);
  const shortLines = splitSentences(snippet).filter((s) => s.length <= 48).length;
  const hookLike = /^[^.!?]{6,52}$/.test(String(snippet || "").split(/\n/)[0]?.trim() || "");
  return {
    title: String(title || "").trim(),
    snippet: String(snippet || "").slice(0, 280),
    query: String(query || "").trim(),
    category: queryChannelHint(query, "instagram"),
    voiceHits,
    placeLeakHits,
    blogLeakHits,
    shortLines,
    hookLike,
    titleLen: String(title || "").replace(/\s/g, "").length,
    score: voiceHits * 3 + shortLines * 2 + (hookLike ? 3 : 0) - placeLeakHits * 6 - blogLeakHits * 7,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchMixedBatch(query, perQuery) {
  const rows = [];
  for (const fetcher of [fetchNaverWebResults, fetchNaverBlogResults]) {
    try {
      const batch = await fetcher(query, { display: perQuery, sort: "sim" });
      if (batch.ok) rows.push(...(batch.results || []));
    } catch {
      /* next */
    }
  }
  return rows;
}

function buildChannelProfile(channel, samples, analyzeFn) {
  const n = Math.max(1, samples.length);
  const top = [...samples].sort((a, b) => b.score - a.score).slice(0, 80);

  const examples = top
    .slice(0, 14)
    .map((s) => String(s.snippet || s.title).replace(/\s+/g, " ").trim().slice(0, 92))
    .filter(Boolean);

  const hookExamples = top
    .flatMap((s) => splitSentences(s.snippet))
    .filter((line) => line.length >= 8 && line.length <= 52)
    .slice(0, 16);

  const avoidPhrases =
    channel === "smartplace"
      ? [
          "솔직 후기",
          "다녀왔어요",
          "블로그",
          "SEO",
          "키워드",
          "체크리스트",
          "알아보시다 보면",
          "상권 분석",
        ]
      : [
          "안내드립니다",
          "영업시간",
          "블로그",
          "체크리스트",
          "확인하세요",
          "저장해두세요",
          "정리했습니다",
          "소개해드릴게요",
        ];

  const structureHints =
    channel === "smartplace"
      ? [
          "사장님·매장 1인칭 공지 — 방문 후기체 금지",
          "제목: [공지]/[이벤트] + 핵심 한 줄 (14~44자)",
          "shortNotice: 모바일 한 줄 요약 ≤120자",
          "detailBody: 운영·기간·혜택·예약 200~380자, 문장 짧게",
          "이모지 0~1개, CTA는 예약·방문·문의",
        ]
      : [
          "Hook 1줄 — 시·감정·장면 (≤56자, 마침표 생략 가능)",
          "본문: 1~2문장마다 줄바꿈, 블로그·공지체 금지",
          "마무리: 부드러운 여운, 명령형 CTA 금지",
          "해시태그 5~12, 지역·브랜드·무드",
          "이모지 0~2개, MZ 밈 과장 금지",
        ];

  const rates =
    channel === "smartplace"
      ? {
          ownerVoiceRate:
            Math.round(
              (samples.filter((s) => s.ownerHits >= 2).length / n) * 1000
            ) / 10,
          blogLeakRate:
            Math.round(
              (samples.filter((s) => s.blogLeakHits >= 1).length / n) * 1000
            ) / 10,
        }
      : {
          voiceRate:
            Math.round(
              (samples.filter((s) => s.voiceHits >= 2).length / n) * 1000
            ) / 10,
          placeLeakRate:
            Math.round(
              (samples.filter((s) => s.placeLeakHits >= 1).length / n) * 1000
            ) / 10,
          blogLeakRate:
            Math.round(
              (samples.filter((s) => s.blogLeakHits >= 1).length / n) * 1000
            ) / 10,
        };

  const promptBlock = [
    channel === "smartplace"
      ? "【스마트플레이스 · 네이버 API 표본 학습】"
      : "【인스타그램 · 네이버 API 표본 학습】",
    `표본 ${n}건 — ${channel === "smartplace" ? "사장님 공지" : "캡션·감성"} 톤 (블로그체·복붙 금지)`,
    ...structureHints.map((h) => `- ${h}`),
    examples.length
      ? `실제 상위 표현 예 (참고용):\n${examples.slice(0, 6).map((e) => `- "${e}"`).join("\n")}`
      : "",
    `금지: ${avoidPhrases.slice(0, 8).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    version: "v1",
    channel,
    learnedAt: new Date().toISOString(),
    sampleCount: n,
    queryCount: new Set(samples.map((s) => s.query).filter(Boolean)).size,
    rates,
    structureHints,
    avoidPhrases,
    promptExamples: examples.slice(0, 10),
    hookExamples: hookExamples.slice(0, 10),
    promptBlock,
    categories: [...new Set(samples.map((s) => s.category).filter(Boolean))].slice(0, 12),
  };
}

/**
 * @param {'smartplace'|'instagram'} channel
 */
export async function learnFromChannelVoiceSearch(channel, opts = {}) {
  const targetSamples = opts.targetSamples ?? 400;
  const perQuery = Math.min(8, Math.max(4, opts.perQuery ?? 6));
  const delayMs = opts.delayMs ?? 140;
  const queries = opts.queries || [];
  const analyzeFn =
    channel === "smartplace" ? analyzeSmartPlaceSample : analyzeInstagramSample;

  const seen = new Set();
  const samples = [];
  let apiCalls = 0;
  let errors = 0;

  for (let i = 0; i < queries.length; i++) {
    if (samples.length >= targetSamples) break;
    const query = queries[i];
    try {
      const rows = await fetchMixedBatch(query, perQuery);
      apiCalls += 2;
      for (const row of rows) {
        const key = normTitleKey(row.title);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        samples.push(
          analyzeFn({ title: row.title, snippet: row.snippet, query })
        );
        if (samples.length >= targetSamples) break;
      }
    } catch {
      errors += 1;
    }
    if (opts.onProgress && (i % 8 === 0 || samples.length >= targetSamples)) {
      opts.onProgress({
        queriesDone: i + 1,
        queriesTotal: queries.length,
        samples: samples.length,
        targetSamples,
        apiCalls,
        errors,
      });
    }
    if (delayMs > 0 && i < queries.length - 1) await sleep(delayMs);
  }

  const profile = buildChannelProfile(channel, samples, analyzeFn);
  return {
    ...profile,
    _learnMeta: { apiCalls, errors, dedupedTitles: seen.size },
    samples,
  };
}

export function buildSmartPlaceProfile(samples = []) {
  return buildChannelProfile("smartplace", samples, analyzeSmartPlaceSample);
}

export function buildInstagramProfile(samples = []) {
  return buildChannelProfile("instagram", samples, analyzeInstagramSample);
}
