/**
 * 조사결과 검증 시스템 — 생성 전 메트릭 게이트 회귀
 */
import assert from "node:assert/strict";
import {
  computePreGenerationMetrics,
  assertResearchVerificationGate,
  RESEARCH_VERIFY_VERSION,
} from "@/lib/evolution/researchVerificationGate.js";
import { PIPELINE_ORDER_STRICT } from "@/lib/product/briclogPriority.js";
import { assertPreWriteVerified } from "@/lib/content/v2PipelineGate.js";

process.env.BRICLOG_MISSION = "true";

assert.equal(RESEARCH_VERIFY_VERSION, "v1");
assert.deepEqual(PIPELINE_ORDER_STRICT, [
  "research",
  "research_verify",
  "generate",
  "audit",
  "output",
]);

const thin = {
  brandName: "테스트브랜드",
  region: "서울",
  topic: "수제간식 소개",
  v2PipelineEnforced: true,
  researchFacts: [{ fact: "간단 소개", source: "r" }],
};

const thinGate = assertResearchVerificationGate(thin);
assert.equal(thinGate.ok, false);
assert.ok(thinGate.reasons.includes("insufficient_info_count"));

const rich = {
  brandName: "더건강하개",
  region: "용인",
  topic: "수제간식업체 소개",
  v2PipelineEnforced: true,
  knowledgeExpansionReady: true,
  researchFacts: [
    { fact: "수제간식이란 무엇인지 정의와 종류", source: "r" },
    { fact: "왜 찾는지 필요와 고민 상황", source: "r" },
    { fact: "특징 구성 성분 스펙", source: "r" },
    { fact: "차이 비교 대비 포인트", source: "r" },
    { fact: "대상 고객 추천 누구에게", source: "r" },
    { fact: "확인 주의 문의 선택 기준", source: "r" },
  ],
  informationUnits: { unitCount: 8 },
  knowledgeCoverage: {
    coverageCount: 6,
    areas: [{ id: "a1" }, { id: "a2" }, { id: "a3" }],
  },
};

const metrics = computePreGenerationMetrics(rich);
assert.ok(metrics.infoCount >= 5);
assert.ok(metrics.entityCount >= 3);
assert.ok(metrics.topicExplanationRate >= 4 / 6);
assert.ok(metrics.repetitionRate <= 0.28);

const richGate = assertResearchVerificationGate(rich);
assert.equal(richGate.ok, true, richGate.reasons.join(", "));

const pre = assertPreWriteVerified({
  ...rich,
  v2PreWriteVerified: true,
  v2ResearchReady: true,
});
assert.ok(pre.ok || pre.skipped, JSON.stringify(pre));

console.log("OK research verification gate");
console.log("thin reasons:", thinGate.reasons.join(", "));
console.log("rich metrics:", JSON.stringify(metrics, null, 2));
