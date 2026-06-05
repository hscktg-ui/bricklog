/**
 * 고객 약속 — 인간 필치·감정·분량 tier·패딩 금지 (프롬프트 + 휴리스틱)
 */
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { getBlogFullText } from "@/utils/qualityCheck";
import { CORE_AI_CLICHES } from "@/lib/quality/coreQualityEngine";
import { hasEmotionLayer } from "@/lib/persona/humanWritingFramework";

/** 분량 늘리기용 반복·빈 수식 */
export const FILLER_PADDING_PATTERNS = [
  /많은\s*분들이/,
  /이러한\s*점에서/,
  /다양한\s*방면에서/,
  /종합적으로\s*보면/,
  /한편으로는/,
  /또\s*한편으로는/,
  /결론적으로\s*말씀드리/,
  /도움이\s*되시길/,
  /참고\s*하시기\s*바랍니다/,
  /알아두시면\s*좋/,
  /궁금하신\s*분들/,
  /검색하시는\s*분/,
  /저장해\s*두시/,
  /마무리하며\s*말씀/,
];

export const HUMAN_DELIVERY_PROMPT_RULES = `【고객 약속 · 인간 글】
- AI가 쓴 듯한 말투·관용구·소제목 나열 금지. 사람이 키보드로 직접 쓴 느낌.
- 감정·공감은 '감동을 선사' 같은 말이 아니라 장면·순간·몸의 반응으로 전달.
- 선택한 분량 tier(min~max)를 반드시 지킬 것. 부족하면 정보·장면을 보강하고, 초과하면 군더더기를 자르기. 분량 맞추기용 반복·일반론·빈 문단 금지.
- 품질이 분량보다 우선. 억지로 글자 수를 채우지 말 것.`;

/**
 * @param {object} pack
 * @param {Record<string, unknown>} ctx
 */
export function scoreLengthTierCompliance(pack, ctx = {}) {
  const tierKey =
    ctx.input?.blogLengthTier || ctx.blogLengthTier || "medium";
  const tier = resolveBlogLengthTier(tierKey);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const reasons = [];
  let score = 10;

  if (chars < tier.min) {
    reasons.push("length_tier_under");
    score -= Math.min(8, Math.round(((tier.min - chars) / tier.min) * 10));
  } else if (chars > tier.max) {
    reasons.push("length_tier_over");
    const over = chars - tier.max;
    score -= Math.min(6, Math.round((over / tier.max) * 8));
  }

  const inBand = chars >= tier.min && chars <= tier.max;
  return {
    ok: inBand,
    score: Math.max(0, score),
    chars,
    tier: tierKey,
    min: tier.min,
    target: tier.target,
    max: tier.max,
    reasons,
  };
}

/**
 * @param {string} full
 */
export function countFillerPadding(full) {
  let n = 0;
  for (const re of FILLER_PADDING_PATTERNS) {
    if (re.test(full)) n += 1;
  }
  return n;
}

/**
 * @param {string} full
 */
export function countAiClicheHits(full) {
  let n = 0;
  for (const p of CORE_AI_CLICHES) {
    if (full.includes(p)) n += 1;
  }
  return n;
}

/**
 * @param {object} pack
 * @param {Record<string, unknown>} ctx
 */
export function scoreHumanDeliveryHeuristics(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const fillerN = countFillerPadding(full);
  const clicheN = countAiClicheHits(full);
  const hasEmotion = hasEmotionLayer(full);
  const length = scoreLengthTierCompliance(pack, ctx);

  const reasons = [...length.reasons];
  let score = 10;

  if (fillerN >= 2) {
    reasons.push("filler_padding");
    score -= Math.min(5, fillerN * 2);
  } else if (fillerN === 1) {
    score -= 1;
  }

  if (clicheN >= 3) {
    reasons.push("ai_cliche_heavy");
    score -= 4;
  } else if (clicheN >= 1) {
    score -= clicheN;
  }

  if (!hasEmotion) {
    reasons.push("emotion_thin");
    score -= 2;
  }

  score = Math.max(0, Math.min(10, score + (length.score >= 8 ? 0 : -1)));

  return {
    ok: score >= 6 && !reasons.includes("length_tier_under"),
    score,
    reasons: [...new Set(reasons)],
    fillerN,
    clicheN,
    hasEmotion,
    length,
  };
}
