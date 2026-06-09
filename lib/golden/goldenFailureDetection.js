/**
 * 실패글 패턴 감지 — 생성 후 FAIL·감점 SSOT
 */
import { FAILURE_ARTICLE_RULES } from "@/lib/golden/haeshinContentDnaSeed";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";
import {
  matchesFailureSamplePattern,
  resolveFailurePatternsForIndustry,
} from "@/lib/golden/goldenFailurePatterns";
import { getForbiddenGlobalPhrases } from "@/lib/golden/haeshinPhraseLists";

function countPhraseHits(text, phrases = []) {
  let hits = 0;
  for (const p of phrases) {
    if (text.includes(p)) hits += 1;
  }
  return hits;
}

function detectVoiceMix(full = "") {
  const hasSeupnida = /습니다|습니까|됩니다|입니다/.test(full);
  const hasHaeyo = /해요|예요|이에요|거예요|세요/.test(full);
  const hasCasual = /했어요|봤어요|뒀어요|됐어요|였어요|는데요/.test(full);
  const modes = [hasSeupnida, hasHaeyo, hasCasual].filter(Boolean).length;
  return { modes, mixed: modes >= 2, severe: modes >= 3 };
}

/**
 * @param {string} full
 * @param {object} input
 */
export function detectFailureArticlePatterns(full = "", input = {}) {
  const text = String(full || "");
  const hits = [];
  const reasons = [];
  const forbidden = getForbiddenGlobalPhrases(input);

  for (const rule of FAILURE_ARTICLE_RULES) {
    if (!rule.re) continue;
    if (rule.id === "repeat_spam") {
      const matches = text.match(rule.re);
      if (matches && matches.length > 1) {
        hits.push(rule.id);
        reasons.push(rule.label);
      }
      continue;
    }
    if (rule.re.test(text)) {
      hits.push(rule.id);
      reasons.push(rule.label);
    }
  }

  const voice = detectVoiceMix(text);
  if (voice.severe) {
    hits.push("voice_mix");
    reasons.push("말투 혼합(3종)");
  } else if (voice.mixed && /메모해\s*뒀|확인해\s*뒀|들으며/.test(text)) {
    hits.push("voice_mix");
    reasons.push("말투 혼합+현장 메모");
  }

  const placeholderHits = countPhraseHits(text, forbidden);
  if (placeholderHits >= 2 || /좋은내용|브랜드명|지역명|undefined|null/.test(text)) {
    hits.push("placeholder");
    reasons.push("Placeholder 잔존");
  }

  const industryKey = resolveGoldenIndustryKey(input);
  for (const sample of resolveFailurePatternsForIndustry(industryKey, input)) {
    if (matchesFailureSamplePattern(text, sample)) {
      hits.push(`failure_${sample.fail_reason || "pattern"}`);
      reasons.push(`실패글 패턴: ${sample.title || sample.fail_reason}`);
    }
  }

  const unique = [...new Set(hits)];
  const criticalFail =
    unique.includes("placeholder") ||
    unique.some((h) => h.startsWith("failure_")) ||
    unique.includes("industry_mix") ||
    (unique.includes("voice_mix") && voice.severe) ||
    placeholderHits >= 3;

  return {
    hits: unique,
    reasons: [...new Set(reasons)],
    criticalFail,
    voice,
    placeholderHits,
    failurePatternCount: resolveFailurePatternsForIndustry(industryKey, input).length,
  };
}
