/**
 * Checklist forbidden heading sanitize — humanVoiceMet regression
 */
import assert from "node:assert/strict";
import {
  sanitizeChecklistForbiddenHeading,
  scoreChecklistVoice,
} from "../lib/product/checklistVoiceEngine.js";

const heading = sanitizeChecklistForbiddenHeading(
  "시즌 · 정기 검진과, 알아보게 된 이유",
  { topic: "정기 검진" },
  0
);
assert.ok(!heading.includes("알아보게 된 이유"), "rewrites forbidden snippet");

const pack = {
  sections: [{ heading, body: "본문입니다. " + "가나다 ".repeat(30) }],
};
const scored = scoreChecklistVoice(
  pack.sections.map((s) => `${s.heading}\n${s.body}`).join("\n"),
  pack
);
assert.equal(scored.issues.includes("checklist_voice"), false, "checklist_voice cleared");

console.log("test-checklist-heading-sanitize: PASS");
