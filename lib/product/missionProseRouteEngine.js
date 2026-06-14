/**
 * Mission Prose Route — 꽃 추천·다이닝체어 등 품질 SSOT 주제는 LLM·웹 스니펫 우회
 */
import { enrichMinimalBlogInput } from "@/lib/llm/blogDeliveryFallback";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack";
import { gateOrchestratorBlogPack } from "@/lib/llm/orchestratorDeliveryGate";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { evaluateReviseAndGateOutput } from "@/lib/product/briclogEvaluateFirstPipeline";
import { finalizeContentQualityForDelivery } from "@/lib/product/contentQualityDelivery";
import { hasFilledBlogAxes } from "@/lib/product/deliverySoftPass";
import {
  shouldForceMissionProseOnlyPath,
  allowsMissionProseDespiteThinResearch,
} from "@/lib/product/missionProseRouteFlags";
import { isResearchHeavyTopicInput } from "@/lib/content/topicFacetEngine";
import { applyResearchHeavyDeliveryPass } from "@/lib/content/researchHeavyDeliveryEngine";

export const MISSION_PROSE_ROUTE_VERSION = "mission-route-v1";

export { shouldForceMissionProseOnlyPath, allowsMissionProseDespiteThinResearch };

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
    const ev = evaluateReviseAndGateOutput(pack, enriched, { forcedMissionProseRoute: true });
    pack = ev.pack;
    if (isResearchHeavyTopicInput(enriched)) {
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

  return pack;
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

  const finalized = finalizeContentQualityForDelivery(pack, input, "blog");
  return gateOrchestratorBlogPack(input, finalized, {
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
