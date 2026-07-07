/**
 * North Star KPI — 붙여넣기·월간 운영 계획
 * Run: npm run test:north-star-kpi
 */
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assessPreGenerationNorthStar,
  assessPasteReadyNorthStar,
  NORTH_STAR_KPI_VERSION,
} from "../lib/product/northStarDeliveryKpi.js";
import { COUNCIL_BRIEF_CASES } from "../lib/council/councilBriefCases.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const mockPack = (text, extra = {}) => ({
  sections: [
    { heading: "소개", body: text.slice(0, Math.ceil(text.length / 2)) },
    { heading: "정리", body: text.slice(Math.ceil(text.length / 2)) },
  ],
  _meta: {
    publishReady: true,
    sqv: { publishReady: true },
    writerFirstOrchestratorEscape: true,
    visitReviewBenchmark: { publishOk: true, score: 90 },
    contentEvaluation: { pass: true, shouldWithhold: false },
  },
  ...extra,
});

const results = [];

for (const brief of COUNCIL_BRIEF_CASES) {
  const pre = assessPreGenerationNorthStar(brief.input);
  const preOk = pre.monthlyPlanReady && pre.contractReady && pre.inputReady;
  results.push({
    id: brief.id,
    phase: "pre",
    pass: preOk,
    score: pre.score,
    contractType: pre.contractType,
  });
  assert.ok(pre.monthlyPlanReady, `${brief.id} monthly plan`);
  assert.ok(pre.pass, `${brief.id} pre score ${pre.score}`);
}

const flowerInput = COUNCIL_BRIEF_CASES[0].input;
const goodText =
  "여름 꽃 라인업을 항목별로 정리합니다. 장미·해바라기·수국의 특징과 선물 용도를 비교하고, 그랩앤고플라워 평택 매장에서 픽업·배송 안내를 덧붙입니다. ".repeat(
    40
  );
const paste = assessPasteReadyNorthStar(mockPack(goodText), flowerInput);
results.push({
  id: "paste_good",
  phase: "post",
  pass: paste.pasteReady,
  failReasons: paste.failReasons,
});
assert.ok(paste.pasteReady, `paste good: ${paste.failReasons.join(",")}`);

const visitLeak = assessPasteReadyNorthStar(
  mockPack("다녀왔어요. 진열대에서 꽃을 골랐습니다. ".repeat(20)),
  flowerInput
);
assert.equal(visitLeak.visitLeak, true, "visit leak detected");
assert.equal(visitLeak.pasteReady, false, "visit blocks paste");
results.push({
  id: "paste_visit_leak",
  phase: "post",
  pass: visitLeak.visitLeak && !visitLeak.pasteReady,
  failReasons: visitLeak.failReasons,
});

const summary = {
  version: NORTH_STAR_KPI_VERSION,
  at: new Date().toISOString(),
  total: results.length,
  pass: results.filter((r) => r.pass).length,
  results,
};

const outDir = join(root, "artifacts", "north-star-kpi");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "latest-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

console.log(`OK north-star-kpi (${summary.pass}/${summary.total})`);
console.log(`Report: ${join(outDir, "latest-summary.json")}`);
