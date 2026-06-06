/**
 * 검수본 저장 시 수정 전·후 diff → 브랜드별 학습
 */
import { getBrandById, upsertBrand } from "@/lib/brands/brandMemory";
import { formatBrandHabitsBrief } from "@/lib/brands/brandHabits";
import { analyzeHumanCorrection } from "@/lib/evolution/humanCorrectionEngine";

function tokenize(text) {
  return String(text || "")
    .split(/[\s,.\n!?]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);
}

function diffPhrases(before, after) {
  const bSet = new Set(tokenize(before));
  const aSet = new Set(tokenize(after));
  const added = [...aSet].filter((w) => !bSet.has(w)).slice(0, 12);
  const removed = [...bSet].filter((w) => !aSet.has(w)).slice(0, 12);
  return { added, removed };
}

export function learnFromEdit(brandId, channel, beforePlain, afterPlain) {
  if (!brandId || !afterPlain) return null;
  const brand = getBrandById(brandId);
  if (!brand) return null;

  const { added, removed } = diffPhrases(beforePlain, afterPlain);
  const correction = analyzeHumanCorrection(beforePlain, afterPlain);
  const preferred = [...(brand.preferredPhrases || []), ...added]
    .filter(Boolean)
    .slice(0, 20);
  const avoided = [...(brand.avoidedExpressions || []), ...removed]
    .filter(Boolean)
    .slice(0, 20);

  const learning = {
    ...(brand.learning || {}),
    lastChannel: channel,
    lastEditAt: new Date().toISOString(),
    preferredLength:
      afterPlain.length > (beforePlain?.length || 0) * 1.1
        ? "long"
        : afterPlain.length < (beforePlain?.length || 0) * 0.9
          ? "short"
          : brand.preferredSentenceStyle || "medium",
    editCount: (brand.learning?.editCount || 0) + 1,
  };

  const humanCorrectionPrefs = correction.changed
    ? { ...(brand.humanCorrectionPrefs || {}), ...correction.preferences }
    : brand.humanCorrectionPrefs;

  return upsertBrand({
    ...brand,
    preferredPhrases: preferred.join(", "),
    frequentlyUsedExpressions: preferred.slice(0, 8),
    avoidedExpressions: avoided,
    humanCorrectionPrefs,
    learning,
  });
}

export function learnEditorAIAction(brandId, actionId) {
  if (!brandId || !actionId) return null;
  const brand = getBrandById(brandId);
  if (!brand) return null;
  const counts = { ...(brand.editorAIActions || {}) };
  counts[actionId] = (counts[actionId] || 0) + 1;
  const hints = [];
  if (counts.less_ad >= 2) hints.push("광고·과장 표현 최소");
  if (counts.warmer >= 2) hints.push("따뜻한 문장 톤");
  if (counts.plain >= 2) hints.push("짧고 담백하게");
  if (counts.less_kw >= 2) hints.push("키워드 반복 줄이기");
  if (counts.emoji >= 2) hints.push("이모지 절제");
  return upsertBrand({
    ...brand,
    editorAIActions: counts,
    rewriteHints: hints.slice(0, 5).join(" · ") || brand.rewriteHints,
  });
}

export function learnRewritePreference(brandId, channel, feedbackText, categories = []) {
  if (!brandId) return null;
  const brand = getBrandById(brandId);
  if (!brand) return null;
  const prefs = { ...(brand.rewritePrefs || {}) };
  for (const cat of categories) {
    prefs[cat] = (prefs[cat] || 0) + 1;
  }
  const hints = [];
  if (prefs.less_ad >= 2) hints.push("광고·과장 표현 최소");
  if (prefs.warmer >= 2) hints.push("따뜻한 문장 톤");
  if (prefs.shorter >= 2) hints.push("짧고 담백하게");
  if (prefs.less_kw >= 2) hints.push("키워드 반복 줄이기");
  if (prefs.anti_gpt >= 2) hints.push("GPT 말투 제거");

  return upsertBrand({
    ...brand,
    rewritePrefs: prefs,
    rewriteHints: hints.slice(0, 5).join(" · "),
    lastRewriteChannel: channel,
    lastRewriteFeedback: feedbackText?.slice(0, 80),
  });
}

export function getBrandLearningBrief(brand) {
  const habitsBrief = formatBrandHabitsBrief(brand);
  if (habitsBrief) return habitsBrief;

  if (
    !brand?.learning &&
    !brand?.frequentlyUsedExpressions?.length &&
    !brand?.rewriteHints
  ) {
    return "";
  }
  const parts = [];
  if (brand.rewriteHints) parts.push(`수정 선호: ${brand.rewriteHints}`);
  if (brand.frequentlyUsedExpressions?.length) {
    parts.push(`선호 표현: ${brand.frequentlyUsedExpressions.slice(0, 5).join(", ")}`);
  }
  if (brand.avoidedExpressions?.length) {
    parts.push(`제거 패턴: ${brand.avoidedExpressions.slice(0, 5).join(", ")}`);
  }
  if (brand.learning?.preferredLength) {
    parts.push(`선호 길이: ${brand.learning.preferredLength}`);
  }
  return parts.join(" · ");
}
