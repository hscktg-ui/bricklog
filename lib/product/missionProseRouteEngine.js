/**
 * Mission Prose Route — 꽃·체어·조사·스펙 SSOT 주제만 LLM 우회
 */
import { enrichMinimalBlogInput } from "@/lib/llm/blogDeliveryFallback";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack";
import { gateOrchestratorBlogPack } from "@/lib/llm/orchestratorDeliveryGate";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { evaluateReviseAndGateOutput } from "@/lib/product/briclogEvaluateFirstPipeline";
import {
  assessContentEvaluation,
  stampContentEvaluation,
} from "@/lib/product/contentEvaluationEngine";
import {
  attachContentQualityToApiMeta,
  finalizeContentQualityForDelivery,
} from "@/lib/product/contentQualityDelivery";
import { finishCustomerRescueBlogPack } from "@/lib/product/localBatchFinish";
import { requiresV2ResearchGate } from "@/lib/content/v2PipelineGate";
import { hasFilledBlogAxes } from "@/lib/product/deliverySoftPass";
import {
  shouldForceMissionProseOnlyPath,
  allowsMissionProseDespiteThinResearch,
  shouldResearchHeavyMissionRescue,
  shouldOrchestratorMissionRescue,
} from "@/lib/product/missionProseRouteFlags";
import { isResearchHeavyTopicInput } from "@/lib/content/topicFacetEngine";
import { applyResearchHeavyDeliveryPass } from "@/lib/content/researchHeavyDeliveryEngine";
import { isFlowerRecommendationTopic } from "@/lib/product/flowerRecommendationProseEngine";

export const MISSION_PROSE_ROUTE_VERSION = "mission-route-v2";

export {
  shouldForceMissionProseOnlyPath,
  allowsMissionProseDespiteThinResearch,
  shouldResearchHeavyMissionRescue,
};

export function buildForcedMissionProsePack(input = {}) {
  const enriched = enrichMinimalBlogInput(input);
  let pack = buildMissionProseFallbackPack(enriched);
  pack = ensureBlogDisplayPack(
    {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        missionProseFallback: true,
        forcedMissionProseRoute: true,
        generationMode: "forced_mission_prose",
      },
    },
    enriched
  );

  if (isBriclogResetQualityEnforced() && pack?.sections?.length) {
    if (isFlowerRecommendationTopic(enriched) || pack._meta?.flowerRecommendationEditorial) {
      const evaluation = assessContentEvaluation(pack, enriched);
      pack = stampContentEvaluation(pack, enriched);
      pack = {
        ...pack,
        _meta: {
          ...pack._meta,
          outputWithheld: !evaluation.pass,
          resetQualityWithheld: !evaluation.pass,
          contentEvaluation: evaluation,
          passOutput: evaluation.pass,
        },
      };
    } else {
      const ev = evaluateReviseAndGateOutput(pack, enriched, { forcedMissionProseRoute: true });
      pack = ev.pack;
      if (isResearchHeavyTopicInput(enriched) && !isFlowerRecommendationTopic(enriched)) {
        pack = applyResearchHeavyDeliveryPass(pack, enriched);
      }
      if (!ev.outputAllowed) {
        pack = {
          ...pack,
          _meta: {
            ...(pack._meta || {}),
            outputWithheld: true,
            contentEvaluation: ev.evaluation,
          },
        };
      } else {
        pack = {
          ...pack,
          _meta: {
            ...(pack._meta || {}),
            outputWithheld: false,
            resetQualityWithheld: false,
            contentEvaluation: ev.evaluation,
            passOutput: true,
          },
        };
      }
    }
  }

  return pack;
}

/**
 * 조사·스펙형 주제 — GPT-5.6 우선이어도 research-grounded mission 송출
 * @returns {object|null}
 */
export function tryDeliverResearchHeavyMissionRescue(input = {}) {
  if (!shouldOrchestratorMissionRescue(input)) return null;
  if (shouldForceMissionProseOnlyPath(input)) return null;

  const enriched = enrichMinimalBlogInput(input);
  const pack = buildForcedMissionProsePack(input);
  if (!pack?.sections?.length) return null;

  if (pack._meta?.outputWithheld) {
    return gateOrchestratorBlogPack(input, null, {
      mode: "research_heavy_withheld",
      withheld: true,
      userMessage:
        pack._meta?.contentEvaluation?.userMessage ||
        "아직 발행 가능한 원고 기준에 닿지 않았어요. 입력을 조금 구체적으로 한 뒤 다시 시도해 주세요.",
      meta: {
        generationMode: "research_heavy_withheld",
        researchHeavyRescue: true,
        contentEvaluation: pack._meta?.contentEvaluation,
      },
    });
  }

  const finalized = finalizeContentQualityForDelivery(pack, enriched, "blog");
  if (!finalized?.sections?.length || finalized._meta?.outputWithheld) {
    return null;
  }

  if (requiresV2ResearchGate(input)) {
    return gateOrchestratorBlogPack(input, finalized, {
      mode: "research_heavy_rescue",
      llmAvailable: false,
      meta: {
        generationMode: "research_heavy_rescue",
        researchHeavyRescue: true,
        missionProseFallback: true,
        forcedMissionProseRoute: true,
        passOutput: !finalized._meta?.softPass,
        softPass: finalized._meta?.softPass === true,
      },
    });
  }

  const displayed = ensureBlogDisplayPack(
    {
      ...finalized,
      _meta: {
        ...finalized._meta,
        researchHeavyRescue: true,
        deliveryRescue: true,
        passOutput: !finalized._meta?.softPass,
      },
    },
    enriched
  );
  return {
    ok: true,
    blogContent: displayed,
    withheld: false,
    softPass: finalized._meta?.softPass === true,
    userMessage: null,
    mode: "research_heavy_rescue",
    meta: attachContentQualityToApiMeta(
      {
        generationMode: "research_heavy_rescue",
        researchHeavyRescue: true,
        passOutput: !finalized._meta?.softPass,
        softPass: finalized._meta?.softPass === true,
      },
      displayed
    ),
  };
}

/**
 * LLM 루프 진입 전 mission prose 단독 송출
 * @returns {object|null}
 */
export function tryDeliverForcedMissionProsePack(input = {}) {
  if (!shouldForceMissionProseOnlyPath(input)) return null;
  if (!hasFilledBlogAxes(input)) return null;

  const pack = buildForcedMissionProsePack(input);
  if (!pack?.sections?.length) return null;

  if (pack._meta?.outputWithheld) {
    return gateOrchestratorBlogPack(input, null, {
      mode: "forced_mission_withheld",
      withheld: true,
      userMessage:
        pack._meta?.contentEvaluation?.userMessage ||
        "아직 발행 가능한 원고 기준에 닿지 않았어요. 입력을 조금 구체적으로 한 뒤 다시 시도해 주세요.",
      meta: {
        generationMode: "forced_mission_withheld",
        forcedMissionProseRoute: true,
        contentEvaluation: pack._meta?.contentEvaluation,
      },
    });
  }

  const finalized = finalizeContentQualityForDelivery(
    {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        missionProseFallback: true,
      },
    },
    input,
    "blog"
  );
  const aligned = finishCustomerRescueBlogPack(finalized, input);
  return gateOrchestratorBlogPack(input, aligned, {
    mode: "forced_mission_prose",
    llmAvailable: true,
    meta: {
      generationMode: "forced_mission_prose",
      forcedMissionProseRoute: true,
      missionProseFallback: true,
      passOutput: true,
      softPass: false,
    },
  });
}
