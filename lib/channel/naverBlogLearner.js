/**
 * 네이버 블로그 검색 스니펫 학습 — 제목·도입·문체·어구 추출 (본문 크롤 없음)
 */
import { fetchNaverBlogResults } from "@/lib/research/searchSources/naverSearch";
import {
  buildNaverBlogLearnQueries,
  queryCategoryHint,
  NAVER_LEARN_QUERIES_LEGACY,
} from "@/lib/channel/naverBlogQueryCatalog.js";

export { buildNaverBlogLearnQueries } from "@/lib/channel/naverBlogQueryCatalog.js";

/** @deprecated — buildNaverBlogLearnQueries({ targetQueries: 15 }) 사용 */
export const NAVER_LEARN_QUERIES = NAVER_LEARN_QUERIES_LEGACY;

const FIELD_SIGNAL_RES = [
  /다녀(?:왔|온|가)/,
  /직접\s*(?:가|방문|먹|체험|누워|확인|상담|보)/,
  /(?:가|들)(?:봤|보)[어]?/,
  /느(?:꼈|낀)/,
  /솔직(?:히)?/,
  /처음\s*(?:가|방문)/,
  /예약(?:하고|해서|해)/,
  /먹어\s*보/,
  /앉아\s*(?:서|보)/,
  /들러(?:서|봤)/,
  /써\s*보/,
  /받아\s*보/,
];

const BLOG_VOICE_RES = [
  /(?:했|였|봤|갔)어요/,
  /(?:더|같)아요/,
  /거든요/,
  /(?:근데|그래서|사실|요즘|솔직히)/,
  /(?:봤|갔)는데/,
  /(?:좋|아쉬)[았었]*/,
  /(?:네요|죠|더라)/,
  /(?:편했|나았|괜찮)/,
  /(?:추천|비추)/,
];

const CHECKLIST_BAD_RES = [
  /확인하세요/,
  /권합니다/,
  /필요합니다\.?$/,
  /체크리스트/,
  /알아두(?:세요|면)/,
  /참고하세요/,
  /검색(?:하|해)\s*보/,
  /소개(?:해\s*드|합니다)/,
];

const TITLE_GOOD_RES = [
  /후기|리뷰|다녀|방문|체험|솔직|추천|정리|비교|알아|가볼|둘러/,
  /[가-힣]{2,8}(?:에서|근처)/,
];

const PHRASE_EXTRACT_RES = [
  /직접\s*[가-힣]{1,12}/g,
  /[가-힣]{2,14}(?:했|였|봤|갔)어요/g,
  /솔직(?:히)?\s*[가-힣]{0,10}/g,
  /(?:다녀|방문)(?:왔|온|해)[가-힣]{0,8}/g,
  /(?:처음|예약)(?:하고|해서|해)[가-힣]{0,10}/g,
  /[가-힣]{2,10}\s*(?:추천|비추)/g,
  /(?:갔|왔)는데\s*[가-힣]{0,20}/g,
  /(?:고민|걱정)(?:했|하)(?:는데|던데)[가-힣]{0,16}/g,
  /그렇더라(?:구|고)요/g,
  /(?:다행|미리)[가-힣]{0,18}/g,
];

function countRes(text, resList) {
  let n = 0;
  for (const re of resList) {
    if (re.test(text)) n += 1;
  }
  return n;
}

function normKey(title = "") {
  return String(title || "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .slice(0, 80);
}

export function analyzeNaverBlogSample({ title = "", snippet = "", query = "" } = {}) {
  const text = `${title} ${snippet}`.trim();
  const fieldHits = countRes(text, FIELD_SIGNAL_RES);
  const voiceHits = countRes(text, BLOG_VOICE_RES);
  const checklistHits = countRes(text, CHECKLIST_BAD_RES);
  const titleGood = TITLE_GOOD_RES.some((re) => re.test(title));
  return {
    title: String(title || "").trim(),
    snippet: String(snippet || "").slice(0, 240),
    query: String(query || "").trim(),
    category: queryCategoryHint(query),
    fieldHits,
    voiceHits,
    checklistHits,
    titleGood,
    titleLen: String(title || "").replace(/\s/g, "").length,
    score: fieldHits * 3 + voiceHits * 2 + (titleGood ? 4 : 0) - checklistHits * 5,
  };
}

function topPhrases(samples, key, limit = 12) {
  const freq = new Map();
  for (const s of samples) {
    const t = String(s[key] || "").trim();
    if (t.length < 6) continue;
    const norm = t.replace(/\s+/g, " ").slice(0, 56);
    freq.set(norm, (freq.get(norm) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

function extractPhraseCorpus(samples, limit = 40) {
  const freq = new Map();
  for (const s of samples) {
    const text = `${s.title} ${s.snippet}`;
    for (const re of PHRASE_EXTRACT_RES) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text))) {
        const p = m[0].replace(/\s+/g, " ").trim().slice(0, 24);
        if (p.length < 4) continue;
        freq.set(p, (freq.get(p) || 0) + 1);
      }
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([phrase, count]) => ({ phrase, count }));
}

function extractTitleTokens(samples) {
  const bits = [];
  for (const s of samples) {
    const t = s.title || "";
    if (/에서/.test(t)) bits.push("지역+에서");
    if (/후기|리뷰/.test(t)) bits.push("후기·리뷰");
    if (/솔직|솔직후기/.test(t)) bits.push("솔직");
    if (/추천/.test(t)) bits.push("추천");
    if (/체험|방문|다녀/.test(t)) bits.push("체험·방문");
    if (/비교|정리/.test(t)) bits.push("비교·정리");
    if (/예약|상담/.test(t)) bits.push("예약·상담");
    if (/할인|행사|이벤트/.test(t)) bits.push("행사·할인");
  }
  const freq = {};
  for (const b of bits) freq[b] = (freq[b] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k]) => k);
}

function categoryBreakdown(samples) {
  const byCat = {};
  for (const s of samples) {
    const cat = s.category || "기타";
    if (!byCat[cat]) {
      byCat[cat] = { count: 0, field: 0, voice: 0, checklist: 0 };
    }
    byCat[cat].count += 1;
    if (s.fieldHits >= 1) byCat[cat].field += 1;
    if (s.voiceHits >= 1) byCat[cat].voice += 1;
    if (s.checklistHits >= 1) byCat[cat].checklist += 1;
  }
  const out = {};
  for (const [cat, v] of Object.entries(byCat)) {
    const n = Math.max(1, v.count);
    out[cat] = {
      count: v.count,
      fieldRate: Math.round((v.field / n) * 1000) / 10,
      voiceRate: Math.round((v.voice / n) * 1000) / 10,
      checklistRate: Math.round((v.checklist / n) * 1000) / 10,
    };
  }
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function buildNaverBlogProfile(samples = []) {
  const n = Math.max(1, samples.length);
  const fieldRate = samples.filter((s) => s.fieldHits >= 1).length / n;
  const voiceRate = samples.filter((s) => s.voiceHits >= 1).length / n;
  const checklistRate = samples.filter((s) => s.checklistHits >= 1).length / n;
  const titleGoodRate = samples.filter((s) => s.titleGood).length / n;
  const avgTitleLen = samples.reduce((a, s) => a + (s.titleLen || 0), 0) / n;

  const topSamples = [...samples].sort((a, b) => b.score - a.score).slice(0, 24);
  const phraseCorpus = extractPhraseCorpus(samples, 50);

  const avoidPhrases = [
    "확인하세요",
    "권합니다",
    "체크리스트",
    "알아보시다 보면",
    "검색하시는 분",
    "소개해 드리",
    "방문·예약 안내",
    "공식·매장 안내 기준",
  ];
  if (checklistRate < 0.08) {
    avoidPhrases.push("체크리스트로");
  }

  const openerSignals = [
    "다녀",
    "직접",
    "처음",
    "예약",
    "솔직",
    "느꼈",
    "가봤",
    "먹어",
    "들러",
    "써봤",
    "받아봤",
  ];

  const structureHints = [
    "도입 2~4문장: 방문·선택 계기 (FAQ·체크리스트 금지)",
    `소제목 ${titleGoodRate > 0.6 ? "4~6" : "5~7"}개, 문단 2~4줄`,
    "지역+브랜드+주제는 문장 속에 자연 삽입 (제목·소제목 나열 금지)",
    "장단점·체감·예상과 다른 점 1회 이상",
    "마무리 CTA 1~2문장, 과장·명령형 금지",
    "상위글 어구: 해요체·구어 연결(근데/그래서/솔직히) 자연 사용",
  ];

  const titlePatterns = [
    "{region} {brand} {topic} 다녀온 후기",
    "{region} {topic} 솔직 후기 · {brand}",
    "{brand} {region} 매장 방문, {topic} 체험",
    "{region}에서 {topic} 찾다가 {brand}",
    "{region} {category} {topic} 추천",
  ];

  const catBreak = categoryBreakdown(samples);
  const topCats = Object.entries(catBreak)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([k, v]) => `${k}(${v.count})`)
    .join(", ");

  const promptBlock = [
    "【네이버 블로그 채널 · 검색 학습 프로필】",
    `상위 스니펫 ${n}건 · ${Object.keys(catBreak).length}개 업종 — 현장 ${Math.round(fieldRate * 100)}%, 구어체 ${Math.round(voiceRate * 100)}%, 체크리스트 ${Math.round(checklistRate * 100)}%`,
    `업종 분포: ${topCats}`,
    `제목: ${Math.round(avgTitleLen)}자, ${extractTitleTokens(topSamples).join(" · ")}`,
    ...structureHints.map((h) => `- ${h}`),
    `도입 신호: ${openerSignals.slice(0, 8).join(", ")}`,
    phraseCorpus.length
      ? `자주 보이는 어구: ${phraseCorpus.slice(0, 8).map((p) => p.phrase).join(" · ")}`
      : "",
    `금지(상위글 희귀): ${avoidPhrases.slice(0, 10).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    learnedAt: new Date().toISOString(),
    sampleCount: n,
    queryCount: new Set(samples.map((s) => s.query).filter(Boolean)).size,
    categoryCount: Object.keys(catBreak).length,
    metrics: {
      fieldRate: Math.round(fieldRate * 1000) / 10,
      voiceRate: Math.round(voiceRate * 1000) / 10,
      checklistRate: Math.round(checklistRate * 1000) / 10,
      titleGoodRate: Math.round(titleGoodRate * 1000) / 10,
      avgTitleLen: Math.round(avgTitleLen),
    },
    categoryBreakdown: catBreak,
    titlePatterns,
    titleTokens: extractTitleTokens(topSamples),
    openerSignals,
    avoidPhrases: [...new Set(avoidPhrases)],
    voicePhrases: phraseCorpus.filter((p) => /어요|거든|솔직|직접/.test(p.phrase)).slice(0, 20),
    phraseCorpus,
    structureHints,
    topTitles: topPhrases(topSamples, "title", 10),
    topSnippets: topPhrases(topSamples, "snippet", 8),
    promptBlock,
  };
}

/**
 * @param {object} [opts]
 */
export async function learnFromNaverBlogSearch(opts = {}) {
  const targetSamples = opts.targetSamples ?? 2000;
  const perPage = Math.min(100, Math.max(5, opts.perQuery ?? opts.perPage ?? 20));
  const maxPages = opts.maxPages ?? (targetSamples >= 5000 ? 3 : 1);
  const delayMs = opts.delayMs ?? 120;
  const queryTarget = Math.ceil(targetSamples / Math.max(2, perPage * 0.6)) + 50;
  const queries =
    opts.queries ||
    buildNaverBlogLearnQueries({
      targetQueries: queryTarget,
      fullCatalog: targetSamples >= 5000,
    });

  const seenTitle = new Set();
  const samples = [];
  let apiCalls = 0;
  let errors = 0;
  let queriesUsed = 0;

  async function ingestBatch(rows, query) {
    for (const row of rows || []) {
      const key = normKey(row.title);
      if (!key || seenTitle.has(key)) continue;
      seenTitle.add(key);
      samples.push(
        analyzeNaverBlogSample({
          title: row.title,
          snippet: row.snippet,
          query,
        })
      );
      if (samples.length >= targetSamples) return true;
    }
    return samples.length >= targetSamples;
  }

  let queriesAttempted = 0;

  for (let i = 0; i < queries.length; i++) {
    if (samples.length >= targetSamples) break;
    queriesAttempted = i + 1;
    const query = queries[i];
    let queryAdded = 0;

    for (let page = 0; page < maxPages; page++) {
      if (samples.length >= targetSamples) break;
      const start = page * perPage + 1;
      const sort = page % 2 === 0 ? "sim" : "date";
      try {
        const batch = await fetchNaverBlogResults(query, {
          display: perPage,
          start,
          sort,
        });
        apiCalls += 1;
        if (!batch.ok) {
          errors += 1;
          break;
        }
        const before = samples.length;
        const done = await ingestBatch(batch.results, query);
        queryAdded += samples.length - before;
        if (done) break;
        if ((batch.results || []).length < perPage) break;
      } catch {
        errors += 1;
        break;
      }
      if (delayMs > 0) await sleep(Math.max(40, delayMs / 2));
    }

    if (queryAdded > 0) queriesUsed += 1;

    if (opts.onProgress && (i % 40 === 0 || samples.length >= targetSamples)) {
      opts.onProgress({
        queriesDone: i + 1,
        queriesTotal: queries.length,
        samples: samples.length,
        targetSamples,
        apiCalls,
        errors,
        queriesUsed,
      });
    }

    if (delayMs > 0 && i < queries.length - 1) {
      await sleep(delayMs);
    }
  }

  const profile = buildNaverBlogProfile(samples);
  return {
    ...profile,
    _learnMeta: {
      apiCalls,
      errors,
      queriesAttempted,
      queriesUsed,
      dedupedTitles: seenTitle.size,
      maxPages,
      perPage,
    },
    samples,
  };
}
