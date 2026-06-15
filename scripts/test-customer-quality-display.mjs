/**
 * 고객 화면 — 내부 품질 브랜드(해신 등) 미노출
 */
import assert from "node:assert/strict";
import {
  sanitizeCustomerAuditIssue,
  sanitizeCustomerQualityText,
  CUSTOMER_POLISH_READY_HINT,
} from "../lib/copy/customerQualityDisplay.js";
import { auditPastedDraft } from "../lib/review/auditPastedDraft.js";
import { buildBriclogContextScore } from "../lib/publicTest/briclogContextScore.js";
import { resolvePublishReadiness } from "../lib/product/publishUiDisplay.js";

assert.equal(
  sanitizeCustomerQualityText("해신 검수 기준에 맞춰 다듬습니다."),
  "발행 품질에 맞춰 다듬습니다."
);
assert.ok(
  !sanitizeCustomerAuditIssue({ label: "해신", message: "해신기획 기준" }).label.includes(
    "해신"
  )
);

const audit = auditPastedDraft(
  "테스트 카페입니다. ".repeat(20),
  { brandName: "테스트", region: "서울" },
  "blog"
);
for (const issue of audit.issues) {
  assert.ok(!/해신/.test(`${issue.label} ${issue.message}`));
}

const ctx = buildBriclogContextScore(
  { brandName: "A", region: "B", topic: "C" },
  {
    sections: [{ heading: "h", body: "본문 ".repeat(80) }],
    _meta: { publishReady: true, llmDeliveryPolish: true },
  },
  {}
);
assert.equal(ctx.improvementHint, CUSTOMER_POLISH_READY_HINT);
assert.equal(ctx.qualityGate, null);

const ready = resolvePublishReadiness({
  _meta: {
    publishReady: true,
    goldenGate: { score: 88, haeshin: { score: 90 } },
    llmDeliveryPolish: true,
  },
});
assert.ok(!ready.hint?.includes("해신"));

console.log("OK: customer-quality-display");
