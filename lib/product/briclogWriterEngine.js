/**
 * Briclog Writer Engine — WRITE → EXPAND → SHAPE → JUDGE
 * GPT 원고를 human-tier(기본 2,000자)까지 끌어올리는 송출 전 SSOT
 */
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { expandPackToHumanTierViaLlm } from "@/lib/llm/llmHumanTierExpansion";
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

export const WRITER_ENGINE_VERSION = "briclog-writer-v1";

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
      judged: false,
      grade: assessDeliveryGrade(pack, input),
      engineVersion: WRITER_ENGINE_VERSION,
    };
  }

  const inbound = pack;
  let next = pack;
  let expanded = false;

  if (
    isOpenAIConfigured() &&
    isWriterEngineExpansionEnabled() &&
    !isHumanTierMet(next, input)
  ) {
    const llmExpanded = await expandPackToHumanTierViaLlm(next, ctx, input);
    if (
      countBlogBodyCharsWithSpaces(llmExpanded) >
      countBlogBodyCharsWithSpaces(next)
    ) {
      next = llmExpanded;
      expanded = true;
    }
  }

  next = polishLlmPackForDelivery(next, input);
  next = applyHumanVoiceDeliveryPass(next, input);

  if (!isHumanTierMet(next, input) && !expanded) {
    const tierExpanded = ensureMissionProseTierLength(next, { input });
    if (
      countBlogBodyCharsWithSpaces(tierExpanded) >
      countBlogBodyCharsWithSpaces(next)
    ) {
      next = tierExpanded;
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
        writerEngineTierMet: grade.tierMet,
        writerEngineHumanVoiceMet: contract.humanVoiceMet,
        humanColumnContract: contract,
        goldenGate,
      },
    },
    expanded,
    judged: true,
    grade,
    goldenGate,
    engineVersion: WRITER_ENGINE_VERSION,
  };
}
