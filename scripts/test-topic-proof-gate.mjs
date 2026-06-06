/**
 * ENGINE PRIORITY OVERRIDE — 주제맵·정보확보율·주제설명률·브랜드고유성 회귀
 */
import assert from "node:assert/strict";
import { PUBLIC_TEST_SAMPLES } from "@/lib/publicTest/publicTestSamples.js";
import { buildTopicMap } from "@/lib/product/topicMapEngine.js";
import {
  assertTopicProofPreWrite,
  assertTopicProofPostWrite,
  TOPIC_PROOF_PIPELINE_ORDER,
} from "@/lib/product/topicProofGate.js";
import { assessBrandUniqueness } from "@/lib/product/brandUniquenessGate.js";
import { assertPreWriteVerified } from "@/lib/content/v2PipelineGate.js";
import { PIPELINE_ORDER_STRICT } from "@/lib/product/briclogPriority.js";

process.env.BRICLOG_MISSION = "true";

const sample = PUBLIC_TEST_SAMPLES[0];
assert.ok(sample?.brandName, "public test sample required");

const topicMap = buildTopicMap(sample);
assert.ok(topicMap.requiredExplanationItems?.length >= 7);
assert.equal(topicMap.brand, sample.brandName);
assert.ok(topicMap.topic.includes("브런치") || topicMap.topic.length > 2);

const thin = {
  ...sample,
  v2PipelineEnforced: true,
  researchFacts: [{ fact: "간단 소개", source: "r" }],
};
const thinProof = assertTopicProofPreWrite(thin);
assert.equal(thinProof.ok, false);
assert.ok(thinProof.reasons.length >= 1);

const preThin = assertPreWriteVerified(thin);
assert.equal(preThin.ok, false);
assert.equal(preThin.stage, "topic_proof");

const richFacts = [
  `${sample.topic}이란 무엇인지 정의와 개요`,
  "왜 필요한지 이유와 효과",
  "누구에게 추천하는지 대상 고객",
  `${sample.brandName}은 무엇을 제공하는지 운영 방식`,
  "어떤 방식으로 진행하는지 절차와 예약",
  "차별점과 특징 비교 포인트",
  "어떤 효과와 가치가 있는지",
  `${sample.region} 지역 맥락과 방문`,
  "문의·방문 전 확인사항",
  "다음 행동 문의 예약 안내",
];
const rich = {
  ...sample,
  industry: sample.industry || "카페",
  v2PipelineEnforced: true,
  knowledgeExpansionReady: true,
  researchFacts: richFacts.map((fact) => ({ fact, source: "r" })),
  informationUnits: { unitCount: 10, units: richFacts.map((f, i) => ({ id: `u${i}`, text: f })) },
  knowledgeCoverage: {
    coverageCount: 8,
    areas: richFacts.slice(0, 8).map((_, i) => ({ id: `a${i}` })),
  },
};

const richProof = assertTopicProofPreWrite({ ...rich, topicMap });
assert.equal(richProof.ok, true, richProof.reasons.join(", "));

const genericPack = {
  title: `${sample.topic} 안내`,
  sections: [
    {
      heading: "소개",
      body: `${sample.topic}은 많은 분들이 찾는 주제입니다. 왜 필요한지 알아보겠습니다. 누구에게 추천하는지도 함께 살펴봅니다.`,
    },
    {
      heading: "정리",
      body: "효과와 가치를 확인하고 문의해 보세요.",
    },
  ],
};
const genericBrand = assessBrandUniqueness(genericPack, rich);
assert.equal(genericBrand.ok, false);

const brandedBodies = [
  `${sample.brandName}는 ${sample.region}에서 ${sample.topic}을 중심으로 운영하는 공간입니다. 첫 방문 고객도 메뉴 구성을 한눈에 이해할 수 있게 안내합니다.`,
  `많은 분들이 ${sample.topic}을 찾는 이유는 계절 메뉴와 편안한 좌석 때문입니다. ${sample.brandName}는 예약 없이도 대기 시간을 줄이도록 시간대별 좌석을 나눕니다.`,
  `추천 대상은 가족 단위 브런치, 소규모 모임, 지역 직장인 점심 모임입니다. ${sample.brandName}는 인원 수에 맞춘 테이블 배치를 안내합니다.`,
  `운영 방식은 당일 재료 입고 확인 후 메뉴 보드를 갱신하고, 주문은 카운터와 테이블 QR 두 경로로 받습니다.`,
  `진행 절차는 예약 확인 → 좌석 안내 → 메뉴 설명 → 주문 → 픽업 알림 순서입니다. ${sample.brandName} 직원이 첫 방문 고객에게 흐름을 먼저 설명합니다.`,
  `차별점은 지역 농가 재료 비율을 메뉴판에 표기하고, 같은 재료라도 조리법을 주 2회 교체한다는 점입니다.`,
  `기대 효과는 방문 전 메뉴 선택 부담을 줄이고, 재방문 시 시즌 한정 메뉴를 빠르게 비교할 수 있다는 점입니다.`,
  `${sample.region} 인근 거주자에게는 주말 오전 대기 없이 브런치를 즐길 수 있는 동선이 장점입니다. 주차·대중교통 안내도 매장 앞에 별도 표기합니다.`,
  `방문 전 확인사항: 알레르기 재료, 단체 예약 인원, 반려동물 동반 여부를 전화나 메시지로 미리 알려 주세요.`,
  `문의는 영업시간 내 전화가 가장 빠르며, 단체 예약은 최소 하루 전 접수를 권장합니다. ${sample.brandName} 공식 채널로 예약 가능 여부를 확인하세요.`,
];
const brandedPack = {
  title: `${sample.brandName} ${sample.topic}`,
  sections: brandedBodies.map((body, i) => ({
    heading: `안내 ${i + 1}`,
    body,
  })),
};
const brandedGate = assertTopicProofPostWrite(brandedPack, rich);
assert.equal(brandedGate.ok, true, brandedGate.reasons?.join(", "));

assert.ok(TOPIC_PROOF_PIPELINE_ORDER.includes("topic_map"));
assert.ok(PIPELINE_ORDER_STRICT.includes("topic_map"));
assert.ok(PIPELINE_ORDER_STRICT.indexOf("generate") > PIPELINE_ORDER_STRICT.indexOf("topic_explanation_rate"));

console.log("OK topic proof gate");
console.log("sample:", sample.brandName, sample.topic);
console.log("thin reasons:", thinProof.reasons.join(", "));
console.log(
  "rich metrics:",
  JSON.stringify(
    {
      securement: richProof.metrics?.securement?.rate,
      explanation: richProof.metrics?.explanation?.explanationRate,
      units: richProof.metrics?.infoUnits?.unitCount,
    },
    null,
    2
  )
);
