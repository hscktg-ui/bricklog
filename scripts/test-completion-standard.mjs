/**
 * 베타 완성도 SSOT — belief·grounding hard block, completeDraft
 */
import assert from "node:assert/strict";
import {
  assessCompletionReadiness,
  COMPLETION_HARD_FAIL_REASONS,
} from "../lib/product/completionStandard.js";
import {
  deliverBlogDespiteGate,
  isSoftInformationGateFailure,
} from "../lib/product/deliverySoftPass.js";
import { applyHumanBeliefGate } from "../lib/content/humanBeliefGate.js";
import { expandSubstantiveBlogPack } from "../lib/qa/substantiveBlogStarter.js";

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드",
  industry: "가구/침대",
  blogLengthTier: "medium",
  researchFacts: [{ fact: "3월 행사" }, { fact: "각도 조절" }],
};

const adPackRaw = {
  title: "모션베드",
  sections: [
    { heading: "소개", body: "템퍼는 최고입니다. 지금 바로 문의하세요." },
    { heading: "특징", body: "제품은 이렇습니다. 많은 분들께 추천드립니다." },
    { heading: "마무리", body: "놓치지 마세요. 지금 바로 문의해 주세요." },
  ],
};

assert.ok(
  COMPLETION_HARD_FAIL_REASONS.has("human_belief_low"),
  "human_belief_low is hard fail"
);

const readiness = assessCompletionReadiness(adPackRaw, input);
assert.ok(!readiness.displayReady, "ad pack should not be display ready");
assert.ok(
  readiness.reasons.includes("human_belief_low"),
  "should flag human_belief_low"
);

const preview = deliverBlogDespiteGate(input, adPackRaw, {
  reasons: ["human_belief_low"],
});
assert.equal(preview, null, "thin ad pack blocked by not_publishable");

const editorialLike = {
  title: "평택 모션베드",
  sections: [
    {
      heading: "왜 바꾸려 하는가",
      body: "허리가 아파 침대부터 손댔습니다. 매장에서 직접 누워보고 각도를 조절해 봤고, 3월까지 행사 조건을 확인했습니다.",
    },
    {
      heading: "매장에서 볼 것",
      body: "평택 매장에서는 모델별 쿠션감과 리모컨 반응을 비교할 수 있습니다. 각도 조절 범위를 직접 확인하는 편이 좋습니다.",
    },
    {
      heading: "비교할 때 막히는 지점",
      body: "모션 기능만 보다는 프레임 높이와 매트리스 호환을 같이 봐야 합니다. 설치 공간과 콘센트 위치도 미리 재면 상담이 빨라집니다.",
    },
    {
      heading: "정리",
      body: "3월 행사 기간과 적용 모델을 매장 안내로 확인한 뒤, 설치 일정까지 같이 점검하면 됩니다.",
    },
  ],
  _meta: { humanBelief: { ok: false, score: 61, issues: ["field_smell_low"] } },
};

const beliefPreview = deliverBlogDespiteGate(input, editorialLike, {
  reasons: ["topic_dominance_low", "human_belief_low"],
});
assert.ok(
  beliefPreview?.blogContent?.sections?.length,
  "belief-only fail should still deliver editorial preview"
);
assert.equal(beliefPreview.blogContent._meta.deliveryPreview, true);
assert.equal(beliefPreview.blogContent._meta.completeDraft, false);

assert.ok(
  !isSoftInformationGateFailure({ reasons: ["human_belief_low"] }),
  "belief fail is not soft information gate"
);

const ctx = { brandName: input.brandName, region: input.region };
const goodPack = applyHumanBeliefGate(
  expandSubstantiveBlogPack(input, ctx, input, { minChars: 2800, channel: "blog" }),
  { ...input, researchFacts: input.researchFacts }
);

const goodReady = assessCompletionReadiness(goodPack, input);
assert.ok(
  goodReady.displayReady || goodReady.humanBelief?.ok,
  "field-like pack should pass belief or be close",
  goodReady
);

console.log("OK: completion standard — hard block belief, completeDraft SSOT");
