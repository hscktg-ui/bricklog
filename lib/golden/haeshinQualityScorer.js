/**
 * 해신기획 품질 점수 — 100점 만점 SSOT (섹션 11)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { detectDuplicateKillerIssues } from "@/lib/content/duplicateKillerEngine";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { scoreInputTopicDominance } from "@/lib/content/v13ContentGate";
import {
  AI_CLICHE_PHRASES,
  FORBIDDEN_GLOBAL_PHRASES,
  FORBIDDEN_CLOSINGS,
  FORBIDDEN_OPENINGS,
  HAESHIN_SCORE_WEIGHTS,
  INDUSTRY_CONTENT_DNA,
  PREFERRED_CLOSING_PATTERNS,
  PREFERRED_OPENING_PATTERNS,
} from "@/lib/golden/haeshinContentDnaSeed";
import { scoreGoldenBrandDna } from "@/lib/golden/goldenBrandDnaEngine";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";

function countPhraseHits(text, phrases = []) {
  let hits = 0;
  for (const p of phrases) {
    if (text.includes(p)) hits += 1;
  }
  return hits;
}

function scoreTopicFit(full, input) {
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (!topic) return { score: 70, ok: true };
  const tokens = topic.split(/[,，\s·]+/).filter((t) => t.length >= 2);
  const hit = tokens.filter((t) => full.includes(t)).length;
  const ratio = tokens.length ? hit / tokens.length : 1;
  const score = Math.round(ratio * 100);
  return { score, ok: score >= 60, hit, total: tokens.length };
}

function scoreSearchIntent(full, input) {
  const key = resolveGoldenIndustryKey(input);
  const dna = INDUSTRY_CONTENT_DNA[key] || INDUSTRY_CONTENT_DNA.etc;
  const intents = dna.searchIntents || [];
  const topicBlob = `${input.topic || ""} ${input.mainKeyword || ""}`;
  const hit = intents.filter(
    (i) => full.includes(i.slice(0, Math.min(6, i.length))) || topicBlob.includes(i)
  ).length;
  const mustHit = (dna.mustInclude || []).filter((m) => {
    const w = m.split(/\s/)[0];
    return w.length >= 2 && full.includes(w);
  }).length;

  let score = Math.min(100, Math.round((hit / Math.max(1, intents.length)) * 50 + mustHit * 12));
  if (PREFERRED_OPENING_PATTERNS.some((re) => re.test(full))) score += 8;
  if (FORBIDDEN_OPENINGS.some((re) => re.test(full.split("\n")[0] || ""))) score -= 25;

  return { score: Math.max(0, Math.min(100, score)), ok: score >= 65, intentsHit: hit, mustHit };
}

function scoreProseConsistency(full) {
  const hasSeupnida = /습니다|습니까|됩니다/.test(full);
  const hasHaeyo = /해요|예요|이에요|거예요/.test(full);
  const hasHaess = /했어요|봤어요|됐어요|였어요/.test(full);
  const modes = [hasSeupnida, hasHaeyo, hasHaess].filter(Boolean).length;
  if (modes >= 3) return { score: 35, ok: false, modes };
  if (modes === 2) return { score: 68, ok: false, modes };
  return { score: 92, ok: true, modes };
}

function scoreSpeakerConsistency(pack, input) {
  const speaker = String(input.v4Speaker || input.speaker || "").trim();
  const full = getBlogFullText(pack);
  if (/field_review|visit_review|솔직/.test(speaker)) {
    const ok = /다녀|방문|직접|솔직/.test(full);
    return { score: ok ? 90 : 55, ok };
  }
  if (/brand_intro|magazine/.test(speaker)) {
    const adLike = /지금\s+바로|최고의\s+선택|많은\s+관심/.test(full);
    return { score: adLike ? 45 : 88, ok: !adLike };
  }
  return { score: 80, ok: true };
}

function scoreAiClicheRemoval(full) {
  const hits = countPhraseHits(full, AI_CLICHE_PHRASES);
  const score = Math.max(0, 100 - hits * 18);
  return { score, ok: hits === 0, hits };
}

function scoreForbiddenPlaceholder(full) {
  const hits = countPhraseHits(full, FORBIDDEN_GLOBAL_PHRASES);
  const literal = /(?:^|\s)이용(?:\s|$)|좋은내용|브랜드명|지역명/.test(full);
  const score = Math.max(0, 100 - hits * 20 - (literal ? 40 : 0));
  return { score, ok: score >= 90 && !literal, hits, literal };
}

function scoreIndustryDnaFit(full, input) {
  const key = resolveGoldenIndustryKey(input);
  const dna = INDUSTRY_CONTENT_DNA[key] || INDUSTRY_CONTENT_DNA.etc;
  let score = 100;
  const foreign = [];
  for (const re of dna.forbiddenWords || []) {
    if (re.test(full)) foreign.push(re.source);
  }
  score -= Math.min(50, foreign.length * 18);
  const preferred = (dna.preferredLines || []).filter((l) => full.includes(l.slice(0, 12))).length;
  score += Math.min(15, preferred * 5);
  return {
    score: Math.max(0, Math.min(100, score)),
    ok: foreign.length === 0,
    foreign,
    preferred,
    dnaKey: dna.industry,
  };
}

function scoreRepetition(full) {
  const dup = detectDuplicateKillerIssues(full, { sameInfoMax: 2 });
  const repeatSpam = (full.match(/비교가\s*수월해요/g) || []).length;
  let score = dup.ok ? 95 : Math.max(40, 95 - (dup.issues?.length || 0) * 15);
  if (repeatSpam > 1) score -= 30;
  return { score, ok: score >= 85 && repeatSpam < 2, repeatSpam };
}

function scoreInfoDensity(full, input) {
  const info = scoreInformationYield(full, { input }, "blog");
  const concrete = splitKoreanSentences(full).filter((s) =>
    /(?:리시안|해바라기|메뉴|매트리스|진료|예약|24\s*시간|무인|\d)/.test(s)
  ).length;
  const score = Math.round(info.score * 0.6 + Math.min(100, concrete * 15) * 0.4);
  return { score: Math.min(100, score), ok: score >= 65, concrete };
}

function scoreClosingOpening(full) {
  const lines = full.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const opener = lines[0] || "";
  const closer = lines[lines.length - 1] || "";
  let bonus = 0;
  if (PREFERRED_OPENING_PATTERNS.some((re) => re.test(opener))) bonus += 5;
  if (PREFERRED_CLOSING_PATTERNS.some((re) => re.test(closer))) bonus += 5;
  if (FORBIDDEN_CLOSINGS.some((re) => re.test(closer))) bonus -= 15;
  return bonus;
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function assessHaeshinQualityScore(pack, input = {}) {
  const full = getBlogFullText(pack);
  const topic = scoreTopicFit(full, input);
  const intent = scoreSearchIntent(full, input);
  const brand = scoreGoldenBrandDna(full, input);
  const industry = scoreIndustryDnaFit(full, input);
  const prose = scoreProseConsistency(full);
  const speaker = scoreSpeakerConsistency(pack, input);
  const repetition = scoreRepetition(full);
  const aiCliche = scoreAiClicheRemoval(full);
  const placeholder = scoreForbiddenPlaceholder(full);
  const info = scoreInfoDensity(full, input);
  const openingClosingBonus = scoreClosingOpening(full);

  const components = {
    topic_fit: Math.min(100, topic.score),
    search_intent: Math.min(100, intent.score + openingClosingBonus),
    brand_reflection: brand.score,
    industry_fit: industry.score,
    prose_consistency: prose.score,
    speaker_consistency: speaker.score,
    repetition_removal: repetition.score,
    ai_cliche_removal: Math.min(aiCliche.score, placeholder.score),
    information_density: info.score,
  };

  let total = 0;
  for (const [key, maxPts] of Object.entries(HAESHIN_SCORE_WEIGHTS)) {
    total += ((components[key] || 0) / 100) * maxPts;
  }
  const score = Math.round(Math.max(0, Math.min(100, total)));

  const reasons = [];
  if (placeholder.literal || placeholder.hits > 0) reasons.push("haeshin_placeholder");
  if (!industry.ok) reasons.push("haeshin_industry_dna_fail");
  if (!prose.ok) reasons.push("haeshin_voice_mix");
  if (!aiCliche.ok) reasons.push("haeshin_ai_cliche");
  if (!intent.ok) reasons.push("haeshin_intent_miss");
  if (!brand.ok) reasons.push("haeshin_brand_weak");

  let verdict = "pass";
  if (score < 80) verdict = "fail";
  else if (score < 90) verdict = "revise";

  return {
    version: "v1",
    score,
    ok: score >= 90,
    verdict,
    shouldBlock: score < 80,
    shouldRevise: score >= 80 && score < 90,
    components,
    maxPoints: HAESHIN_SCORE_WEIGHTS,
    reasons: [...new Set(reasons)],
    checks: { topic, intent, brand, industry, prose, speaker, repetition, aiCliche, placeholder, info },
  };
}
