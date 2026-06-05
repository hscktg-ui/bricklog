/**
 * Checklist voice — coverage 슬롯 덤프 차단
 */
import assert from "node:assert/strict";
import { scoreChecklistVoice } from "../lib/product/checklistVoiceEngine.js";
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { applyEditorialPackGate } from "../lib/content/editorialPackGate.js";
import { assessCompletionReadiness } from "../lib/product/completionStandard.js";

const checklistPack = {
  sections: [
    { heading: "브랜드 이해", body: "확인되지 않은 가격은 단정하지 말고 안내 가능 범위만 참고하세요. 매장·공식 안내로 확인하세요." },
    { heading: "가격 비교 포인트", body: "견적서로 받으세요. 행사 기간을 확인하세요. 할인 조건을 확인하세요." },
    { heading: "행사·기간", body: "매장·공식 안내로 확인하세요. 견적서로 확인하세요." },
    { heading: "설치 안내", body: "설치 전 확인하세요. 배송 확인하세요." },
    { heading: "AS 안내", body: "보증 확인하세요. A/S 확인하세요." },
    { heading: "FAQ", body: "문의하세요. 확인하세요." },
    { heading: "체크리스트", body: "확인하세요." },
  ],
};

const input = { brandName: "템퍼", region: "평택", topic: "모션베드", researchFacts: [{ fact: "3월 행사" }] };
const full = checklistPack.sections.map((s) => `${s.heading}\n${s.body}`).join("\n\n");

const cv = scoreChecklistVoice(full, checklistPack);
assert.ok(!cv.ok, "checklist pack must fail checklist voice");
assert.ok(cv.issues.includes("coverage_slot_dump") || cv.issues.includes("checklist_voice"));

const belief = scoreHumanBelief(full, input, checklistPack);
assert.ok(!belief.ok, "checklist pack must fail human belief");

const edited = applyEditorialPackGate(checklistPack, { input });
assert.ok(edited.sections.length <= 6, "editorial gate caps sections");
assert.ok(edited.sections.length >= 3, "editorial gate keeps min sections");

const ready = assessCompletionReadiness(edited, input);
assert.ok(
  scoreChecklistVoice(
    edited.sections.map((s) => s.body).join("\n"),
    edited
  ).ok,
  "reshaped pack clears checklist voice"
);
assert.ok(edited._meta?.editorialPackGate?.reshaped, "editorial gate ran");

console.log("OK: checklist voice — detect, belief fail, editorial reshape");
console.log("  before belief:", belief.score, belief.issues.join(", "));
console.log("  after sections:", edited.sections.length);
