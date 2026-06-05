/**
 * 네이버 블로그 API 표본 → 경험형(사람 후기) 말투 프로필 학습
 * 선행: npm run learn:naver-blog (samples-latest.jsonl)
 * Run: npm run learn:experience-voice
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EXPERIENCE_VOICE_MARKERS,
  EXPERIENCE_VOICE_VERSION,
} from "../lib/content/experienceVoiceProfile.js";
import { mergeNetizenIntoExperienceProfile } from "../lib/content/experienceVoiceMerge.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SAMPLES = join(ROOT, "artifacts", "naver-blog-learning", "samples-latest.jsonl");
const OUT_DIR = join(ROOT, "artifacts", "experience-voice-learning");
const OUT = join(OUT_DIR, "profile-latest.json");

const ROLE_RULES = {
  arrival: [/(?:갔|왔)는데/, /(?:가|다녀)(?:보|와|온)/, /들러(?:서|봤)/],
  emotion: [/그렇더라/, /그랬더라/, /너무\s*(?:좋|만족)/, /후회\s*없/, /완전\s*만족/],
  worry: [/(?:고민|걱정)(?:했|하)(?:는데|던데)/, /(?:헷갈|막막)/],
  relief: [/(?:다행|아쉬)/, /미리\s*.+(?:걸|할\s*걸)/],
  reflection: [/솔직히/, /(?:처음|요즘)/, /(?:생각|예상)보다/, /그래서/, /근데/],
};

const CHECKLIST_BAD = [/확인하세요/, /권합니다/, /체크리스트/, /소개해\s*드/];
const FIELD_GOOD = [/직접/, /다녀/, /방문/, /체험/, /느꼈/, /먹어\s*보/, /누워/];

function loadSamples(limit = 12000) {
  if (!existsSync(SAMPLES)) return [];
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

function splitSentences(text) {
  return String(text || "")
    .replace(/#[^\s]+/g, " ")
    .split(/(?<=[.!?…])\s+|\.{2,}/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 12 && s.length <= 100);
}

function scoreExperienceSample(row) {
  const text = `${row.title || ""} ${row.snippet || ""}`;
  let score = row.score || 0;
  let markerHits = 0;
  for (const re of EXPERIENCE_VOICE_MARKERS) {
    if (re.test(text)) markerHits += 1;
  }
  score += markerHits * 3;
  if (row.fieldHits >= 1) score += 4;
  if (row.voiceHits >= 2) score += 3;
  if (row.checklistHits >= 1) score -= 12;
  if (FIELD_GOOD.some((re) => re.test(text))) score += 2;
  if (/후기|솔직|다녀|방문|체험|내돈내산/.test(row.title || "")) score += 3;
  if (CHECKLIST_BAD.some((re) => re.test(text))) score -= 8;
  if (text.replace(/\s/g, "").length < 36) score -= 4;
  return { ...row, experienceScore: score, markerHits };
}

function classifyRole(sentence) {
  for (const [role, rules] of Object.entries(ROLE_RULES)) {
    if (rules.some((re) => re.test(sentence))) return role;
  }
  return null;
}

function normSentenceKey(s) {
  return String(s || "")
    .replace(/\s/g, "")
    .slice(0, 48);
}

function extractRoleBuckets(samples, perRole = 24) {
  const buckets = { arrival: [], emotion: [], worry: [], relief: [], reflection: [] };
  const seen = new Set();

  for (const row of samples) {
    const sentences = splitSentences(`${row.title} ${row.snippet}`);
    for (const sent of sentences) {
      if (CHECKLIST_BAD.some((re) => re.test(sent))) continue;
      const role = classifyRole(sent);
      if (!role) continue;
      const key = normSentenceKey(sent);
      if (seen.has(key)) continue;
      seen.add(key);
      const catBoost =
        row.category === "가구점" && /(?:가구|침대|쇼룸|매트리스|전시)/.test(sent) ? 8 : 0;
      buckets[role].push({
        line: sent,
        count: 1,
        category: row.category || "기타",
        score: (row.experienceScore || 0) + catBoost,
      });
      if (buckets[role].length >= perRole * 3) continue;
    }
  }

  for (const role of Object.keys(buckets)) {
    buckets[role] = buckets[role]
      .sort((a, b) => b.score - a.score)
      .slice(0, perRole)
      .map(({ line, count, category }) => ({ line, count, category }));
  }
  return buckets;
}

function countPatterns(samples) {
  const counts = {};
  const bump = (k) => {
    counts[k] = (counts[k] || 0) + 1;
  };
  for (const row of samples) {
    const text = `${row.title} ${row.snippet}`;
    if (/(?:갔|왔)는데/.test(text)) bump("arrival_reaction");
    if (/(?:고민|걱정).{0,24}(?:는데|던데)/.test(text)) bump("worry_turn");
    if (/다행|미리/.test(text)) bump("relief_regret");
    if (/그래서/.test(text) && /(?:좋|만족|괜찮)/.test(text)) bump("positive_turn");
    if (/솔직히|처음엔/.test(text)) bump("honest_setup");
    if (/그렇더라|그랬더라/.test(text)) bump("that_was_so");
  }
  return counts;
}

function main() {
  const all = loadSamples();
  if (!all.length) {
    console.error("samples 없음 — 먼저: npm run learn:naver-blog");
    process.exit(1);
  }

  const ranked = all
    .map((row) => scoreExperienceSample(row))
    .filter((r) => r.experienceScore >= 10 && r.markerHits >= 1)
    .sort((a, b) => b.experienceScore - a.experienceScore);

  const top = ranked.slice(0, Math.min(500, ranked.length));
  const roleBuckets = extractRoleBuckets(top);
  const patternCounts = countPatterns(top);

  let experienceHits = 0;
  let fieldHits = 0;
  let haeyoHits = 0;
  for (const row of top) {
    const text = `${row.title} ${row.snippet}`;
    if (EXPERIENCE_VOICE_MARKERS.some((re) => re.test(text))) experienceHits += 1;
    if (FIELD_GOOD.some((re) => re.test(text))) fieldHits += 1;
    if (/(?:했|였|봤|갔)어요|더라(?:구|고)요/.test(text)) haeyoHits += 1;
  }

  const learnedExamples = top
    .slice(0, 12)
    .map((r) => String(r.snippet || r.title).replace(/\s+/g, " ").trim().slice(0, 96));

  const promptExamples = [
    ...Object.values(roleBuckets)
      .flat()
      .slice(0, 6)
      .map((x) => x.line),
    ...learnedExamples.slice(0, 4),
  ]
    .filter(Boolean)
    .slice(0, 10);

  let profile = {
    version: EXPERIENCE_VOICE_VERSION,
    learnedAt: new Date().toISOString(),
    sampleCount: top.length,
    sourceTotal: all.length,
    source: "naver-blog-learning/samples-latest.jsonl",
    qualityThreshold: 10,
    rates: {
      experienceRate: Math.round((experienceHits / Math.max(1, top.length)) * 1000) / 10,
      fieldRate: Math.round((fieldHits / Math.max(1, top.length)) * 1000) / 10,
      haeyoRate: Math.round((haeyoHits / Math.max(1, top.length)) * 1000) / 10,
    },
    roleBuckets,
    patternCounts,
    learnedExamples,
    promptExamples,
    categories: [...new Set(top.map((r) => r.category).filter(Boolean))].slice(0, 14),
  };

  const netizenPath = join(ROOT, "artifacts", "netizen-voice-learning", "profile-latest.json");
  if (existsSync(netizenPath)) {
    try {
      profile = mergeNetizenIntoExperienceProfile(
        profile,
        JSON.parse(readFileSync(netizenPath, "utf8"))
      );
      console.log("merged netizen profile from", netizenPath);
    } catch (e) {
      console.warn("netizen merge skip:", e.message);
    }
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(profile, null, 2), "utf8");

  console.log("=== experience-voice learn ===");
  console.log("top samples:", top.length, "/", all.length);
  console.log("rates:", profile.rates);
  console.log("patterns:", profile.patternCounts);
  console.log(
    "role buckets:",
    Object.fromEntries(Object.entries(roleBuckets).map(([k, v]) => [k, v.length]))
  );
  console.log("prompt examples:", promptExamples.length);
  console.log("written:", OUT);
}

main();
