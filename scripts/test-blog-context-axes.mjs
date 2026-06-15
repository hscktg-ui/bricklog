/**
 * 블로그 맥락 축 — 조사·주제·화자가 팩 분석과 연동되는지 검증
 */
import assert from "node:assert/strict";
import {
  buildBlogContextAxes,
  stampBlogContextAxesMeta,
} from "../lib/product/blogContextAxesEngine.js";
import { buildBriclogContextScore } from "../lib/publicTest/briclogContextScore.js";

const richInput = {
  brandName: "플로라하우스",
  region: "강남",
  topic: "여름 웨딩 부케 추천",
  mainKeyword: "여름 웨딩 부케",
  researchFacts: [
    { fact: "장미와 수국을 섞은 부케가 여름 웨딩에서 인기가 많다", source: "naver" },
    { fact: "강남 플로라하우스는 맞춤 부케 상담을 30분 단위로 진행한다", source: "official" },
    { fact: "밝은 톤의 리본과 그린 포인트가 사진에 잘 어울린다", source: "reviews" },
    { fact: "예식 두 시간 전 픽업이 가능하다", source: "faq" },
    { fact: "수국은 습도에 강해 실내 예식에도 안정적이다", source: "naver" },
    { fact: "플로라하우스는 예약제로 운영된다", source: "official" },
    { fact: "웨딩 촬영용 미니 부케 옵션이 있다", source: "reviews" },
    { fact: "여름철에는 밝은 색 계열을 많이 선택한다", source: "naver" },
  ],
  researchFactCount: 8,
  v4Speaker: "brand_editor",
};

const thinPack = {
  title: "여름 웨딩 부케 추천",
  representativeTitle: "여름 웨딩 부케 추천",
  sections: [
    {
      heading: "여름 웨딩 부케",
      body: "좋은 내용입니다. 이용해 보세요.",
    },
  ],
  _meta: {},
};

const thinAxes = buildBlogContextAxes(thinPack, richInput, {
  grounded: { ok: false, rate: 0.2 },
});
const thinTrust = thinAxes.axes.find((a) => a.id === "trust");
const thinTopic = thinAxes.axes.find((a) => a.id === "topic");
assert.ok(thinTrust.score < 68, `thin trust should be low: ${thinTrust.score}`);
assert.ok(thinTopic.score < 72, `thin topic should be low: ${thinTopic.score}`);

const richPack = {
  title: "강남 플로라하우스 여름 웨딩 부케 추천",
  representativeTitle: "강남 플로라하우스 여름 웨딩 부케 추천",
  sections: [
    {
      heading: "여름 웨딩 부케, 어떤 꽃이 잘 맞을까",
      body:
        "강남 플로라하우스에서 상담할 때 많이 묻는 질문이 여름 웨딩 부케 선택이다. " +
        "장미와 수국을 섞은 부케가 여름 웨딩에서 인기가 많고, 밝은 톤의 리본과 그린 포인트가 사진에 잘 어울린다. " +
        "수국은 습도에 강해 실내 예식에도 안정적이라 예식장 조건을 크게 타지 않는다.",
    },
    {
      heading: "예약·픽업은 이렇게",
      body:
        "플로라하우스는 예약제로 운영되며 맞춤 부케 상담을 30분 단위로 진행한다. " +
        "예식 두 시간 전 픽업이 가능하고, 웨딩 촬영용 미니 부케 옵션도 있다. " +
        "여름철에는 밝은 색 계열을 많이 선택한다는 점도 참고하면 된다.",
    },
    {
      heading: "정리",
      body:
        "강남에서 여름 웨딩 부케를 고민한다면, 확인된 꽃 조합과 픽업 시간을 먼저 맞춰 보는 것이 좋다. " +
        "플로라하우스는 상담 때 예식 시간과 드레스 톤까지 함께 본다.",
    },
  ],
  _meta: {
    researchFactsWoven: true,
    wovenFactCount: 5,
    researchGroundedHumanPack: true,
  },
};

const richAxes = buildBlogContextAxes(richPack, richInput, {
  grounded: { ok: true, rate: 0.72 },
});
const richTrust = richAxes.axes.find((a) => a.id === "trust");
const richTopic = richAxes.axes.find((a) => a.id === "topic");
const richSpeaker = richAxes.axes.find((a) => a.id === "speaker");
assert.ok(richTrust.score >= richTopic.score - 15 || richTrust.score >= 72, richTrust.score);
assert.ok(richTopic.score >= 72, `rich topic: ${richTopic.score}`);
assert.ok(richSpeaker?.score >= 68, `speaker axis: ${richSpeaker?.score}`);
assert.equal(richTrust.label, "조사·근거");

const stamped = stampBlogContextAxesMeta(richPack, richInput);
assert.ok(stamped._meta.contextAxes?.axes?.length >= 5);

const ui = buildBriclogContextScore(richInput, stamped, {
  relevance: { rate: 0.82 },
  infoCount: 8,
  grounded: { ok: true, rate: 0.72 },
});
const uiTrust = ui.axes.find((a) => a.id === "trust");
assert.equal(uiTrust.label, "조사·근거");
assert.ok(ui.checks.infoUnits >= 8);
assert.ok(uiTrust.score >= thinTrust.score + 10, "rich vs thin trust gap");

const STRESSLESS_INPUT = {
  brandName: "에이스침대",
  region: "경기도 용인",
  topic: "스트레스리스 다이닝체어 STRESSLESS MINT LB D200",
  mainKeyword: "스트레스리스 다이닝체어 STRESSLESS",
  industry: "가구",
  storeFeatures: "프랜차이즈 쇼룸, 스트레스리스 체어 전시",
  researchFacts: [
    "스트레스리스 제로지 모드·리클라이닝 각도 조절",
    "STRESSLESS MINT LB D200 좌판 쿠션 밀도",
    "프랜차이즈 쇼룸에서 모델별 좌판·등받이 비교",
  ],
};

const { buildForcedMissionProsePack } = await import(
  "../lib/product/missionProseRouteEngine.js"
);
process.env.BRICLOG_MISSION = "true";
const stresslessPack = buildForcedMissionProsePack(STRESSLESS_INPUT);
const stresslessAxes = buildBlogContextAxes(stresslessPack, STRESSLESS_INPUT, {
  grounded: { ok: true, rate: 0.72 },
});
const stressTopic = stresslessAxes.axes.find((a) => a.id === "topic");
const stressTrust = stresslessAxes.axes.find((a) => a.id === "trust");
const stressSpeaker = stresslessAxes.axes.find((a) => a.id === "speaker");
assert.ok(stressTopic.score >= 72, `stressless topic: ${stressTopic.score}`);
assert.ok(stressTrust.score >= 68, `stressless trust: ${stressTrust.score}`);
assert.ok(stressSpeaker.score >= 68, `stressless speaker: ${stressSpeaker.score}`);

console.log("OK: blog context axes — research/topic/speaker from pack analysis");
