/**
 * BRICLOG RESEARCH FIRST V2 — 조사 우선 파이프라인 회귀
 */
import {
  runResearchFirstPipeline,
  assertResearchFirstWritable,
  detectResearchFirstViolations,
} from "../lib/product/briclogResearchFirstPipeline.js";
import { buildMissionExperienceCatalog } from "../lib/product/missionProseEngine.js";
import { deriveTopicWritingContext } from "../lib/content/topicFacetEngine.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_RESEARCH_FIRST = "true";

const flowerInput = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름철 꽃 추천",
  mainKeyword: "여름 꽃 추천",
  industry: "꽃집",
  storeFeatures: "24시간 무인, 만원 꽃다발, 키오스크 픽업",
};

const chairInput = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "스트레스리스 다이닝체어 STRESSLESS MINT LB D200",
  industry: "가구",
  storeFeatures: "프랜차이즈 쇼룸, 스트레스리스 체어 전시",
};

const emptyInput = {
  brandName: "테스트",
  region: "서울",
  topic: "카페 추천",
  industry: "카페",
};

for (const [label, input] of [
  ["flower", flowerInput],
  ["chair", chairInput],
]) {
  const dossier = runResearchFirstPipeline(input);
  const gate = assertResearchFirstWritable(input);
  if (!gate.ok) {
    console.error(`FAIL ${label}: should be writable`, dossier.failReasons);
    process.exit(1);
  }
  if (!dossier.organized?.flowerNames?.length && label === "flower") {
    if (dossier.organized?.groups?.flower_names?.length < 3) {
      console.error("FAIL flower: names", dossier.organized);
      process.exit(1);
    }
  }
  if (label === "flower") {
    const p = deriveTopicWritingContext(input);
    const paras = buildMissionExperienceCatalog(p, input, []);
    const viol = detectResearchFirstViolations(paras.join("\n"));
    if (!viol.ok) {
      console.error("FAIL flower prose violations", viol);
      process.exit(1);
    }
  }
}

const emptyDossier = runResearchFirstPipeline(emptyInput);
const emptyGate = assertResearchFirstWritable(emptyInput);
if (emptyGate.ok) {
  console.error("FAIL: cafe without menu should block writing", emptyDossier.failReasons);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      flowerWritable: true,
      chairWritable: true,
      cafeBlocked: !emptyGate.ok,
      flowerOrganizedLines: runResearchFirstPipeline(flowerInput).organized.lines.slice(0, 6),
    },
    null,
    2
  )
);
console.log("OK: research first pipeline v2");
