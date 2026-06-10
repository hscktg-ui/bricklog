/**
 * 로컬 Mission prose — 테스트 시나리오 제작글 (배포 엔진 회귀 기준)
 */
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { buildMissionExperienceCatalog } from "../lib/product/missionProseEngine.js";
import { deriveTopicWritingContext } from "../lib/content/topicFacetEngine.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import { countPlaceholderContamination } from "../lib/content/placeholderContaminationEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { runResearchFirstPipeline } from "../lib/product/briclogResearchFirstPipeline.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_RESEARCH_FIRST = "true";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "artifacts", "local-mission-samples");

const SCENARIOS = [
  {
    id: "flower_summer",
    title: "파주 운정 그랩앤고플라워 여름 꽃 추천",
    input: {
      brandName: "그랩앤고플라워",
      region: "파주 운정",
      topic: "여름 꽃 추천",
      mainKeyword: "여름 꽃 추천",
      industry: "꽃집",
      storeFeatures: "24시간 무인, 만원 꽃다발, 무인 픽업",
    },
  },
  {
    id: "furniture_stressless",
    title: "경기도 용인 에이스침대 스트레스리스 다이닝체어 STRESSLESS MINT LB D200",
    input: {
      brandName: "에이스침대",
      region: "경기도 용인",
      topic: "스트레스리스 다이닝체어 STRESSLESS MINT LB D200",
      mainKeyword: "스트레스리스 다이닝체어 STRESSLESS",
      industry: "가구",
      storeFeatures: "프랜차이즈 쇼룸, 스트레스리스 체어 전시",
    },
  },
];

mkdirSync(OUT, { recursive: true });
const summary = [];

for (const sc of SCENARIOS) {
  const dossier = runResearchFirstPipeline(sc.input);
  const p = deriveTopicWritingContext(sc.input);
  const paras = buildMissionExperienceCatalog(p, sc.input, []);
  const pack = {
    title: sc.title,
    sections: paras.map((body, i) => ({ heading: ``, body })),
  };
  const full = getBlogFullText(pack);
  const ph = countPlaceholderContamination(full).total;
  const ev = assessContentEvaluation(pack, sc.input);

  const md = [
    `# ${sc.title}`,
    "",
    `> 로컬 Mission 엔진 · eval ${ev.score} · placeholder ${ph} · research dossier ${dossier.writable ? "OK" : "FAIL"}`,
    "",
    "## 조사 정리 (STEP 7)",
    "",
    dossier.organized?.text || "(없음)",
    "",
    "---",
    "",
    full,
  ].join("\n");

  writeFileSync(join(OUT, `${sc.id}.md`), md, "utf8");
  summary.push({
    id: sc.id,
    evalScore: ev.score,
    evalPass: ev.pass,
    placeholder: ph,
    dossierWritable: dossier.writable,
    chars: full.length,
  });
}

writeFileSync(join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
