/**
 * 에이스침대 · 스트레스리스 다이닝체어 — 프랜차이즈 엔진 회귀
 */
import { buildMissionExperienceCatalog } from "../lib/product/missionProseEngine.js";
import { deriveTopicWritingContext } from "../lib/content/topicFacetEngine.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { countPlaceholderContamination } from "../lib/content/placeholderContaminationEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const input = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "스트레스리스 다이닝체어 STRESSLESS MINT LB D200",
  mainKeyword: "스트레스리스 다이닝체어 STRESSLESS",
  industry: "가구",
  storeFeatures: "프랜차이즈 쇼룸, 스트레스리스 체어 전시",
};

const p = deriveTopicWritingContext(input);
const paras = buildMissionExperienceCatalog(p, input, []);
const full = paras.join("\n\n");

const banned = [
  /\(.*기준\)/,
  /메뉴\s*기준/,
  /이번\s*전시\s*을/,
  /전시\s*소식/,
  /✔/,
  /선택이\s*수월/,
  /에이스침대\s*안내\s*MINT/,
  /10분\s*넘게\s*누워/,
  /헤드보드/,
  /침실\s*통로/,
];

for (const re of banned) {
  if (re.test(full)) {
    console.error("FAIL: banned furniture defect:", re.source);
    console.error(full.slice(0, 600));
    process.exit(1);
  }
}

if (!/STRESSLESS|MINT|다이닝체어|체어/.test(full)) {
  console.error("FAIL: product label missing");
  process.exit(1);
}

if (!/앉|좌판|등받이|리클라인/.test(full)) {
  console.error("FAIL: chair experience missing");
  process.exit(1);
}

const pack = {
  title: "경기도 용인 에이스침대 스트레스리스 다이닝체어",
  sections: paras.map((body, i) => ({ heading: `섹션 ${i + 1}`, body })),
};

const ph = countPlaceholderContamination(getBlogFullText(pack));
const eval_ = assessContentEvaluation(pack, input);

console.log(
  JSON.stringify(
    {
      placeholder: ph.total,
      evalScore: eval_.score,
      evalPass: eval_.pass,
      excerpt: full.slice(0, 400),
    },
    null,
    2
  )
);

if (ph.total > 0 || eval_.hardFail || eval_.score < 90) {
  console.error("FAIL: quality", ph, eval_.hardReasons, eval_.breakdown);
  process.exit(1);
}

console.log("OK: furniture chair product prose");
