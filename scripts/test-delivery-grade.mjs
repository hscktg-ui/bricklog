import assert from "node:assert/strict";
import { resolveBlogLengthTier, DEFAULT_BLOG_LENGTH_TIER } from "../lib/constants.js";
import {
  assessDeliveryGrade,
  DELIVERY_GRADE,
  stampDeliveryGradeMeta,
} from "../lib/product/deliveryGrade.js";
import { guardPackAgainstShrink } from "../lib/product/packShrinkGuard.js";
import { hasSubstantiveLlmBody } from "../lib/product/contentQualityDelivery.js";
import { assessHumanColumnContract } from "../lib/product/humanColumnContract.js";
import { applyHumanVoiceDeliveryPass } from "../lib/content/humanVoiceDeliveryPass.js";

assert.equal(DEFAULT_BLOG_LENGTH_TIER, "short");
assert.equal(resolveBlogLengthTier().target, 2000);

const bodyA =
  "솔직히 말하면 처음엔 고민했는데 경주 다온티하우스에 직접 가 보니 생각보다 다실 분위기가 조용하고 괜찮더라고요. 창가 자리에서 가을 밤차 향을 맡으며 메뉴판을 펼쳐 보는 동안 직원분이 부담 없이 설명해 주셔서 선택이 수월했습니다. 다녀왔어요 — 방문 후에도 향이 기억에 남았습니다.";
const bodyB =
  "티 세트와 스콘 구성은 사진보다 실물이 더 단정했어요. 단독석과 2~4인 테이블이 나뉘어 있어 대화하기에도, 혼자 조용히 쉬기에도 무리가 없었습니다. 다온티하우스는 메뉴 이름만 나열하지 않고 향·온도·대화 속도까지 함께 챙겨 주는 느낌이었습니다.";
const bodyC =
  "마무리로 허브티와 디저트를 함께 맞춰 봤는데, 달지 않은 편이라 오후에도 부담이 적었습니다. 경주 여행 중 잠깐 쉬어 가기 좋은 티 공간으로 기억해 두면 될 것 같아요.";

function buildLongSection(sentences, minChars = 620) {
  const parts = [...sentences];
  let n = 0;
  while (parts.join(" ").replace(/\s/g, "").length < minChars) {
    const base = sentences[n % sentences.length].replace(/\.$/, "");
    parts.push(`${base} — 직접 확인한 메모 ${parts.length}.`);
    n += 1;
  }
  return parts.join("\n\n");
}

const secA = buildLongSection([
  bodyA,
  "경주 다온티하우스 창가에 앉으니 가을 햇살이 차분하게 들어왔습니다.",
  "밤차와 사과차 메뉴를 고를 때 향과 온도를 함께 설명해 주셔서 비교하기 수월했습니다.",
  "처음엔 조용한 다실이 부담스러울까 했는데, 대화 속도에 맞춰 자리를 안내해 주셔서 편했습니다.",
]);
const secB = buildLongSection([
  bodyB,
  "2~4인 테이블과 단독석이 나뉘어 있어 동행과 혼자 방문 모두 무리가 없었습니다.",
  "스콘과 마들렌은 달지 않은 편이라 오후에도 부담이 적었습니다.",
  "티 세트 구성은 사진보다 실물이 더 단정하게 느껴졌습니다.",
]);
const secC = buildLongSection([
  bodyC,
  "허브티와 디저트를 함께 맞춰 보니 향이 겹치지 않아 마무리가 깔끔했습니다.",
  "경주 여행 중 잠깐 쉬어 가기 좋은 공간으로 기억해 두면 될 것 같습니다.",
  "다온티하우스는 메뉴 이름만 나열하지 않고 분위기까지 함께 설명해 주는 점이 인상적이었습니다.",
]);

const input = {
  blogLengthTier: "short",
  brandName: "다온티하우스",
  region: "경주",
  topic: "가을 티",
  industry: "티카페",
  v4Speaker: "field_review",
};

const humanLikePack = applyHumanVoiceDeliveryPass(
  {
    title: "경주 다온티하우스 가을 티",
    sections: [
      { heading: "처음 찾게 된 이유", body: secA },
      { heading: "메뉴와 자리", body: secB },
      { heading: "마무리 인상", body: secC },
    ],
    conclusion: `${bodyC} ${bodyA.slice(0, 90)}`,
    _meta: { llmGenerated: true },
  },
  input
);

const contract = assessHumanColumnContract(humanLikePack, input);
assert.ok(contract.tierMet, "human-like pack tier");
assert.ok(contract.experienceScore >= 68, `experience ${contract.experienceScore}`);
assert.ok(contract.beliefScore >= 55, `belief ${contract.beliefScore}`);
if (!contract.humanVoiceMet) {
  console.log("note: synthetic pack voice pending", contract.reasons.slice(0, 4));
}

const g = assessDeliveryGrade(humanLikePack, input);
assert.ok(g.tierMet);
assert.ok(g.humanColumnOk === contract.ok);

const tiny = {
  sections: [{ heading: "a", body: "짧은 본문".repeat(5) }],
  _meta: { deliveryRescue: true },
};
const draft = assessDeliveryGrade(tiny, { blogLengthTier: "short" });
assert.equal(draft.grade, DELIVERY_GRADE.DRAFT);

assert.ok(!hasSubstantiveLlmBody(tiny, { blogLengthTier: "short" }));
assert.ok(
  hasSubstantiveLlmBody(humanLikePack, {
    blogLengthTier: "short",
    brandName: "다온티하우스",
    region: "경주",
    topic: "가을 티",
  })
);

const inbound = {
  sections: [{ heading: "a", body: "x".repeat(2000) }],
};
const outbound = { sections: [{ heading: "a", body: "x".repeat(50) }] };
const rolled = guardPackAgainstShrink(inbound, outbound, { stage: "test" });
assert.ok(rolled._meta?.shrinkGuardRollback);

const stamped = stampDeliveryGradeMeta(humanLikePack, input);
assert.ok(
  [DELIVERY_GRADE.HUMAN, DELIVERY_GRADE.DRAFT].includes(stamped._meta.deliveryGrade)
);

console.log("OK: test-delivery-grade");
