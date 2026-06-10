/**
 * 전문 에디터 등급 SSOT — SQV A · human 배달 · 발행 표시
 */
import assert from "node:assert/strict";
import { buildForcedMissionProsePack } from "../lib/product/missionProseRouteEngine.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { assessProfessionalEditorDelivery } from "../lib/product/professionalEditorGradeEngine.js";
import { buildManuscriptStatusFromPack } from "../lib/product/publishGradeDisplay.js";
import { buildBriclogContextScore } from "../lib/publicTest/briclogContextScore.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const scenarios = [
  {
    id: "flower",
    input: {
      brandName: "그랩앤고플라워",
      region: "파주 운정",
      topic: "여름철 꽃 추천",
      industry: "꽃집",
      storeFeatures: "24시간 무인",
      blogLengthTier: "short",
    },
  },
  {
    id: "chair",
    input: {
      brandName: "에이스침대",
      region: "경기도 용인",
      topic: "스트레스리스 다이닝체어 STRESSLESS MINT LB D200",
      industry: "가구",
      storeFeatures: "쇼룸",
      blogLengthTier: "short",
    },
  },
];

for (const sc of scenarios) {
  const pack = finalizeContentQualityForDelivery(
    buildForcedMissionProsePack(sc.input),
    sc.input,
    "blog"
  );
  const sqv = pack._meta?.sqv;
  const editor = assessProfessionalEditorDelivery(pack, sc.input);
  const manuscript = buildManuscriptStatusFromPack(pack);
  const context = buildBriclogContextScore(sc.input, pack, { relevance: { rate: 0.8 } });

  console.log(
    JSON.stringify(
      {
        id: sc.id,
        sqvScore: sqv?.score,
        sqvGrade: sqv?.grade,
        deliveryGrade: pack._meta?.deliveryGrade,
        editorOk: editor.ok,
        manuscriptGrade: manuscript.grade?.id,
        publishScore: context.publishScore,
        publishGrade: context.publishGrade?.id,
      },
      null,
      2
    )
  );

  assert.equal(editor.ok, true, `${sc.id} editor grade`);
  assert.equal(sqv?.grade, "A", `${sc.id} sqv A`);
  assert.ok((sqv?.score ?? 0) >= 88, `${sc.id} sqv score`);
  assert.ok(
    pack._meta?.deliveryGrade === "human" || pack._meta?.deliveryGrade === "publish",
    `${sc.id} delivery human+`
  );
  assert.equal(manuscript.grade?.id, "A", `${sc.id} manuscript A`);
  assert.equal(context.publishGrade?.id, "A", `${sc.id} context A`);
}

console.log("OK: professional editor grade engine");
