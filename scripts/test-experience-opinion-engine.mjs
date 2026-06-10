/**
 * Experience + Opinion Engine 회귀
 */
import {
  isDryFactSentence,
  assessExperienceOpinionQuality,
  buildFlowerExperienceOpinionParagraphs,
  buildChairExperienceOpinionParagraphs,
} from "../lib/product/briclogExperienceOpinionEngine.js";
import { buildMissionExperienceCatalog } from "../lib/product/missionProseEngine.js";
import { deriveTopicWritingContext } from "../lib/content/topicFacetEngine.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_EXPERIENCE_OPINION = "true";

const banned = [
  "수국은 풍성한 형태가 특징입니다.",
  "STRESSLESS MINT는 좌판 높이를 조절할 수 있습니다.",
];

for (const s of banned) {
  if (!isDryFactSentence(s)) {
    console.error("FAIL: should ban dry fact:", s);
    process.exit(1);
  }
}

const flowerInput = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름 꽃 추천",
  industry: "꽃집",
  storeFeatures: "24시간 무인, 만원 꽃다발",
};

const chairInput = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "스트레스리스 다이닝체어 STRESSLESS MINT LB D200",
  industry: "가구",
  storeFeatures: "프랜차이즈 쇼룸",
};

for (const [label, input] of [
  ["flower", flowerInput],
  ["chair", chairInput],
]) {
  const p = deriveTopicWritingContext(input);
  const paras = buildMissionExperienceCatalog(p, input, []);
  const full = paras.join("\n");

  if (/특징입니다|조절할\s*수\s*있습니다/.test(full)) {
    console.error("FAIL dry spec leak in", label);
    process.exit(1);
  }

  if (label === "flower" && !/실제로|많이\s*선택|생각보다/.test(full)) {
    console.error("FAIL: flower missing experience markers");
    process.exit(1);
  }

  if (label === "chair" && !/앉아\s*보면|생각보다/.test(full)) {
    console.error("FAIL: chair missing experience markers");
    process.exit(1);
  }

  const pack = { title: input.topic, sections: paras.map((body) => ({ body })) };
  const exp = assessExperienceOpinionQuality(pack, input);
  if (!exp.ok) {
    console.error("FAIL experience quality", label, exp);
    process.exit(1);
  }
  console.log(JSON.stringify({ label, rate: exp.rate, dryFacts: exp.dryFacts }, null, 2));
}

console.log("OK: experience + opinion engine");
