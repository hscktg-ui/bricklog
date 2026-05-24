/**
 * 브랜드별 프로젝트 습관 — metadata·프롬프트 브리프
 */

const HABIT_META_KEYS = [
  "learning",
  "rewriteHints",
  "rewritePrefs",
  "editorAIActions",
  "preferredPhrases",
  "frequentlyUsedExpressions",
  "avoidedExpressions",
  "preferredSentenceStyle",
  "preferredSentenceLength",
  "successfulHooks",
  "highPerformingPatterns",
];

export function habitsFromMetadata(meta = {}) {
  const out = {};
  for (const key of HABIT_META_KEYS) {
    if (meta[key] !== undefined && meta[key] !== null) {
      out[key] = meta[key];
    }
  }
  return out;
}

export function habitsToMetadata(brand = {}) {
  const meta = {};
  for (const key of HABIT_META_KEYS) {
    const val = brand[key];
    if (val === undefined || val === null) continue;
    if (Array.isArray(val) && !val.length) continue;
    if (typeof val === "object" && !Array.isArray(val) && !Object.keys(val).length) {
      continue;
    }
    if (typeof val === "string" && !val.trim()) continue;
    meta[key] = val;
  }
  return meta;
}

const SENTENCE_STYLE_LABEL = {
  short: "짧은 문장",
  medium: "보통 문장",
  long: "긴 문장",
};

const TONE_LABELS = {
  emotional: "감성",
  informative: "정보",
  premium: "프리미엄",
  minimal: "미니멀",
};

/**
 * @param {Object} brand
 * @returns {string}
 */
export function formatBrandHabitsBrief(brand) {
  if (!brand) return "";
  const parts = [];

  const tagline = (brand.tagline || brand.brandDescription || "").trim();
  if (tagline) parts.push(`한 줄: ${tagline.slice(0, 80)}`);

  const slogan = (brand.slogan || brand.metadata?.slogan || "").trim();
  if (slogan) parts.push(`슬로건: ${slogan.slice(0, 60)}`);

  const target = (brand.targetAudience || brand.targetCustomer || "").trim();
  if (target) parts.push(`타겟: ${target.slice(0, 80)}`);

  const tone = brand.tone;
  if (tone) parts.push(`고정 톤: ${TONE_LABELS[tone] || tone}`);

  const style =
    brand.preferredSentenceStyle || brand.preferredSentenceLength;
  if (style) {
    parts.push(`문장 습관: ${SENTENCE_STYLE_LABEL[style] || style}`);
  }

  const mustRepeat = (brand.includePhrases || brand.mustRepeatPhrases || "").trim();
  if (mustRepeat) {
    parts.push(`반복 메시지: ${mustRepeat.slice(0, 120)}`);
  }

  const forbidden = (brand.forbiddenWords || brand.bannedWords || "").trim();
  if (forbidden) {
    parts.push(`금지 표현: ${forbidden.slice(0, 120)}`);
  }

  if (brand.rewriteHints) parts.push(`수정 습관: ${brand.rewriteHints}`);

  const preferred = brand.frequentlyUsedExpressions || [];
  if (preferred.length) {
    parts.push(`자주 쓰는 표현: ${preferred.slice(0, 5).join(", ")}`);
  } else if (brand.preferredPhrases) {
    parts.push(`선호 표현: ${String(brand.preferredPhrases).slice(0, 100)}`);
  }

  const avoided = brand.avoidedExpressions || [];
  if (avoided.length) {
    parts.push(`피하는 표현: ${avoided.slice(0, 5).join(", ")}`);
  }

  if (brand.learning?.preferredLength) {
    parts.push(`선호 길이: ${brand.learning.preferredLength}`);
  }

  if (brand.learning?.editCount >= 3) {
    parts.push("검수·수정 패턴이 쌓임 — 초안부터 반영");
  }

  return parts.join(" · ").slice(0, 900);
}
