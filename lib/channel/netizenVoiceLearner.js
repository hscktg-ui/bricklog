/**
 * 네티즌·스레드·커뮤니티 구어 말투 — 네이버 web+blog 스니펫 학습
 */
import {
  fetchNaverBlogResults,
  fetchNaverWebResults,
} from "@/lib/research/searchSources/naverSearch";
import { queryNetizenHint } from "@/lib/channel/netizenVoiceQueryCatalog";

/** 후기·구어 신호 (신조어·스레드 톤 포함) */
export const NETIZEN_VOICE_RES = [
  /(?:더라구요|더라고요|같더라|인\s*듯|해보니까?|가보니까?|써보니까?)/,
  /(?:솔직히\s*말하면|개인적으로|의외로|생각보다|예상보다)/,
  /(?:갔|왔|가|다녀)(?:봤|보니|는데)/,
  /(?:근데|그래서|사실|요즘)/,
  /(?:진짜|완전)\s+(?:괜찮|만족|좋|편|괜찮았)/,
  /(?:고민|걱정)(?:했|하)(?:는데|던데)/,
  /(?:다행|미리)/,
  /(?:느꼈|체감|만족)/,
  /(?:ㅋㅋ|ㅠㅠ|ㄹㅇ)/,
  /(?:레전드|찐맛|찐)/,
];

const BLOG_LEAK_RES = [
  /확인하세요/,
  /권합니다/,
  /체크리스트/,
  /소개해\s*드/,
  /SEO|키워드\s*밀도/,
  /알아보시다\s*보면/,
  /저장해두세요/,
];

const ROLE_RULES = {
  arrival: [
    /(?:갔|왔)는데/,
    /(?:가|다녀)(?:보|와|온)/,
    /들러(?:서|봤)/,
    /해보니까?/,
    /가보니까?/,
  ],
  emotion: [
    /그렇더라/,
    /그랬더라/,
    /같더라/,
    /(?:진짜|완전)\s*(?:좋|만족|괜찮)/,
    /의외로/,
    /레전드|찐/,
  ],
  worry: [/(?:고민|걱정)(?:했|하)(?:는데|던데)/, /(?:헷갈|막막)/, /솔직히\s*말하면/],
  relief: [/(?:다행|아쉬)/, /미리\s*.+(?:걸|할\s*걸)/],
  reflection: [
    /솔직히/,
    /개인적으로/,
    /(?:생각|예상)보다/,
    /근데/,
    /처음(?:엔|에는)/,
    /인\s*듯/,
  ],
  punch: [
    /^[^.!?]{6,36}$/,
    /(?:ㅋㅋ|ㅠㅠ)/,
    /(?:레전드|찐|ㄹㅇ)/,
    /한\s*줄\s*요약/,
  ],
};

export const NETIZEN_ROLE_ORDER = [
  "arrival",
  "emotion",
  "worry",
  "relief",
  "reflection",
  "punch",
];

function countRes(text, list) {
  let n = 0;
  for (const re of list) {
    if (re.test(text)) n += 1;
  }
  return n;
}

function splitSentences(text) {
  return String(text || "")
    .replace(/#[^\s]+/g, " ")
    .split(/(?<=[.!?…])\s+|\.{2,}|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 10 && s.length <= 96);
}

function classifyRole(sentence) {
  for (const [role, rules] of Object.entries(ROLE_RULES)) {
    if (rules.some((re) => re.test(sentence))) return role;
  }
  return null;
}

export function analyzeNetizenSample({ title = "", snippet = "", query = "" } = {}) {
  const text = `${title} ${snippet}`.trim();
  const voiceHits = countRes(text, NETIZEN_VOICE_RES);
  const leakHits = countRes(text, BLOG_LEAK_RES);
  const haeyo = /(?:해요|했어요|더라(?:구|고)요|거든요|네요|어요)/.test(text);
  const threadsLike = /스레드|threads|쓰레드/i.test(`${query} ${text}`);
  const slangLike = /(?:ㅋㅋ|ㄹㅇ|레전드|찐|ㅠㅠ)/.test(text);

  let score = voiceHits * 4 + (haeyo ? 3 : 0) - leakHits * 10;
  if (threadsLike) score += 4;
  if (slangLike && voiceHits >= 2) score += 3;
  if (/후기|솔직|다녀|체험|방문/.test(text)) score += 3;
  if (leakHits >= 2) score -= 8;
  if (text.replace(/\s/g, "").length < 28) score -= 5;

  return {
    title: String(title || "").trim(),
    snippet: String(snippet || "").slice(0, 280),
    query: String(query || "").trim(),
    source: queryNetizenHint(query),
    voiceHits,
    leakHits,
    haeyo,
    threadsLike,
    slangLike,
    score,
  };
}

function normKey(title = "") {
  return String(title || "")
    .replace(/\s+/g, "")
    .toLowerCase()
    .slice(0, 72);
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
      /* */
    }
  }
  return rows;
}

function extractRoleBuckets(samples, perRole = 28) {
  const buckets = Object.fromEntries(NETIZEN_ROLE_ORDER.map((r) => [r, []]));
  const seen = new Set();

  for (const row of samples) {
    for (const sent of splitSentences(`${row.title} ${row.snippet}`)) {
      if (BLOG_LEAK_RES.some((re) => re.test(sent))) continue;
      const role = classifyRole(sent);
      if (!role) continue;
      const key = sent.replace(/\s/g, "").slice(0, 48);
      if (seen.has(key)) continue;
      seen.add(key);
      buckets[role].push({
        line: sent,
        count: 1,
        category: row.source || "netizen",
        score: (row.score || 0) + (row.threadsLike ? 4 : 0),
      });
    }
  }

  for (const role of NETIZEN_ROLE_ORDER) {
    buckets[role] = buckets[role]
      .sort((a, b) => b.score - a.score)
      .slice(0, perRole)
      .map(({ line, count, category }) => ({ line, count, category }));
  }
  return buckets;
}

function extractVoicePatterns(samples) {
  const counts = {};
  const bump = (k) => {
    counts[k] = (counts[k] || 0) + 1;
  };
  for (const row of samples) {
    const text = `${row.title} ${row.snippet}`;
    if (/더라구요|더라고요/.test(text)) bump("deorago");
    if (/해보니까?|가보니까?/.test(text)) bump("try_and_see");
    if (/솔직히\s*말하면|개인적으로/.test(text)) bump("honest_frame");
    if (/생각보다|의외로/.test(text)) bump("contrast");
    if (/인\s*듯/.test(text)) bump("in_deut");
    if (/진짜\s+괜찮|완전\s+만족/.test(text)) bump("intensity");
    if (/(?:고민|걱정).{0,20}(?:는데|던데)/.test(text)) bump("worry_turn");
    if (/다행|미리/.test(text)) bump("relief");
    if (/ㅋㅋ|ㄹㅇ|레전드|찐/.test(text)) bump("slang_light");
  }
  return counts;
}

function buildVoiceMarkerHints(patternCounts = {}) {
  const hints = [];
  if (patternCounts.deorago) hints.push("~더라구요/더라고요");
  if (patternCounts.try_and_see) hints.push("해보니까/가보니까");
  if (patternCounts.honest_frame) hints.push("솔직히 말하면·개인적으로");
  if (patternCounts.contrast) hints.push("생각보다·의외로");
  if (patternCounts.in_deut) hints.push("~인 듯");
  if (patternCounts.intensity) hints.push("진짜/완전 (과장 금지, 1~2회)");
  if (patternCounts.slang_light) hints.push("가벼운 커뮤니티 어휘 (과다 금지)");
  return hints;
}

export function buildNetizenVoiceProfile(samples = []) {
  const ranked = [...samples].sort((a, b) => b.score - a.score);
  const top = ranked.slice(0, Math.min(600, ranked.length));
  const roleBuckets = extractRoleBuckets(top);
  const patternCounts = extractVoicePatterns(top);
  const n = Math.max(1, top.length);

  const promptExamples = [
    ...Object.values(roleBuckets)
      .flat()
      .slice(0, 8)
      .map((x) => x.line),
    ...top
      .slice(0, 6)
      .map((r) => String(r.snippet || r.title).slice(0, 88)),
  ].filter(Boolean);

  const voiceMarkerHints = buildVoiceMarkerHints(patternCounts);

  const promptBlock = [
    "【네티즌·스레드·커뮤니티 말투 · 네이버 API 학습】",
    `표본 ${n}건 — 블로그 후기·스레드·커뮤니티 구어 (정보 나열·체크리스트 금지)`,
    voiceMarkerHints.length ? `자주 보이는 톤: ${voiceMarkerHints.join(", ")}` : "",
    "실제 상위 표현 (참고만, 그대로 복사 금지):",
    ...promptExamples.slice(0, 6).map((e) => `- "${e}"`),
    "과한 신조어·밈·ㅋㅋ 남발 금지. 경험 1인칭·해요체 유지.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    version: "v1",
    channel: "netizen",
    learnedAt: new Date().toISOString(),
    sampleCount: n,
    queryCount: new Set(samples.map((s) => s.query).filter(Boolean)).size,
    rates: {
      voiceRate: Math.round((top.filter((s) => s.voiceHits >= 2).length / n) * 1000) / 10,
      threadsRate: Math.round((top.filter((s) => s.threadsLike).length / n) * 1000) / 10,
      slangRate: Math.round((top.filter((s) => s.slangLike).length / n) * 1000) / 10,
      haeyoRate: Math.round((top.filter((s) => s.haeyo).length / n) * 1000) / 10,
    },
    roleBuckets,
    patternCounts,
    voiceMarkerHints,
    promptExamples: promptExamples.slice(0, 12),
    promptBlock,
    sources: [...new Set(top.map((s) => s.source).filter(Boolean))].slice(0, 8),
  };
}

export async function learnFromNetizenVoiceSearch(opts = {}) {
  const targetSamples = opts.targetSamples ?? 400;
  const perQuery = Math.min(8, Math.max(4, opts.perQuery ?? 6));
  const delayMs = opts.delayMs ?? 140;
  const queries = opts.queries || [];

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
        const key = normKey(row.title);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const analyzed = analyzeNetizenSample({
          title: row.title,
          snippet: row.snippet,
          query,
        });
        if (analyzed.score >= 6 && analyzed.leakHits <= 1) {
          samples.push(analyzed);
        }
        if (samples.length >= targetSamples) break;
      }
    } catch {
      errors += 1;
    }
    if (opts.onProgress && (i % 6 === 0 || samples.length >= targetSamples)) {
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

  const profile = buildNetizenVoiceProfile(samples);
  return { ...profile, _learnMeta: { apiCalls, errors }, samples };
}
