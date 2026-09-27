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
if (emptyDossier.writable) {
  console.error("FAIL: cafe without menu should not be writable", emptyDossier.failReasons);
  process.exit(1);
}

// always-deliver(기본값)에서는 하드 차단 대신 thin research 표시 + 사유 노출 — 보류 판정은 품질 게이트가 한다
const softGate = assertResearchFirstWritable(emptyInput);
if (!softGate.ok || !softGate.thinResearchProceed) {
  console.error("FAIL: thin research should proceed under always-deliver", softGate);
  process.exit(1);
}
if (!softGate.reasons?.includes("industry_cafe_menu_missing")) {
  console.error("FAIL: thin research must surface the industry gap", softGate.reasons);
  process.exit(1);
}

process.env.BRICLOG_ALWAYS_DELIVER = "false";
const strictGate = assertResearchFirstWritable(emptyInput);
delete process.env.BRICLOG_ALWAYS_DELIVER;
if (strictGate.ok || !strictGate.writingBlocked) {
  console.error("FAIL: cafe without menu should block writing when always-deliver is off", strictGate);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      flowerWritable: true,
      chairWritable: true,
      cafeThinResearch: softGate.thinResearchProceed === true,
      cafeReasons: softGate.reasons,
      cafeBlockedWhenStrict: strictGate.ok === false,
      flowerOrganizedLines: runResearchFirstPipeline(flowerInput).organized.lines.slice(0, 6),
    },
    null,
    2
  )
);
console.log("OK: research first pipeline v2");
