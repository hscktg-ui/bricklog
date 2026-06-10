/**
 * Briclog Writer Engine — WRITE → REWRITE/EXPAND → VOICE → SHAPE → JUDGE
 * GPT 원고·mission fallback을 human-tier + 사람 칼럼 계약까지 끌어올리는 송출 전 SSOT
 */
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import {
  expandPackToHumanTierViaLlm,
  rewriteFallbackPackToHumanColumnViaLlm,
} from "@/lib/llm/llmHumanTierExpansion";
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
import {
  applyHumanGradeFinishingPass,
  applyProfessionalEditorDeliveryPass,
} from "@/lib/content/editorQualityEngine";
import { assessHumanColumnContract } from "@/lib/product/humanColumnContract";
import {
  applyNarrativeArcShape,
  scoreNarrativeCoherence,
} from "@/lib/product/narrativeArcShapeEngine";
import { isLlmOriginatedPack } from "@/lib/product/contentQualityDelivery";
import { needsWriterEnginePass } from "@/lib/product/humanTierRegen";
import { createPromptContext } from "@/utils/promptBuilder";

export const WRITER_ENGINE_VERSION = "briclog-writer-v3";

const DENSITY_FAIL_REASONS = new Set([
  "topic_dominance_low",
  "information_yield_low",
  "duplicate_killer_fail",
  "duplicate_content",
  "editor_verbatim_topic_dump",
  "narrative_arc_weak",
  "topic_thread_weak",
  "mission_pad_jumble",
  "industry_contamination",
  "content_gate_industry_forbidden",
  "search_snippet_leak",
]);

function needsNarrativeRewrite(pack, input = {}) {
  const narrative = scoreNarrativeCoherence(pack, input);
  return !narrative.ok || (narrative.score || 0) < 78;
}

function shouldRunDensityRewrite(contract, pack, input = {}, fallbackPack = false) {
  if (needsDensityRewrite(contract)) return true;
  if (needsNarrativeRewrite(pack, input)) return true;
  if (fallbackPack && !contract?.humanVoiceMet) return true;
  return false;
}

export function isMissionFallbackPack(pack, hints = {}) {
  const meta = pack?._meta || {};
  const mode = String(
    meta.generationMode || hints?.mode || hints?.meta?.generationMode || ""
  );
  return (
    Boolean(meta.missionProseFallback || meta.deliveryRescue || meta.draftFallback) ||
    mode === "mission_prose_fallback" ||
    mode === "research_gate_stamped" ||
    mode === "research_gate_rescue" ||
    mode === "guaranteed_mission_delivery"
  );
}

function needsDensityRewrite(contract) {
  return (contract?.reasons || []).some((r) => DENSITY_FAIL_REASONS.has(r));
}

/** LLM 원고 + mission/rescue fallback — GPT EXPAND/REWRITE/VOICE 대상 */
export function isWriterEngineEligiblePack(pack, hints = {}) {
  if (!pack?.sections?.length) return false;
  if (isLlmOriginatedPack(pack, hints)) return true;
  if (isMissionFallbackPack(pack, hints)) return true;
  return countBlogBodyCharsWithSpaces(pack) >= 80;
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
      rewritten: false,
      voicePolished: false,
      judged: false,
      grade: assessDeliveryGrade(pack, input),
      engineVersion: WRITER_ENGINE_VERSION,
    };
  }

  const inbound = pack;
  let next = pack;
  let expanded = false;
  let rewritten = false;
  let voicePolished = false;
  let llmPassAttempted = false;
  const fallbackPack = isMissionFallbackPack(next, input);

  if (fallbackPack) {
    next = applyNarrativeArcShape(next, input, { force: true });
  }

  const canRunLlm =
    isOpenAIConfigured() && isWriterEngineExpansionEnabled();

  if (canRunLlm) {
    let contract = assessHumanColumnContract(next, input);

    if (fallbackPack || !isHumanTierMet(next, input)) {
      llmPassAttempted = true;
      const before = countBlogBodyCharsWithSpaces(next);
      let llmOut = fallbackPack
        ? await rewriteFallbackPackToHumanColumnViaLlm(next, ctx, input, contract)
        : await expandPackToHumanTierViaLlm(next, ctx, input, contract);
      if (
        fallbackPack &&
        !llmOut._meta?.llmHumanColumnRewrite &&
        countBlogBodyCharsWithSpaces(llmOut) <= before
      ) {
        llmOut = await expandPackToHumanTierViaLlm(next, ctx, input, contract);
      }
      const after = countBlogBodyCharsWithSpaces(llmOut);
      if (after > before || llmOut._meta?.llmHumanColumnRewrite) {
        next = llmOut;
        if (fallbackPack || llmOut._meta?.llmHumanColumnRewrite) rewritten = true;
        else expanded = true;
      }
      contract = assessHumanColumnContract(next, input);
    }

    if (
      (contract.tierMet || fallbackPack) &&
      shouldRunDensityRewrite(contract, next, input, fallbackPack)
    ) {
      llmPassAttempted = true;
      const redraft = await rewriteFallbackPackToHumanColumnViaLlm(
        next,
        ctx,
        input,
        contract
      );
      if (
        countBlogBodyCharsWithSpaces(redraft) >=
          countBlogBodyCharsWithSpaces(next) * 0.88 ||
        redraft._meta?.llmHumanColumnRewrite
      ) {
        next = redraft;
        rewritten = true;
        contract = assessHumanColumnContract(next, input);
      }
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

  let postShapeContract = assessHumanColumnContract(next, input);
  if (
    canRunLlm &&
    (postShapeContract.tierMet || fallbackPack) &&
    needsNarrativeRewrite(next, input) &&
    !rewritten
  ) {
    llmPassAttempted = true;
    const arcContract = {
      ...postShapeContract,
      reasons: [
        ...(postShapeContract.reasons || []),
        "narrative_arc_weak",
      ],
    };
    const arcDraft = await rewriteFallbackPackToHumanColumnViaLlm(
      next,
      ctx,
      input,
      arcContract
    );
    if (
      countBlogBodyCharsWithSpaces(arcDraft) >=
        countBlogBodyCharsWithSpaces(next) * 0.88 ||
      arcDraft._meta?.llmHumanColumnRewrite
    ) {
      next = polishLlmPackForDelivery(arcDraft, input);
      next = applyHumanVoiceDeliveryPass(next, input, { force: true });
      rewritten = true;
      postShapeContract = assessHumanColumnContract(next, input);
    }
  }

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
      next = applyHumanVoiceDeliveryPass(next, input, { force: true });
    }
  }

  if (
    !isHumanTierMet(next, input) &&
    !expanded &&
    !rewritten &&
    (!llmPassAttempted || !canRunLlm)
  ) {
    const beforeMission = countBlogBodyCharsWithSpaces(next);
    const tierExpanded = ensureMissionProseTierLength(next, { input });
    const afterMission = countBlogBodyCharsWithSpaces(tierExpanded);
    if (afterMission > beforeMission) {
      next = stampMissionProseFallback(tierExpanded);
    }
  }

  next = applyHumanGradeFinishingPass(next, input, { input });
  next = applyHumanVoiceDeliveryPass(next, input, { force: true });
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
        writerEngineRewritten: rewritten,
        writerEngineVoicePolished: voicePolished,
        writerEngineLlmAttempted: llmPassAttempted,
        writerEngineTierMet: grade.tierMet,
        writerEngineHumanVoiceMet: contract.humanVoiceMet,
        writerEngineNarrativeCoherence: scoreNarrativeCoherence(next, input),
        humanColumnContract: contract,
        goldenGate,
      },
    },
    expanded,
    rewritten,
    voicePolished,
    judged: true,
    grade,
    goldenGate,
    engineVersion: WRITER_ENGINE_VERSION,
  };
}
