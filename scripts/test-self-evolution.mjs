/**
 * SELF EVOLUTION CORE v1.0 회귀
 */
import assert from "node:assert/strict";
import {
  detectGenerationFailure,
  assessCopySuccess,
  isFailureAction,
  SELF_EVOLUTION_VERSION,
} from "@/lib/evolution/selfEvolutionCore.js";
import { analyzeHumanCorrection } from "@/lib/evolution/humanCorrectionEngine.js";
import { assessTopicCoverage } from "@/lib/evolution/topicCoverageEngine.js";
import { assessResearchDepth } from "@/lib/evolution/researchDepthEngine.js";
import { applyCoreContentEngineGate } from "@/lib/product/coreContentEngine.js";
import { buildMissionProseFallbackPack } from "@/lib/llm/missionProseFallback.js";

process.env.BRICLOG_MISSION = "true";

assert.equal(SELF_EVOLUTION_VERSION, "v1.0");
assert.ok(isFailureAction("rewrite"));
assert.ok(isFailureAction("human_edit"));

const copyOk = assessCopySuccess([
  { event_type: "copy_all" },
  { event_type: "save" },
]);
assert.ok(copyOk.success);
assert.ok(copyOk.publishSignal);

const correction = analyzeHumanCorrection(
  "압도적 최고의 선택 지금 바로 방문하세요",
  "성분·보관 방법을 확인하고 문의해 주세요"
);
assert.ok(correction.changed);
assert.ok(correction.preferences.informational >= 75);

const input = {
  brandName: "더건강하개",
  region: "용인",
  topic: "수제간식업체 소개",
  researchFacts: [
    { fact: "수제간식 특징과 성분", source: "r" },
    { fact: "보관 방법과 선택 기준", source: "r" },
    { fact: "대상 고객과 차이점", source: "r" },
    { fact: "주의사항과 문의", source: "r" },
    { fact: "브랜드 소개", source: "r" },
  ],
  knowledgeExpansionReady: true,
};

const depth = assessResearchDepth(input);
assert.ok(depth.ok);

let pack = buildMissionProseFallbackPack(input);
pack = applyCoreContentEngineGate(pack, input, { input });

const topic = assessTopicCoverage(pack, input);
assert.ok(topic.count >= 3, `topic coverage ${topic.count}`);

const failure = detectGenerationFailure({
  eventType: "rewrite",
  feedback: { reaction: "bad", tags: ["too_ad", "repeat"] },
  pack,
  input,
  events: [{ event_type: "rewrite" }],
});
assert.ok(failure.isFailure);
assert.ok(failure.reasons.length > 0);

console.log("OK self evolution core");
console.log("topic coverage:", topic.count, "/", topic.total);
console.log("failure reasons:", failure.reasons.map((r) => r.id).join(", "));
