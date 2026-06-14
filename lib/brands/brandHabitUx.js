/**
 * 브랜드 습관 UX — 고객 화면 SSOT (자동 저장·자동 반영)
 */

export const BRAND_HABIT_HEADLINE = "브랜드 기억";
export const BRAND_HABIT_SUBLINE =
  "톤·금지어·피드백·검수는 저장 없이 다음 「조사 후 글 받기」에 자동 반영됩니다.";

export const BRAND_HABIT_EMPTY_LINE =
  "브랜드를 고르고 글을 받거나 피드백을 남기면, 이 브랜드만의 말투가 쌓입니다.";

export const BRAND_HABIT_SAVING = "저장 중…";
export const BRAND_HABIT_SAVED = "저장됨 · 다음 글에 자동 반영";
export const BRAND_HABIT_LEARNING = "학습 반영 중 · 다음 글부터 더 맞춰집니다";

/** @param {{ generations?: number; feedback?: number }} counts */
export function isBrandHabitLearningActive(counts = {}) {
  return (counts.generations || 0) >= 2 || (counts.feedback || 0) >= 1;
}

/**
 * @param {object} opts
 * @param {string} [opts.habitsBrief]
 * @param {string} [opts.serverBrief]
 * @param {boolean} [opts.learningActive]
 * @param {string} [opts.pendingNote]
 */
export function resolveBrandHabitStatusLine({
  habitsBrief = "",
  serverBrief = "",
  learningActive = false,
  pendingNote = "",
} = {}) {
  if (pendingNote) return pendingNote;
  if (serverBrief) return serverBrief;
  if (habitsBrief) return habitsBrief;
  if (learningActive) return BRAND_HABIT_LEARNING;
  return BRAND_HABIT_EMPTY_LINE;
}

/**
 * @param {{ generations?: number; feedback?: number }} counts
 */
export function formatBrandHabitActivityMeta(counts = {}) {
  const gen = counts.generations || 0;
  const fb = counts.feedback || 0;
  if (!gen && !fb) return "";
  const parts = [];
  if (fb > 0) parts.push(`피드백 ${fb}건`);
  if (gen > 0) parts.push(`글 ${gen}편`);
  return parts.join(" · ");
}
