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
assert.ok(PIPELINE_ORDER_STRICT.includes("topic_map"));
assert.ok(PIPELINE_ORDER_STRICT.includes("info_securement_rate"));
assert.ok(PIPELINE_ORDER_STRICT.indexOf("generate") > PIPELINE_ORDER_STRICT.indexOf("topic_explanation_rate"));

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
  industry: "반려동물",
  v2PipelineEnforced: true,
  knowledgeExpansionReady: true,
  researchFacts: [
    { axis: "brand", fact: "더건강하개 용인점 수제간식 라인업 공개", source: "naver" },
    { axis: "brand", fact: "더건강하개 반려동물 수제간식 제조 방식", source: "official" },
    { axis: "brand", fact: "더건강하개 운영 시간 및 문의 채널", source: "official" },
    { axis: "brand", fact: "더건강하개 주요 원료·성분 표기 기준", source: "research" },
    { axis: "brand", fact: "더건강하개 신규 고객 추천 메뉴", source: "naver" },
    { fact: "수제간식 선택 시 확인할 주의 포인트", source: "research" },
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
