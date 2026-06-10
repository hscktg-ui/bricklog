/**
 * BRICLOG V3 Explain Engine — 키워드→문장 금지 · 설명률 KPI
 */
import { buildMissionExperienceCatalog } from "../lib/product/missionProseEngine.js";
import { deriveTopicWritingContext } from "../lib/content/topicFacetEngine.js";
import {
  assessExplainQuality,
  assessV3ContentQuality,
  isKeywordToSentenceLeak,
  isHollowInfoSentence,
} from "../lib/product/briclogExplainEngine.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_EXPLAIN_V3 = "true";

const flowerInput = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름철 꽃 추천",
  mainKeyword: "여름철 꽃 추천",
  industry: "꽃집",
  storeFeatures: "24시간 무인, 만원 꽃다발, 무인 픽업",
};

const chairInput = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "스트레스리스 다이닝체어 STRESSLESS MINT LB D200",
  industry: "가구",
  storeFeatures: "프랜차이즈 쇼룸, 스트레스리스 체어 전시",
};

const bannedSamples = [
  "수국을 골랐어요.",
  "해바라기를 선택했어요.",
  "거베라를 비교해 봤어요.",
  "비교해 보니 기준이 보였어요.",
];

for (const s of bannedSamples) {
  if (!isKeywordToSentenceLeak(s) && !isHollowInfoSentence(s)) {
    console.error("FAIL: should ban:", s);
    process.exit(1);
  }
}

for (const [label, input] of [
  ["flower", flowerInput],
  ["chair", chairInput],
]) {
  const p = deriveTopicWritingContext(input);
  const paras = buildMissionExperienceCatalog(p, input, []);
  const full = paras.join("\n\n");
  const pack = {
    title: input.topic,
    sections: paras.map((body) => ({ heading: "", body })),
  };

  if (isKeywordToSentenceLeak(full) || /수국을 골랐|해바라기를 선택|거베라를 비교/.test(full)) {
    console.error("FAIL keyword leak in", label, full.slice(0, 400));
    process.exit(1);
  }

  const explain = assessExplainQuality(pack, input);
  const v3 = assessV3ContentQuality(pack, input);
  const eval_ = assessContentEvaluation(pack, input);

  if (explain.rate < 0.85) {
    console.error("FAIL explain rate", label, explain);
    process.exit(1);
  }

  if (label === "flower") {
    if (!/많이\s*선택|실제로|생각보다|만족도/.test(full)) {
      console.error("FAIL: flower experience framing missing", full.slice(0, 500));
      process.exit(1);
    }
    if (!/그랩앤고플라워/.test(full)) {
      console.error("FAIL: brand connection missing");
      process.exit(1);
    }
  }

  console.log(
    JSON.stringify({ label, explainRate: explain.rate, v3Score: v3.score, evalScore: eval_.score }, null, 2)
  );
}

console.log("OK: explain engine v3");
