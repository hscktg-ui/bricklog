/**
 * Overnight quality — 4 canonical samples × Research/Explain/Experience/Delete/Gate
 */
import assert from "node:assert/strict";
import { buildForcedMissionProsePack } from "../lib/product/missionProseRouteEngine.js";
import { buildMissionProseFallbackPack } from "../lib/llm/missionProseFallback.js";
import { enrichMinimalBlogInput } from "../lib/llm/blogDeliveryFallback.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";
import {
  assessOvernightSampleQuality,
  ensureResearchFirstDossier,
} from "../lib/product/overnightQualityPipeline.js";
import { runResearchFirstPipeline } from "../lib/product/briclogResearchFirstPipeline.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_EXPERIENCE_OPINION = "true";
process.env.BRICLOG_RESEARCH_FIRST = "true";

const SAMPLES = [
  {
    id: "flower",
    input: {
      brandName: "그랩앤고플라워",
      region: "파주",
      topic: "여름철 꽃 추천",
      industry: "꽃집",
      storeFeatures: "24시간 무인, 만원 꽃다발",
    },
    build: (input) => buildForcedMissionProsePack(input),
    minEval: 90,
  },
  {
    id: "chair",
    input: {
      brandName: "에이스침대",
      region: "경기도 용인",
      topic: "STRESSLESS MINT LB D200",
      industry: "가구",
      storeFeatures: "프랜차이즈 쇼룸",
    },
    build: (input) => buildForcedMissionProsePack(input),
    minEval: 90,
  },
  {
    id: "cafe",
    input: {
      brandName: "모카하우스",
      region: "서울 마포",
      topic: "여름 신메뉴 출시",
      industry: "카페",
      storeFeatures: "브런치, 테라스 좌석",
    },
    build: (input) =>
      buildMissionProseFallbackPack(enrichMinimalBlogInput(input)),
    minEval: 85,
  },
  {
    id: "agency",
    input: {
      brandName: "해신기획",
      region: "파주 운정",
      topic: "브랜드 블로그 운영",
      industry: "마케팅",
      storeFeatures: "콘텐츠 기획, 브랜드 톤 가이드",
    },
    build: (input) =>
      buildMissionProseFallbackPack(enrichMinimalBlogInput(input)),
    minEval: 85,
  },
];

const results = [];

for (const sample of SAMPLES) {
  const enriched = ensureResearchFirstDossier(sample.input);
  const dossier = runResearchFirstPipeline(enriched);
  assert.ok(dossier.checklist?.length >= 2, `${sample.id} research checklist`);

  let pack = sample.build(enriched);
  assert.ok(pack?.sections?.length, `${sample.id} has sections`);

  pack = finalizeContentQualityForDelivery(pack, enriched, "blog");
  const full = getBlogFullText(pack);
  const eval_ = assessContentEvaluation(pack, enriched);
  const overnight = assessOvernightSampleQuality(pack, {
    ...enriched,
    researchFirstDossier: dossier,
  });

  const row = {
    id: sample.id,
    evalScore: eval_.score,
    evalPass: eval_.pass,
    overnightScore: overnight.score,
    overnightPass: overnight.pass,
    contentGate: overnight.contentGateScore,
    explainRate: overnight.explainRate,
    experienceRate: overnight.experienceRate,
    checks: overnight.checks,
    chars: full.length,
    pipeline: pack._meta?.overnightQualityPipeline,
  };
  results.push(row);
  console.log(JSON.stringify(row, null, 2));

  assert.ok(!/전시\s*소식|좋은내용|undefined/.test(full), `${sample.id} no contamination`);
  assert.ok(eval_.score >= sample.minEval, `${sample.id} eval >= ${sample.minEval} (${eval_.score})`);
  assert.equal(overnight.checks.noPlaceholder, true, `${sample.id} placeholder clean`);
}

const avgOvernight =
  results.reduce((a, r) => a + r.overnightScore, 0) / results.length;
console.log(
  JSON.stringify({ avgOvernightScore: Math.round(avgOvernight), samples: results.length }, null, 2)
);
assert.ok(avgOvernight >= 85, `avg overnight score >= 85 (${avgOvernight})`);
console.log("OK: overnight quality samples");
