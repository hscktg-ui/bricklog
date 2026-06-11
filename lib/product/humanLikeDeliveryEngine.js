/**
 * Human-Like Delivery SSOT — 진짜 사람이 쓴 칼럼 (GPT raw 보존 금지)
 * experience · belief · checklist · AI pattern · narrative arc
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  assessHumanColumnContract,
  humanColumnContractLabelKo,
} from "@/lib/product/humanColumnContract";
import { applyHumanGradeFinishingPass } from "@/lib/content/editorQualityEngine";
import { applyHumanVoiceDeliveryPass } from "@/lib/content/humanVoiceDeliveryPass";
import { applyNarrativeArcShape } from "@/lib/product/narrativeArcShapeEngine";
import { applyProfessionalEditorDeliveryPass } from "@/lib/content/editorQualityEngine";
import { applyMasterRebuildPostWritePass } from "@/lib/product/briclogMasterRebuildPipeline";
import { applyGpt55PrePublishChecks } from "@/lib/product/gpt55LightDelivery";
import { stripGlobalExactDuplicateSentences } from "@/lib/content/duplicateKillerEngine";
import { detectAiWritingPatterns } from "@/lib/product/aiPatternDetector";
import { scoreChecklistVoice } from "@/lib/product/checklistVoiceEngine";

export const HUMAN_LIKE_DELIVERY_VERSION = "human-like-v1";

export function isHumanLikeDeliveryEnabled() {
  if (process.env.BRICLOG_HUMAN_LIKE_DELIVERY === "false") return false;
  return isBriclogMissionEnforced();
}

/** @param {object} pack @param {object} [input] */
export function assessHumanLikeDelivery(pack, input = {}) {
  if (!pack?.sections?.length) {
    return {
      ok: false,
      humanVoiceMet: false,
      reasons: ["empty_pack"],
      version: HUMAN_LIKE_DELIVERY_VERSION,
    };
  }
  const contract = assessHumanColumnContract(pack, input);
  const full = getBlogFullText(pack);
  const ai = detectAiWritingPatterns(pack, input);
  const checklist = scoreChecklistVoice(full, pack);

  const reasons = [...(contract.reasons || [])];
  if (!ai.ok) reasons.push("ai_pattern_detected");
  if (!checklist.ok) reasons.push(...(checklist.issues || []).slice(0, 4));

  const humanVoiceMet =
    contract.humanVoiceMet && ai.ok && checklist.ok;

  return {
    ok: contract.tierMet && humanVoiceMet,
    humanVoiceMet,
    tierMet: contract.tierMet,
    contract,
    ai,
    checklist,
    reasons: [...new Set(reasons)],
    labelKo: humanColumnContractLabelKo(contract),
    version: HUMAN_LIKE_DELIVERY_VERSION,
  };
}

export function needsHumanLikePass(pack, input = {}) {
  if (!pack?.sections?.length || !isHumanLikeDeliveryEnabled()) return false;
  if (pack._meta?.humanLikeDeliveryPass) {
    return !assessHumanLikeDelivery(pack, input).humanVoiceMet;
  }
  const assessed = assessHumanLikeDelivery(pack, input);
  return !assessed.humanVoiceMet;
}

/**
 * GPT55 light 우회 — 사람 칼럼 풀 패스 (재작성 없이 로컬 에디터·서사·말투)
 */
export function applyHumanLikeDeliveryPass(pack, input = {}, ctx = {}) {
  if (!pack?.sections?.length || !isHumanLikeDeliveryEnabled()) return pack;

  const before = assessHumanLikeDelivery(pack, input);
  if (before.humanVoiceMet && pack._meta?.humanLikeDeliveryPass) return pack;

  let next = applyMasterRebuildPostWritePass(pack, input, { force: true });
  next = applyGpt55PrePublishChecks(next, input);

  const mergedCtx = { ...ctx, input, forceFull: true, humanLikeRequired: true };
  next = applyHumanGradeFinishingPass(next, input, mergedCtx);
  next = applyProfessionalEditorDeliveryPass(next, mergedCtx, input);
  next = applyNarrativeArcShape(next, input, { force: true });
  next = applyHumanVoiceDeliveryPass(next, input, { force: true });
  next = stripGlobalExactDuplicateSentences(next);

  const after = assessHumanLikeDelivery(next, input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      humanLikeDeliveryPass: true,
      humanLikeDeliveryVersion: HUMAN_LIKE_DELIVERY_VERSION,
      humanLikeBefore: {
        humanVoiceMet: before.humanVoiceMet,
        reasons: before.reasons.slice(0, 8),
      },
      humanLikeAfter: {
        humanVoiceMet: after.humanVoiceMet,
        ok: after.ok,
        reasons: after.reasons.slice(0, 8),
      },
      humanColumnOk: after.ok,
      humanVoiceMet: after.humanVoiceMet,
    },
  };
}
