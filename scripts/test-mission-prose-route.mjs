/**
 * Mission prose 강제 라우팅 — 꽃·체어 LLM 우회
 */
import assert from "node:assert/strict";
import { buildForcedMissionProsePack } from "../lib/product/missionProseRouteEngine.js";
import { shouldForceMissionProseOnlyPath } from "../lib/product/missionProseRouteFlags.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { assessContentEvaluation } from "../lib/product/contentEvaluationEngine.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";
process.env.BRICLOG_EXPERIENCE_OPINION = "true";

const flowerInput = {
  brandName: "그랩앤고플라워",
  region: "파주 운정",
  topic: "여름철 꽃 추천",
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
  assert.equal(shouldForceMissionProseOnlyPath(input), true);
  const pack = buildForcedMissionProsePack(input);
  const full = getBlogFullText(pack);
  assert.ok(pack.sections?.length, `${label} sections`);
  assert.ok(pack._meta?.forcedMissionProseRoute, `${label} route meta`);

  if (label === "flower") {
    assert.ok(/수국|해바라기|거베라/.test(full), "flower names");
    assert.ok(!/직원분|상월했|전시\s*소식/.test(full), "no visit template");
    assert.ok(
      !/들어서서|직접\s*들어가|찾게\s*된\s*계기|안내을\s*고를|꽃\s*추천\s*글을\s*읽다/.test(full),
      "no visit arc leak"
    );
    assert.ok(!/솔직히\s+여름철\s+꽃\s+추천\s+알아보던/.test(full), "no visit opener");
    assert.ok(/실제로|많이\s*선택|생각보다/.test(full), "experience framing");
    const paras = full.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 20);
    const keys = paras.map((p) => p.replace(/\s/g, "").slice(0, 40));
    assert.equal(keys.length, new Set(keys).size, "no duplicate paragraphs");
  }

  if (label === "chair") {
    assert.ok(/앉아\s*보면|생각보다/.test(full), "chair experience");
    assert.ok(!/매트리스|누워|전시\s*소식|전시\s*구성·안내|찾게\s*된\s*계기/.test(full), "no mattress leak");
    assert.ok(/에이스침대|스트레스리스/.test(full), "chair brand product");
  }

  const eval_ = assessContentEvaluation(pack, input);
  console.log(
    JSON.stringify({ label, evalScore: eval_.score, pass: eval_.pass, withheld: eval_.shouldWithhold }, null, 2)
  );
  assert.ok(eval_.score >= 90, `${label} eval >= 90`);
  assert.equal(eval_.pass, true, `${label} eval pass`);

  const finalized = finalizeContentQualityForDelivery(pack, input, "blog");
  const sqv = finalized._meta?.sqv;
  console.log(
    JSON.stringify(
      {
        label: `${label}_final`,
        evalScore: finalized._meta?.contentEvaluation?.score,
        sqvScore: sqv?.score,
        sqvGrade: sqv?.grade,
        deliveryGrade: finalized._meta?.deliveryGrade,
        outputWithheld: finalized._meta?.outputWithheld,
      },
      null,
      2
    )
  );
  assert.ok(
    (finalized._meta?.contentEvaluation?.score ?? 0) >= 90,
    `${label} finalize eval`
  );
  assert.ok((sqv?.score ?? 0) >= 76, `${label} sqv >= B (${sqv?.score})`);
  assert.equal(sqv?.grade, "A", `${label} sqv grade A (${sqv?.grade})`);
  assert.equal(finalized._meta?.professionalEditorGrade || sqv?.professionalEditorGrade, true, `${label} editor grade`);
  assert.equal(finalized._meta?.outputWithheld, false, `${label} not withheld`);
  assert.ok(
    finalized._meta?.deliveryGrade === "human" ||
      finalized._meta?.deliveryGrade === "publish",
    `${label} human+ delivery grade`
  );
}

console.log("OK: mission prose route");
