/**
 * 고품질 블로그·후기·칼럼 표본 ~100건 → 기승전결·톤 프로필
 * Run: node --import ./scripts/register-alias.mjs scripts/learn-column-magazine-archetype.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SAMPLES = join(ROOT, "artifacts", "naver-blog-learning", "samples-latest.jsonl");
const OUT_DIR = join(ROOT, "artifacts", "column-magazine-learning");
const OUT = join(OUT_DIR, "profile-latest.json");

const GI_RES = [
  /왜\s*(?:이|그|요즘|지금)/,
  /(?:고민|궁금|찾(?:게|다)|검색)/,
  /(?:상황|배경|처음|요즘|많아서|헷갈)/,
  /솔직히/,
];
const SEUNG_RES = [
  /직접\s*(?:가|방문|다녀|먹|체험|누워|확인)/,
  /(?:다녀(?:왔|온)|가\s*봤|들러)/,
  /(?:느(?:꼈|낀)|체감|체험|먹어\s*보)/,
];
const JEON_RES = [
  /(?:비교|기준|포인트|막히|장단|아쉬|달랐|차이)/,
  /(?:선택|판단|고를\s*때)/,
];
const GYEOL_RES = [
  /(?:정리|마무리|한\s*번\s*더|다시|추천|다음에|재방)/,
  /(?:본인\s*기준|도움이|수월|편했)/,
];

const HAEYO_RE = /(?:해요|했어요|더라고요|거든요|네요|죠|같아요|편했어요|좋았어요|나았어요)/g;
const HAMNIDA_RE = /(?:합니다|습니다|드립니다|겠습니다)/g;

const TRANSITION_CANDIDATES = [
  "그래서",
  "직접 가보니",
  "솔직히 말하면",
  "비교해 보니",
  "정리하면",
  "현장에서 보니",
  "처음엔",
  "근데",
  "사실",
];

function loadSamples(limit = 10000) {
  const raw = readFileSync(SAMPLES, "utf8").trim().split(/\n/);
  const rows = [];
  for (const line of raw) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line));
    } catch {
      /* skip */
    }
    if (rows.length >= limit) break;
  }
  return rows;
}

function scoreSample(row) {
  const text = `${row.title || ""} ${row.snippet || ""}`;
  let score = row.score || 0;
  if (row.fieldHits >= 1) score += 2;
  if (row.voiceHits >= 2) score += 2;
  if (row.checklistHits > 0) score -= 8;
  if (!row.titleGood) score -= 3;
  if (/후기|솔직|다녀|방문|체험|칼럼|에세이|내돈내산/.test(row.title || "")) score += 2;
  if (/확인하세요|권합니다|FAQ|체크리스트/.test(text)) score -= 10;
  if (text.replace(/\s/g, "").length < 40) score -= 5;
  return score;
}

function countRes(text, resList) {
  return resList.filter((re) => re.test(text)).length;
}

function topPhrases(texts, pattern, limit = 12) {
  const freq = new Map();
  for (const t of texts) {
    const m = String(t || "").match(pattern);
    if (m) {
      for (const hit of m.slice(0, 3)) {
        const key = hit.trim().slice(0, 24);
        if (key.length >= 4) freq.set(key, (freq.get(key) || 0) + 1);
      }
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

function main() {
  const all = loadSamples();
  const ranked = all
    .map((row) => ({ ...row, qualityScore: scoreSample(row) }))
    .filter((r) => r.qualityScore >= 8)
    .sort((a, b) => b.qualityScore - a.qualityScore);

  const top = ranked.slice(0, 100);
  const texts = top.map((r) => `${r.title} ${r.snippet}`);

  let giHits = 0;
  let seungHits = 0;
  let jeonHits = 0;
  let gyeolHits = 0;
  let haeyo = 0;
  let hamnida = 0;

  for (const text of texts) {
    if (countRes(text, GI_RES)) giHits += 1;
    if (countRes(text, SEUNG_RES)) seungHits += 1;
    if (countRes(text, JEON_RES)) jeonHits += 1;
    if (countRes(text, GYEOL_RES)) gyeolHits += 1;
    haeyo += (text.match(HAEYO_RE) || []).length;
    hamnida += (text.match(HAMNIDA_RE) || []).length;
  }

  const transitionHits = TRANSITION_CANDIDATES.map((t) => ({
    phrase: t,
    count: texts.filter((x) => x.includes(t)).length,
  }))
    .filter((x) => x.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const transitions = transitionHits.length
    ? transitionHits.map((x) =>
        x.phrase === "그래서"
          ? "그래서 직접 가 봤어요."
          : x.phrase === "비교해 보니"
            ? "비교해 보니 기준이 보였어요."
            : x.phrase === "정리하면"
              ? "정리하면 이렇게 짚을 수 있었어요."
              : `${x.phrase} ${x.phrase.includes("보니") ? "감이 달랐어요." : "이야기를 이어갈 수 있었어요."}`
      )
    : undefined;

  const profile = {
    version: "v1",
    learnedAt: new Date().toISOString(),
    sampleCount: top.length,
    source: "naver-blog-learning/samples-latest.jsonl",
    qualityThreshold: 8,
    rates: {
      giRate: Math.round((giHits / top.length) * 1000) / 10,
      seungRate: Math.round((seungHits / top.length) * 1000) / 10,
      jeonRate: Math.round((jeonHits / top.length) * 1000) / 10,
      gyeolRate: Math.round((gyeolHits / top.length) * 1000) / 10,
      haeyoPerSample: Math.round((haeyo / top.length) * 10) / 10,
      hamnidaPerSample: Math.round((hamnida / top.length) * 10) / 10,
    },
    arcRoles: ["기", "승", "승", "전", "전", "결"],
    transitions,
    topOpeners: topPhrases(
      top.map((r) => r.snippet),
      /(?:솔직히|요즘|처음|왜|고민)[^.!?]{0,40}[.!?]?/g,
      8
    ),
    topClosers: topPhrases(
      top.map((r) => r.snippet),
      /[^.!?]{8,40}(?:했어요|더라고요|정리|마무리)[.!?]?/g,
      8
    ),
    categories: [...new Set(top.map((r) => r.category).filter(Boolean))].slice(0, 12),
  };

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(profile, null, 2), "utf8");

  console.log("=== column-magazine archetype learn ===");
  console.log("samples:", top.length, "/", all.length);
  console.log("rates:", profile.rates);
  console.log("transitions:", profile.transitions?.length || 0);
  console.log("written:", OUT);
}

main();
