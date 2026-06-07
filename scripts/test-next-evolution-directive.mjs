/**
 * BRICLOG NEXT EVOLUTION DIRECTIVE — 파이프라인·엔진·게이트 회귀
 */
import assert from "node:assert/strict";
import { PIPELINE_ORDER_STRICT } from "../lib/product/briclogPriority.js";
import {
  assertNextEvolutionPreWrite,
  buildNextEvolutionPromptBlock,
  NEXT_EVOLUTION_VERSION,
} from "../lib/product/briclogNextEvolutionDirective.js";
import { assessBrandKnowledge, MIN_BRAND_KNOWLEDGE_ITEMS } from "../lib/product/brandKnowledgeEngine.js";
import { filterUsableFactsForBody, MIN_CONFIDENCE_FOR_BODY } from "../lib/product/confidenceEngine.js";
import { assessPreWriteInformationDensity } from "../lib/product/informationDensityEngine.js";
import { detectIndustryContamination } from "../lib/product/industryContaminationEngine.js";
import { detectAiWritingPatterns } from "../lib/product/aiPatternDetector.js";
import { resolveBrandDna } from "../lib/product/brandDnaEngine.js";
import { buildGlobalizationBrief } from "../lib/product/globalizationEngine.js";
import { MIN_VERIFIED_BRAND_FACTS } from "../lib/product/brandJournalistDirective.js";

assert.equal(MIN_VERIFIED_BRAND_FACTS, 3);
assert.equal(MIN_BRAND_KNOWLEDGE_ITEMS, 3);
assert.equal(MIN_CONFIDENCE_FOR_BODY, 0.5);

assert.ok(PIPELINE_ORDER_STRICT.includes("brand_analysis"));
assert.ok(PIPELINE_ORDER_STRICT.includes("content_design"));
assert.ok(PIPELINE_ORDER_STRICT.includes("ai_editor_audit"));
assert.ok(
  PIPELINE_ORDER_STRICT.indexOf("generate") >
    PIPELINE_ORDER_STRICT.indexOf("topic_explanation_rate")
);

const prompt = buildNextEvolutionPromptBlock({ brandName: "플레르퍼피", industry: "pet" });
assert.ok(prompt.includes("브랜드 조사 시스템"));
assert.ok(prompt.includes("주제를 설명할 수 있는지 증명"));

const thin = {
  brandName: "플레르퍼피",
  region: "판교",
  topic: "방문 후기",
  industry: "pet_cafe",
};
const blocked = assertNextEvolutionPreWrite(thin, { facts: [] }, {});
assert.equal(blocked.ok, false);
assert.ok(blocked.reasons.length > 0);

const coverageBlob =
  "방문 후기란 반려견 보호자가 플레르퍼피 공간을 직접 확인하는 글입니다. " +
  "왜 필요한가 — 반려동물과 함께 갈 수 있는지, 실내 놀이 특징, 차별점, 대상 고객, " +
  "플레르퍼피 운영 방식·예약 절차·문의, 판교 지역 방문 맥락, 확인·주의·FAQ, 방문 예약.";
const facts = [
  { axis: "brand", fact: "플레르퍼피 반려동물 공간 — 실내 놀이·몸무게 제한 운영", source: "official" },
  { axis: "brand", fact: "플레르퍼피 판교점 위치·영업·문의 채널", source: "naver" },
  { axis: "brand", fact: "플레르퍼피 차별점 — 반려견 보호자 대상 실내 프로그램", source: "research" },
  { axis: "topic", fact: "방문 후기 — 왜 찾는지, 특징, 확인할 점", source: "research" },
  { axis: "topic", fact: "대상 고객: 반려견 보호자, 예약·방문 전 체크", source: "research" },
  { axis: "region", fact: "판교 지역 방문·이용 맥락", source: "naver" },
  { axis: "brand", fact: "플레르퍼피 효과·가치 — 반려견과 함께하는 시간", source: "official" },
  { axis: "brand", fact: "플레르퍼피 문의·예약 절차 안내", source: "official" },
];
const rich = {
  ...thin,
  includePhrases: coverageBlob,
  researchBrief: coverageBlob,
  geminiWriterBrief: coverageBlob,
  informationUnits: { unitCount: 10, units: facts.map((f, i) => ({ id: `u${i}` })) },
  knowledgeCoverage: { coverageCount: 8, areas: facts.map((f, i) => ({ id: `a${i}` })) },
  researchFacts: facts,
};
const allowed = assertNextEvolutionPreWrite(rich, { facts }, {});
assert.equal(allowed.ok, true, allowed.reasons.join(", "));
assert.ok(allowed.contentDesignBrief?.includes("콘텐츠 설계"));

const bk = assessBrandKnowledge(rich);
assert.ok(bk.ok);

const conf = filterUsableFactsForBody(rich, { facts }, {});
assert.ok(conf.usableCount >= 3);

const density = assessPreWriteInformationDensity(rich);
assert.ok(density.ok);

const petText = "반려견과 함께 방문한 플레르퍼피 공간 후기입니다.";
const furnitureLeak = detectIndustryContamination(
  `${petText} 매트리스 체압분산 스프링 소재 비교`,
  { industry: "pet_cafe" }
);
assert.equal(furnitureLeak.ok, false);

const aiPack = {
  sections: [
    {
      heading: "본문",
      body:
        "검색만 하다 보면 기준이 많아서 막히는 날이 있다. 퇴근길에 문득 주말 아침 테이블에서 생각했다.",
    },
    { heading: "정리", body: "내용" },
    { heading: "끝", body: "끝" },
  ],
};
const ai = detectAiWritingPatterns(aiPack, thin);
assert.equal(ai.ok, false);

const dna = resolveBrandDna({ industry: "pet_cafe" });
assert.ok(dna.traits.some((t) => t.ratio > 0));

const globalBrief = buildGlobalizationBrief("en");
assert.ok(globalBrief.includes("Google"));

console.log(`OK: next evolution directive ${NEXT_EVOLUTION_VERSION}`);
