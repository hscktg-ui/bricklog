/**
 * 그랩앤고플라워 · 여름 꽃 추천 — 엔진 회귀 (방문 템플릿 금지)
 */
import { buildMissionExperienceCatalog } from "../lib/product/missionProseEngine.js";
import { deriveTopicWritingContext } from "../lib/content/topicFacetEngine.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { countPlaceholderContamination } from "../lib/content/placeholderContaminationEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const input = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름철 꽃 추천",
  mainKeyword: "여름철 꽃 추천",
  industry: "꽃집",
  storeFeatures: "24시간 무인, 만원 꽃다발, 무인 픽업",
};

const p = deriveTopicWritingContext(input);
const paras = buildMissionExperienceCatalog(p, input, []);
const full = paras.join("\n\n");

const banned = [
  /직원분/,
  /상담\s*초반/,
  /수월했/,
  /비교가\s*수월/,
  /안내\s*구성/,
  /이용\s*동선/,
  /확인해\s*확인해/,
  /컬러를에/,
];

for (const re of banned) {
  if (re.test(full)) {
    console.error("FAIL: banned template in flower recommendation prose:", re.source);
    console.error(full.slice(0, 500));
    process.exit(1);
  }
}

const flowers = ["수국", "해바라기", "거베라"];
const hits = flowers.filter((f) => full.includes(f));
if (hits.length < 3) {
  console.error("FAIL: need 3+ flower names, got", hits);
  process.exit(1);
}

if (!/24\s*시간|무인/.test(full) || !/만원/.test(full)) {
  console.error("FAIL: brand facts missing (24h/unmanned, 만원)");
  process.exit(1);
}

const pack = {
  title: "파주 운정 여름철 꽃 추천",
  sections: paras.map((body, i) => ({ heading: `섹션 ${i + 1}`, body })),
};

const ph = countPlaceholderContamination(getBlogFullText(pack));
if (ph.total > 0) {
  console.error("FAIL: placeholder in pack", ph);
  process.exit(1);
}

const eval_ = assessContentEvaluation(pack, input);
console.log(
  JSON.stringify(
    {
      flowerNames: hits,
      evalScore: eval_.score,
      evalPass: eval_.pass,
      hardFail: eval_.hardFail,
      excerpt: full.slice(0, 320),
    },
    null,
    2
  )
);

if (eval_.hardFail) {
  console.error("FAIL: hard fail", eval_.hardReasons);
  process.exit(1);
}

console.log("OK: flower recommendation prose engine");
