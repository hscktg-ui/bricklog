/**
 * Regression: feedback surgical path preserves pack structure and avoids full regen.
 */
import assert from "node:assert/strict";
import {
  applyFeedbackSurgicalRewrite,
  polishFeedbackRewritePack,
  shouldFeedbackFullRegen,
} from "../lib/feedback/feedbackBlogDelivery.js";

const title = "광교 에이스침대 로얄에이스 매트리스 라인업을 살펴보는 이야기";
const body =
  "아침에 일어나면 허리가 먼저 아픈 사람들이 있다. 침대를 바꿀지 말지부터 고민이 길어진다. " +
  "매트리스 층별 차이를 알아두면 선택이 수월해진다.";

const pack = {
  title,
  representativeTitle: title,
  sections: [
    { heading: "왜 매트리스가 중요한가", body },
    { heading: "라인업 비교", body: body + " 라인업별 특징을 정리했다." },
    { heading: "방문 전 체크", body: "매장 방문 전 체크리스트를 적어두면 좋다." },
  ],
  conclusion: "궁금한 점은 매장에서 직접 누워보는 것이 가장 확실하다.",
  _meta: {
    salvageDeliveryFinalized: true,
    rewriteCount: 0,
    topicSeed: "로얄에이스 매트리스",
  },
};

const ctx = {
  brandName: "에이스침대",
  region: "광교",
  input: {
    brandName: "에이스침대",
    region: "광교",
    topic: "로얄에이스 매트리스 라인업 소개",
    mainKeyword: "로얄에이스 매트리스",
  },
};

assert.equal(
  shouldFeedbackFullRegen({
    intents: ["reduce_keyword_repeat"],
    tagIds: ["repeat"],
    scope: "all",
    memo: "키워드 반복 줄여줘",
    existingPack: pack,
  }),
  false,
  "repeat tag should use surgical path"
);

assert.equal(
  shouldFeedbackFullRegen({
    intents: ["restructure_sections"],
    tagIds: [],
    scope: "all",
    memo: "",
    existingPack: pack,
  }),
  true,
  "restructure intent should trigger full regen"
);

const { pack: surgical } = applyFeedbackSurgicalRewrite(
  pack,
  "키워드 반복 줄여줘",
  ctx,
  "all",
  ["repeat"],
  ctx.input
);

assert.ok(surgical.sections?.length >= 3, "surgical rewrite keeps sections");
assert.equal(surgical._meta?.feedbackSurgical, true);
assert.equal(surgical._meta?.feedbackPolished, true);

const full = [
  surgical.title,
  ...(surgical.sections || []).map((s) => s.body),
  surgical.conclusion,
]
  .filter(Boolean)
  .join("\n");
const corrupt = (full.match(/[가-힣]이곳[가-힣]/g) || []).length;
assert.equal(corrupt, 0, `no 이곳 corruption after surgical polish: ${full.slice(0, 120)}`);

const polished = polishFeedbackRewritePack(pack, ctx, ctx.input);
assert.ok(polished._meta?.feedbackPolished);
assert.ok(polished.sections?.length >= 3);

console.log("OK: feedback surgical delivery preserves quality pipeline");
