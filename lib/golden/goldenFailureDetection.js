/**
 * 실패글 패턴 감지 — 생성 후 FAIL·감점 SSOT
 */
import {
  FAILURE_ARTICLE_RULES,
  FORBIDDEN_GLOBAL_PHRASES,
} from "@/lib/golden/haeshinContentDnaSeed";
import { getFailurePatternsForIndustry } from "@/lib/golden/goldenFailureSeed";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";

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

  const placeholderHits = countPhraseHits(text, FORBIDDEN_GLOBAL_PHRASES);
  if (placeholderHits >= 2 || /좋은내용|브랜드명|지역명|undefined|null/.test(text)) {
    hits.push("placeholder");
    reasons.push("Placeholder 잔존");
  }

  const industryKey = resolveGoldenIndustryKey(input);
  for (const sample of getFailurePatternsForIndustry(industryKey)) {
    if (sample.fail_reason === "industry_mix") {
      const markers = ["알레르기", "원재료", "매트리스", "승소 보장"];
      if (industryKey === "flower_shop" && markers.some((m) => text.includes(m))) {
        hits.push("industry_mix");
        reasons.push("업종 혼입");
        break;
      }
    }
  }

  const unique = [...new Set(hits)];
  const criticalFail =
    unique.includes("placeholder") ||
    unique.includes("industry_mix") ||
    (unique.includes("voice_mix") && voice.severe) ||
    placeholderHits >= 3;

  return {
    hits: unique,
    reasons: [...new Set(reasons)],
    criticalFail,
    voice,
    placeholderHits,
  };
}
