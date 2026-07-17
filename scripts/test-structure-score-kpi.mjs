/**
 * 구조 KPI — 결론 선두 · 경험 · 지역 · 브랜드 사실
 */
import assert from "node:assert/strict";
import {
  assessStructureScore,
  measureStructureScoreKpi,
  assessPlaceStructureSignals,
} from "../lib/quality/structureScoreKpi.js";
import {
  ensureAnswerFirstSectionOpenings,
  assessSectionLeadAnswer,
} from "../lib/product/briclogExplainEngine.js";
import { ensureMinExperienceObservation } from "../lib/product/briclogExperienceOpinionEngine.js";
import { buildTopicRecommendations } from "../lib/memory/topicEngine.js";
import { buildContentOperatingPlan } from "../lib/product/briclogBrandContentOS.js";
import { buildScheduleTips } from "../lib/product/contentScheduleCalendar.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_EXPLAIN_V3 = "true";
process.env.BRICLOG_EXPERIENCE_OPINION = "true";

const input = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름철 꽃 추천",
  industry: "꽃집",
  storeFeatures: "24시간 무인, 만원 꽃다발, 무인 픽업",
  recentTopics: ["여름철 꽃 추천"],
};

const weakPack = {
  title: "여름 꽃",
  sections: [
    {
      heading: "소개",
      body: "꽃이 있습니다. 매장이 있습니다.",
    },
  ],
};

const leadBefore = assessSectionLeadAnswer(weakPack.sections[0].body, input);
assert.equal(leadBefore.ok, false);

const answered = ensureAnswerFirstSectionOpenings(weakPack, input);
assert.equal(answered._meta?.explainAnswerFirst, true);
const leadAfter = assessSectionLeadAnswer(answered.sections[0].body, input);
assert.equal(leadAfter.ok, true);

const withExp = {
  ...answered,
  sections: answered.sections.map((sec) => {
    const { text } = ensureMinExperienceObservation(sec.body, input);
    return { ...sec, body: text };
  }),
};

const structure = assessStructureScore(withExp, input);
assert.ok(structure.score >= 50, `structure score ${structure.score}`);
assert.equal(structure.parts.leadAnswer, true);
assert.equal(structure.parts.experienceSentence, true);

const placeText = "매장 소식을 안내합니다. 예약은 전화로 가능합니다.";
const placeEnsured = ensureMinExperienceObservation(placeText, input);
assert.equal(placeEnsured.injected, true);
const placeSig = assessPlaceStructureSignals(placeEnsured.text, input);
assert.equal(placeSig.experienceSentence, true);

const topics = buildTopicRecommendations({
  brandName: input.brandName,
  region: input.region,
  industry: input.industry,
  recentTopics: input.recentTopics,
});
assert.ok(topics.week.some((w) => w.axis === "deepen"));
assert.ok(topics.topicAxisHints?.refresh);

const plan = buildContentOperatingPlan(input);
assert.ok(plan.whatToWrite.some((w) => w.axis === "refresh"));
assert.ok(plan.topicAxis?.refreshHint);

const tips = buildScheduleTips({
  brandName: input.brandName,
  region: input.region,
  topic: input.topic,
  historyCount: 2,
  gapDays: 3,
});
assert.ok(tips.some((t) => t.id === "topic-deepen-refresh"));

const kpi = measureStructureScoreKpi([
  { label: "weak", pack: weakPack, input },
  { label: "strong", pack: withExp, input },
]);
assert.ok(kpi.total === 2);
assert.ok(kpi.results[1].ok || kpi.results[1].score >= 50);

console.log(
  JSON.stringify(
    {
      leadAfter: leadAfter.ok,
      structureScore: structure.score,
      placeExperience: placeSig.experienceSentence,
      deepenTopics: topics.week.filter((w) => w.axis === "deepen").length,
      tipFreshness: true,
      kpiRate: kpi.rate,
    },
    null,
    2
  )
);
console.log("OK: structure score kpi + citation/experience/topic axis");
