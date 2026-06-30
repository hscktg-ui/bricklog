/**
 * P0 — columnist bench A + editor eval 정합성
 * Run: npm run test:columnist-editor-grade-pass
 */
import assert from "node:assert/strict";
import { assessProfessionalEditorDelivery, isColumnistEditorGradePass } from "../lib/product/professionalEditorGradeEngine.js";

const input = {
  brandName: "금성침대",
  region: "김포",
  topic: "매트리스 체험",
  industry: "침대·매트리스",
  storeFeatures: "쇼룸 체험 · 맞춤 상담",
  researchFacts: [
    { text: "김포 쇼룸에서 매트리스 firmness 테스트 가능", kind: "local" },
    { text: "10년 무상 A/S 제공", kind: "service" },
    { text: "주말 체험 예약제 운영", kind: "hours" },
  ],
};

const bodySentence =
  "김포 쇼룸에서 매트리스 firmness 테스트와 10년 무상 A/S, 주말 예약제 안내를 직접 확인했습니다. ";
const pack = {
  title: "김포 금성침대 수면 체험, 직접 둘러보고 정리했습니다",
  sections: Array.from({ length: 7 }, (_, i) => ({
    heading: `섹션 ${i + 1}`,
    body: bodySentence.repeat(6),
  })),
  _meta: {
    generationMode: "columnist_sovereign",
    visitReviewBenchmarkOk: true,
    visitReviewBenchmark: { score: 97, grade: "A", publishOk: true, hardFails: [] },
    contentEvaluation: { pass: true, score: 97, columnistBenchmark: true },
  },
};

assert.equal(isColumnistEditorGradePass(pack, input), true, "columnist editor pass");

const editor = assessProfessionalEditorDelivery(pack, input);
assert.equal(editor.evalPass, true, "evalPass");
assert.equal(editor.ok, true, "editor ok");
assert.ok(editor.score >= 88, "editor score A");

console.log("OK columnist-editor-grade-pass");
