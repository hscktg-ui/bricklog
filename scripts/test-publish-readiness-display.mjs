/**
 * 발행 준비 단일 상태 SSOT
 */
import assert from "node:assert/strict";
import { resolvePublishReadiness } from "@/lib/product/publishReadinessDisplay.js";
import { formatFeedbackAppliedCustomerLine } from "@/lib/feedback/feedbackAppliedDisplay.js";
import { ensureBlogDisplayPack } from "@/lib/generation/ensureBlogDisplayPack.js";

const sqvReadyPack = {
  sections: [{ body: "a" }],
  _meta: {
    sqv: { score: 90, grade: "A", publishReady: true, reasons: [] },
  },
};
assert.equal(resolvePublishReadiness(sqvReadyPack).status, "ready");

const sqvPolishPack = {
  sections: [{ body: "a" }],
  _meta: {
    sqv: { score: 78, grade: "B", publishReady: false, reasons: ["length_tier_under"] },
  },
};
assert.equal(resolvePublishReadiness(sqvPolishPack).status, "polishing");

const readyPack = {
  sections: [{ body: "a" }],
  _meta: {
    publishReady: true,
    humanWritingDelivery: { humanReady: false, displayReady: false },
  },
};
assert.equal(resolvePublishReadiness(readyPack).status, "ready");

const polishingPack = {
  sections: [{ body: "a" }],
  _meta: { humanWritingDelivery: { humanReady: false, displayReady: true } },
};
assert.equal(resolvePublishReadiness(polishingPack).status, "polishing");

const bothReady = {
  sections: [{ body: "a" }],
  _meta: { humanWritingDelivery: { humanReady: true, displayReady: true } },
};
assert.equal(resolvePublishReadiness(bothReady).status, "ready");

const feedbackLine = formatFeedbackAppliedCustomerLine(
  ["remove_repetition"],
  ""
);
assert.ok(feedbackLine.includes("반복"));

const aligned = ensureBlogDisplayPack(
  {
    sections: [{ heading: "h", body: "본문 내용이 충분히 길고 구체적인 설명을 담습니다." }],
    representativeTitle: "제목",
    _meta: { displayReady: true, humanWritingDelivery: { humanReady: false } },
  },
  { brandName: "테스트", region: "서울", topic: "주제" }
);
assert.notEqual(aligned._meta?.displayReady, true);
assert.notEqual(aligned._meta?.publishReady, true);

console.log("OK: publish-readiness-display");
