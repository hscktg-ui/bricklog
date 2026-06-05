/**
 * HUMAN BELIEF ENGINE — 「사람이 썼네」 판정 SSOT (Ultimate V20)
 * 규칙 통과 ≠ 사람 글. 광고 smell vs 현장 smell.
 */

import {
  scoreExperienceVoice,
  buildExperienceVoicePromptBlock,
} from "@/lib/content/experienceVoiceProfile";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { buildHumanityCommonSensePromptBlock } from "@/lib/product/humanityCommonSenseEngine";
import { buildContentQualityPromptBlock } from "@/lib/product/contentQualityEngine";

export const HUMAN_BELIEF_VERSION = "v20";
/** 출고·재생성 기준 — 「사람이 썼네」 미달 시 보정·재시도 */
export const HUMAN_BELIEF_MIN_SCORE = 75;

export const HUMAN_BELIEF_SUCCESS =
  '"AI가 잘 썼네"(X) → "이 브랜드를 오래 본 사람이 썼네"(O)';

/** 광고·브로슈어 smell — 감점 */
export const AD_SMELL_RES = [
  /지금\s*바로/,
  /놓치지\s*마/,
  /최고의\s*선택/,
  /완벽한\s*솔루션/,
  /제품은\s*이렇습니다/,
  /다음과\s*같습니다/,
  /소개해\s*드립니다/,
  /알려드리/,
  /특별\s*할인\s*진행/,
  /많은\s*분들께\s*추천/,
  /믿고\s*찾/,
  /최고\s*품질/,
  /업계\s*1위/,
  /지금\s*문의/,
  /클릭/,
  /저장해\s*두/,
  /특별\s*혜택/,
  /프리미엄\s*(?:서비스|경험)/,
  /최적의\s*선택/,
  /믿을\s*수\s*있는/,
  /강력\s*추천/,
];

/** 현장·경험 smell — 「확인하세요」 템플릿은 제외 */
export const FIELD_SMELL_RES = [
  /직접\s*(?:가|방문|물어|체험|누워|앉아|확인|문의|미팅|보)/,
  /누워\s*보/,
  /(?:허리|어깨|목).{0,8}(?:아|불편|뻐)/,
  /왜.{0,32}(?:바꾸|고민|찾)/,
  /헷갈/,
  /고민/,
  /불편/,
  /아파/,
  /바꾸(?:려|고)/,
  /(?:3|4|5|6|7|8|9|10|11|12)월(?:까지)?/,
  /\d+분\s*이상/,
  /솔직(?:히)?(?:후기|하게)?/,
  /다녀(?:왔|온)/,
  /방문(?:했|후기)/,
  /내돈내산/,
  /메모(?:해|한)/,
  /그렇더라구요/,
  /다행이(?:에요|히)/,
  /미리\s*.+?(?:걸|할\s*걸)/,
  /고민(?:했|하)(?:는데|던데)/,
];

/** 매번 처음 소개 (승인본·과거 글 있을 때) */
export const REINTRO_BRAND_RES = [
  /처음\s*소개/,
  /(?:은|는)\s*어떤\s*브랜드/,
  /브랜드를\s*소개/,
  /서비스를\s*소개/,
  /^.{0,40}(?:은|는)\s*(?:대표|전문|선도)/m,
];

export function isHumanBeliefEnforced() {
  return isBriclogMissionEnforced();
}

export function buildHumanBeliefPromptBlock() {
  const voiceBlock = buildExperienceVoicePromptBlock();
  const commonSense = buildHumanityCommonSensePromptBlock();
  const contentQuality = buildContentQualityPromptBlock();
  return [
    `【HUMAN BELIEF · 최종 판정】
${HUMAN_BELIEF_SUCCESS}
독자가 "광고 같다"면 실패. "직접 경험한 사람" 또는 "오래 본 사람"이면 성공.
확인된 조사 팩트·승인본 톤을 본문에 박을 것. 일반론·CTA·브로슈어 문장 금지.`,
    contentQuality,
    commonSense,
    voiceBlock,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * @param {string} fullText
 * @param {object} ctx
 */
export function scoreHumanBelief(fullText, ctx = {}, pack = null) {
  if (!isHumanBeliefEnforced()) {
    return { ok: true, score: 10, adHits: 0, fieldHits: 0, issues: [] };
  }
  const text = String(fullText || "");
  const issues = [];
  let adHits = 0;
  let fieldHits = 0;

  for (const re of AD_SMELL_RES) {
    if (re.test(text)) adHits += 1;
  }
  for (const re of FIELD_SMELL_RES) {
    if (re.test(text)) fieldHits += 1;
  }

  const checklist = scoreChecklistVoice(text, pack || ctx.pack);
  const conversational = scoreExperienceVoice(text);
  let score = 70;
  score -= Math.min(35, adHits * 8);
  score += Math.min(22, fieldHits * 4);
  if (conversational.ok) score += Math.min(12, conversational.hits * 3);
  else if (conversational.hits === 0) score -= 10;
  if (!checklist.ok) {
    score -= Math.min(36, checklist.templateHits * 5 + Math.round(checklist.confirmRatio * 28));
    issues.push(...checklist.issues);
  }

  if (adHits >= 2) issues.push("ad_smell_high");
  if (fieldHits < 3) {
    issues.push("field_smell_low");
    score -= fieldHits === 0 ? 22 : 16;
  }
  if (/제품은\s*이렇습니다/.test(text)) issues.push("brochure_voice");

  const hasPast =
    Number(ctx.approvedContentCount || ctx.pastContentCount || 0) > 0 ||
    Boolean(String(ctx.brandApprovedContentBrief || ctx.styleAnchorBrief || "").trim());
  if (hasPast) {
    for (const re of REINTRO_BRAND_RES) {
      if (re.test(text.slice(0, 600))) {
        issues.push("brand_reintro");
        score -= 12;
        break;
      }
    }
  }

  score = Math.max(0, Math.min(100, score));
  const ok =
    score >= HUMAN_BELIEF_MIN_SCORE &&
    !issues.includes("brochure_voice") &&
    !issues.includes("ad_smell_high") &&
    !issues.includes("checklist_voice") &&
    !issues.includes("coverage_slot_dump");

  return { ok, score, adHits, fieldHits, issues };
}
