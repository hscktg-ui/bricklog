/**
 * A등급 조사·벤치마크 게이트 회귀
 */
import assert from "node:assert/strict";
import {
  collectSubstantiveResearchFacts,
  evaluateEditorGradeResearchGate,
  isMetaOnlyResearchFact,
  isSubstantiveResearchFact,
} from "../lib/product/editorGradeResearchGate.js";
import { assessVisitReviewBenchmark } from "../lib/product/visitReviewBenchmarkRubric.js";
import { GPT_YEOJU_BENCHMARK_PACK } from "../lib/product/visitReviewBenchmarkRubric.js";

process.env.BRICLOG_RESET_QUALITY = "true";

const noisyInput = {
  brandName: "청춘농장",
  region: "양평",
  topic: "딸기체험 수확 시즌 오픈, 직접 다녀왔어요",
  topicDisplayRaw: "딸기체험 수확 시즌 오픈, 직접 다녀왔어요",
  researchFacts: [
    { fact: "딸기체험 수확 시즌 오픈, 직접 다녀왔어요", source: "input_field" },
    { fact: "주제 표기 변형 「딸기체험」— 검색·조사용 단서", source: "entity_variant" },
    { fact: "청춘농장", source: "brand_axis" },
    { fact: "딸기 수확 체험, 가족 나들이", source: "research" },
    { fact: "양평 청춘농장 딸기 하우스 직접 수확 프로그램", source: "research" },
    { fact: "주말·평일 예약제 운영, 가족 단위 체험 동선", source: "research" },
  ],
};

const substantive = collectSubstantiveResearchFacts(noisyInput);
assert.ok(substantive.length >= 3, "meta filtered, concrete kept");
assert.ok(
  isMetaOnlyResearchFact("주제 표기 변형 「x」— 검색·조사용 단서", noisyInput, "entity_variant"),
  "entity variant is meta"
);
assert.ok(
  isSubstantiveResearchFact(
    { fact: "양평 청춘농장 딸기 하우스 직접 수확 프로그램", source: "research" },
    noisyInput
  ),
  "concrete program fact"
);

const gate = evaluateEditorGradeResearchGate(noisyInput);
assert.equal(gate.ok, true, "3+ substantive facts pass gate");

const thinGate = evaluateEditorGradeResearchGate({
  brandName: "청춘농장",
  region: "양평",
  topic: "매장 안내",
  researchFacts: [{ fact: "청춘농장", source: "brand_axis" }],
});
assert.equal(thinGate.ok, false, "thin meta-only fails");

const yeojuInput = {
  brandName: "여주목마",
  region: "여주",
  topic: "여름시즌 오픈 소식",
  researchFacts: [
    { fact: "실외 수영장·물놀이 시설 여름 시즌 오픈", source: "research" },
    { fact: "식당·카페·승마 체험이 한 공간에 연결", source: "research" },
    { fact: "가족 단위 방문객 동선·휴식 공간 구성", source: "research" },
  ],
};

const golden = assessVisitReviewBenchmark(GPT_YEOJU_BENCHMARK_PACK, yeojuInput);
assert.equal(golden.publishOk, true, "GPT golden benchmark publishOk");
assert.ok(golden.score >= 85, `golden score ${golden.score}`);

const vaguePack = {
  title: "여주목마 여름시즌 오픈",
  sections: [
    {
      heading: "오픈 소식",
      body: "검색만 하다 보면 기준이 많아서 어디서부터 볼지 막힙니다. 마음이 먼저 움직입니다.",
    },
    {
      heading: "여름의 리듬",
      body: "시즌 오픈은 말만 붙이면 끝나는 일이 아닙니다. 손의 감각이 느려집니다.",
    },
    {
      heading: "마무리",
      body: "한 번쯤 확인해볼 만합니다.",
    },
  ],
};

const vague = assessVisitReviewBenchmark(vaguePack, yeojuInput);
assert.equal(vague.publishOk, false, "abstract filler blocked");
assert.ok(
  vague.hardFails.some((f) =>
    ["engine_spam", "abstract_season_filler", "research_underwoven", "concrete_facts_missing"].includes(f)
  ),
  `hardFails: ${vague.hardFails.join(", ")}`
);

const yeojuProbeInput = {
  brandName: "여주목마",
  region: "여주",
  topic: "수영장 여름 시즌 오픈, 직접 다녀왔어요",
  storeFeatures: "실외 수영장·물놀이, 식당·카페, 승마 체험, 가족 나들이",
  researchFacts: [
    { fact: "여주목마 수영장 현장에서 확인한 운영 포인트", source: "research" },
    { fact: "주제 표기 변형 「수영장」— 검색·조사용 단서", source: "entity_variant" },
  ],
};
const yeojuSubstantive = collectSubstantiveResearchFacts(yeojuProbeInput);
assert.ok(yeojuSubstantive.length >= 3, `storeFeatures inject: ${yeojuSubstantive.length}`);
const yeojuGate = evaluateEditorGradeResearchGate(yeojuProbeInput);
assert.equal(yeojuGate.ok, true, "yeoju probe path passes A research gate");

console.log("OK editor-grade-research-gate");
