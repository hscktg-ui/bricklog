/**
 * Brand Content OS — 비전·기획·KPI 회귀
 */
import {
  BRICLOG_VISION,
  BRAND_CONTENT_OS_KPI,
  buildContentOperatingPlan,
  assessBrandContentOSQuality,
  formatContentOperatingPlanBrief,
} from "../lib/product/briclogBrandContentOS.js";
import { buildMissionExperienceCatalog } from "../lib/product/missionProseEngine.js";
import { deriveTopicWritingContext } from "../lib/content/topicFacetEngine.js";
import { runResearchFirstPipeline } from "../lib/product/briclogResearchFirstPipeline.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const input = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름 꽃 추천",
  industry: "꽃집",
  storeFeatures: "24시간 무인, 만원 꽃다발",
};

if (BRICLOG_VISION.identity !== "Brand Content OS") {
  console.error("FAIL: vision identity");
  process.exit(1);
}

const plan = buildContentOperatingPlan(input);
if (!plan.whatToWrite?.length || !plan.whyWrite?.length || !plan.researchMustKnow?.length) {
  console.error("FAIL: operating plan incomplete", plan);
  process.exit(1);
}

if (!formatContentOperatingPlanBrief(plan).includes("무엇을 쓸지")) {
  console.error("FAIL: plan brief");
  process.exit(1);
}

const dossier = runResearchFirstPipeline(input);
if (!dossier.operatingPlan?.operatingHeadline) {
  console.error("FAIL: dossier missing operating plan");
  process.exit(1);
}

const p = deriveTopicWritingContext(input);
const paras = buildMissionExperienceCatalog(p, input, []);
const pack = {
  title: plan.operatingHeadline,
  sections: paras.map((body) => ({ heading: "", body })),
};

const os = assessBrandContentOSQuality(pack, input, { plan, dossier });

const kpiSum = Object.values(BRAND_CONTENT_OS_KPI).reduce((a, b) => a + b, 0);
if (kpiSum !== 100) {
  console.error("FAIL: KPI weights must sum 100", BRAND_CONTENT_OS_KPI);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      vision: BRICLOG_VISION.identity,
      userValue: BRICLOG_VISION.userValue,
      operatingHeadline: plan.operatingHeadline,
      osScore: os.score,
      osPass: os.pass,
      breakdown: os.breakdown,
      kpi: BRAND_CONTENT_OS_KPI,
    },
    null,
    2
  )
);

if (!os.pass) {
  console.error("FAIL: OS quality", os);
  process.exit(1);
}

console.log("OK: Brand Content OS");
