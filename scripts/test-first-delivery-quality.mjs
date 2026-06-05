/**
 * 첫 노출 품질 — displayReady / passOutput / 미리보기 차단
 */
import assert from "node:assert/strict";
import { assessFirstDeliveryQuality } from "../lib/product/firstDeliveryQuality.js";
import { deliverBlogDespiteGate } from "../lib/product/deliverySoftPass.js";
import { MIN_RESEARCH_FACTS_FOR_FIRST_WRITE } from "../lib/product/researchReadiness.js";
import { MIN_INFORMATION_UNITS } from "../lib/content/informationUnitEngine.js";

assert.ok(MIN_RESEARCH_FACTS_FOR_FIRST_WRITE >= 8);
assert.equal(MIN_INFORMATION_UNITS, 20);

const input = {
  brandName: "더건강하개",
  region: "용인",
  topic: "수제 간식",
  v4Speaker: "real_use",
};

const good = {
  sections: [
    {
      body: "강아지 간식을 고를 때 원재료를 먼저 보게 됐다. 왜 그런지 궁금해져서 직접 들러 보니 진열이 깔끔했고, 솔직히 인상이 좋았다.",
    },
    {
      body: "현장에서 확인한 성분 표가 차분했고, 비교할 때는 성분·가격을 같이 봤다.",
    },
    {
      body: "처음 키우는 분에게 맞는 편이다. 예산과 일정만 정리해 두면 상담이 빨라진다.",
    },
  ],
  _meta: {
    humanEditorPass: true,
    editorV95Pass: true,
    personaAligned: true,
    humanBelief: { ok: true, score: 78 },
    contentQuality: { humanEditorPass: true, score: 80 },
  },
};

const goodAssess = assessFirstDeliveryQuality(good, input);
assert.ok(goodAssess.displayReady, goodAssess);

const bad = {
  ...good,
  _meta: { humanEditorPass: false, contentQuality: { humanEditorPass: false } },
};
assert.equal(assessFirstDeliveryQuality(bad, input).displayReady, false);

const preview = deliverBlogDespiteGate(
  input,
  bad,
  { reasons: ["post_write_quality_failed"] },
  {}
);
assert.ok(preview?.blogContent?.sections?.length, "substantive pack previews to UI");
assert.equal(preview.blogContent._meta?.deliveryPreview, false);
assert.equal(preview.blogContent._meta?.completeDraft, true);

console.log("OK: first delivery quality");
