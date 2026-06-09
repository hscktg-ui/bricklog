/**
 * Golden Dataset — 우수글 비교·유사도 점수
 */
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { detectDuplicateKillerIssues } from "@/lib/content/duplicateKillerEngine";
import { scoreInputTopicDominance } from "@/lib/content/v13ContentGate";
import { scoreGoldenAiSmell } from "@/lib/golden/goldenAiSmellEngine";

function tokenSet(text = "") {
  return new Set(
    String(text || "")
      .replace(/[^\w가-힣\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2)
  );
}

function jaccard(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

function openingNaturalness(full = "", goldenOpeners = []) {
  const sentences = splitKoreanSentences(full).filter((s) => s.replace(/\s/g, "").length >= 12);
  const opener = sentences.slice(0, 2).join(" ");
  if (!opener) return { score: 50, ok: false };

  const hasScene = /(?:6월|여름|봄|가을|겨울|계절|처음|찾|고를|준비|되면|걷다|들어서)/.test(opener);
  const hasQuestion = /\?/.test(opener);
  const notTemplate = !/중립적으로|관련해서|이용\s*볼|카페는 메뉴보다/.test(opener);

  if (!goldenOpeners.length) {
    let score = 58;
    if (hasScene) score += 18;
    if (hasQuestion) score += 8;
    if (notTemplate) score += 16;
    if (sentences[0]?.length >= 20 && sentences[0]?.length <= 120) score += 12;
    return { score: Math.min(100, score), ok: score >= 65, opener, goldenSimilarity: 0, mode: "dna_heuristic" };
  }

  let best = 0;
  for (const g of goldenOpeners) {
    best = Math.max(best, jaccard(opener, g));
  }

  let score = Math.round(best * 55);
  if (hasScene) score += 15;
  if (hasQuestion) score += 8;
  if (notTemplate) score += 12;
  if (sentences[0]?.length >= 20 && sentences[0]?.length <= 120) score += 10;

  return { score: Math.min(100, score), ok: score >= 72, opener, goldenSimilarity: best };
}

function humanLikeness(full = "", samples = []) {
  if (!samples.length) return { score: 75, ok: true, mode: "no_samples" };

  const avgLen =
    splitKoreanSentences(full)
      .filter((s) => s.replace(/\s/g, "").length >= 8)
      .reduce((s, line, _, arr) => s + line.length / arr.length, 0) || 0;

  let structureSim = 0;
  for (const sample of samples.slice(0, 5)) {
    const gSentences = splitKoreanSentences(sample.content || sample.body || "");
    const gAvg =
      gSentences.filter((s) => s.replace(/\s/g, "").length >= 8).reduce((s, l, _, a) => s + l.length / a.length, 0) ||
      0;
    if (gAvg > 0) structureSim += 1 - Math.min(1, Math.abs(avgLen - gAvg) / gAvg);
  }
  structureSim /= Math.min(5, samples.length);

  const vocabSim = samples.slice(0, 5).reduce((s, sample) => s + jaccard(full, sample.content || ""), 0);
  const vocabNorm = vocabSim / Math.min(5, samples.length);

  const aiSmell = scoreGoldenAiSmell(full);
  const score = Math.round(structureSim * 35 + vocabNorm * 35 + aiSmell.score * 0.3);

  return {
    score: Math.min(100, score),
    ok: score >= 70,
    structureSim,
    vocabNorm,
  };
}

function packBodyText(pack = {}, full = "") {
  if (pack?.sections?.length) {
    return (pack.sections || []).map((s) => String(s.body || "").trim()).filter(Boolean).join("\n\n");
  }
  return String(full || "");
}

/**
 * @param {string} full
 * @param {object} pack
 * @param {object} input
 * @param {object[]} goldenSamples
 */
export function compareToGoldenDataset(full = "", pack = {}, input = {}, goldenSamples = []) {
  const body = packBodyText(pack, full);
  const samples = (goldenSamples || []).filter((s) => s?.content || s?.body);
  const goldenOpeners = samples.map((s) => {
    const b = String(s.content || s.body || "");
    return splitKoreanSentences(b).slice(0, 2).join(" ");
  });

  const opening = openingNaturalness(body, goldenOpeners);
  const info = scoreInformationYield(full, { input }, "blog");
  const dominance = scoreInputTopicDominance(full, { input }, "blog");
  const dup = detectDuplicateKillerIssues(full, { sameInfoMax: 2 });

  const repetitionScore = dup.ok ? 95 : Math.max(40, 95 - (dup.issues?.length || 0) * 12);
  const intentScore = Math.round((dominance.ratio || 0) * 60 + (info.score || 0) * 0.4);
  const human = humanLikeness(full, samples);

  const structureScore = Math.round(opening.score * 0.55 + human.score * 0.45);

  return {
    structure_score: structureScore,
    intent_score: Math.min(100, intentScore),
    repetition_score: repetitionScore,
    human_score: human.score,
    opening,
    human,
    infoYield: info.score,
    dominance: dominance.ratio,
    sampleCount: samples.length,
    referenceTitles: samples.slice(0, 5).map((s) => s.title).filter(Boolean),
  };
}
