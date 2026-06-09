/**
 * Briclog Writer Engine — WRITE → EXPAND → VOICE → SHAPE → JUDGE
 * GPT 원고를 human-tier(기본 2,000자) + 사람 칼럼 계약까지 끌어올리는 송출 전 SSOT
 */
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { expandPackToHumanTierViaLlm } from "@/lib/llm/llmHumanTierExpansion";
import { polishPackExperienceVoiceViaLlm } from "@/lib/llm/llmHumanVoicePolish";
import { polishLlmPackForDelivery } from "@/lib/golden/llmDeliveryPolish";
import { ensureMissionProseTierLength } from "@/lib/content/missionProseGate";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { isHumanTierMet } from "@/lib/product/humanTierRegen";
import {
  assessDeliveryGrade,
  stampDeliveryGradeMeta,
} from "@/lib/product/deliveryGrade";
import { guardPackAgainstShrink } from "@/lib/product/packShrinkGuard";
import { assessGoldenQualityGate } from "@/lib/golden/goldenQualityGate";
import { isWriterEngineExpansionEnabled } from "@/lib/config/briclogFastPipeline";
import { applyHumanVoiceDeliveryPass } from "@/lib/content/humanVoiceDeliveryPass";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract";
import { isLlmOriginatedPack } from "@/lib/product/contentQualityDelivery";
import { needsWriterEnginePass } from "@/lib/product/humanTierRegen";
import { createPromptContext } from "@/utils/promptBuilder";

export const WRITER_ENGINE_VERSION = "briclog-writer-v2";

/** LLM 원고 + mission/rescue fallback — GPT EXPAND/VOICE 대상 */
export function isWriterEngineEligiblePack(pack, hints = {}) {
  if (!pack?.sections?.length) return false;
  if (isLlmOriginatedPack(pack, hints)) return true;
  const meta = pack._meta || {};
  if (
    meta.missionProseFallback ||
    meta.missionProseTierRefill ||
    meta.deliveryRescue ||
    meta.draftFallback
  ) {
    return true;
  }
  const mode = String(
    meta.generationMode || hints?.mode || hints?.meta?.generationMode || ""
  );
  return (
    mode === "mission_prose_fallback" ||
    mode === "research_gate_stamped" ||
    mode === "research_gate_rescue" ||
    mode === "guaranteed_mission_delivery" ||
    mode.includes("fallback") ||
    mode.includes("rescue")
  );
}

export async function applyWriterEngineIfNeeded(pack, input = {}, hooks = {}) {
  if (
    !pack?.sections?.length ||
    !isWriterEngineExpansionEnabled() ||
    !needsWriterEnginePass(pack, input) ||
    !isWriterEngineEligiblePack(pack, input)
  ) {
    return pack;
  }
  hooks.setPipelineStep?.("편집본 분량 맞추는 중…");
  const ctx = createPromptContext(input);
  const engine = await runBriclogWriterEngine(pack, ctx, input);
  return engine?.pack?.sections?.length ? engine.pack : pack;
}

function stampMissionProseFallback(pack) {
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      missionProseFallback: true,
      deliveryRescue: true,
      missionProseTierRefill: true,
    },
  };
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {object} [input]
 */
export async function runBriclogWriterEngine(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length) {
    return {
      pack,
      expanded: false,
      voicePolished: false,
      judged: false,
      grade: assessDeliveryGrade(pack, input),
      engineVersion: WRITER_ENGINE_VERSION,
    };
  }

  const inbound = pack;
  let next = pack;
  let expanded = false;
  let voicePolished = false;
  let llmPassAttempted = false;

  const canRunLlm =
    isOpenAIConfigured() && isWriterEngineExpansionEnabled();

  if (canRunLlm) {
    let contract = assessHumanColumnContract(next, input);

    if (!isHumanTierMet(next, input)) {
      llmPassAttempted = true;
      const llmExpanded = await expandPackToHumanTierViaLlm(
        next,
        ctx,
        input,
        contract
      );
      if (
        countBlogBodyCharsWithSpaces(llmExpanded) >
        countBlogBodyCharsWithSpaces(next)
      ) {
        next = llmExpanded;
        expanded = true;
      }
      contract = assessHumanColumnContract(next, input);
    }

    if (contract.tierMet && !contract.humanVoiceMet) {
      llmPassAttempted = true;
      const voiced = await polishPackExperienceVoiceViaLlm(
        next,
        ctx,
        input,
        contract
      );
      if (
        countBlogBodyCharsWithSpaces(voiced) >=
          countBlogBodyCharsWithSpaces(next) * 0.92 &&
        voiced !== next
      ) {
        next = voiced;
        voicePolished = true;
      }
    }
  }

  next = polishLlmPackForDelivery(next, input);
  next = applyHumanVoiceDeliveryPass(next, input);

  const postShapeContract = assessHumanColumnContract(next, input);
  if (
    canRunLlm &&
    postShapeContract.tierMet &&
    !postShapeContract.humanVoiceMet &&
    !voicePolished
  ) {
    llmPassAttempted = true;
    const voiced = await polishPackExperienceVoiceViaLlm(
      next,
      ctx,
      input,
      postShapeContract
    );
    if (
      countBlogBodyCharsWithSpaces(voiced) >=
        countBlogBodyCharsWithSpaces(next) * 0.92 &&
      voiced !== next
    ) {
      next = voiced;
      voicePolished = true;
      next = applyHumanVoiceDeliveryPass(next, input);
    }
  }

  if (!isHumanTierMet(next, input) && (!llmPassAttempted || !expanded)) {
    const beforeMission = countBlogBodyCharsWithSpaces(next);
    const tierExpanded = ensureMissionProseTierLength(next, { input });
    const afterMission = countBlogBodyCharsWithSpaces(tierExpanded);
    if (afterMission > beforeMission) {
      next = stampMissionProseFallback(tierExpanded);
    }
  }

  next = guardPackAgainstShrink(inbound, next, { stage: "briclogWriterEngine" });
  next = stampDeliveryGradeMeta(next, input);

  const grade = assessDeliveryGrade(next, input);
  const contract = assessHumanColumnContract(next, input);
  const goldenGate = assessGoldenQualityGate(next, input);

  return {
    pack: {
      ...next,
      _meta: {
        ...(next._meta || {}),
        briclogWriterEngine: true,
        writerEngineVersion: WRITER_ENGINE_VERSION,
        writerEngineExpanded: expanded,
        writerEngineVoicePolished: voicePolished,
        writerEngineLlmAttempted: llmPassAttempted,
        writerEngineTierMet: grade.tierMet,
        writerEngineHumanVoiceMet: contract.humanVoiceMet,
        humanColumnContract: contract,
        goldenGate,
      },
    },
    expanded,
    voicePolished,
    judged: true,
    grade,
    goldenGate,
    engineVersion: WRITER_ENGINE_VERSION,
  };
}
