/**
 * Narrative belief pass — FAQ → field narrative, belief 72+
 */
import assert from "node:assert/strict";
import { applyEditorialPackGate } from "../lib/content/editorialPackGate.js";
import { applyHumanBeliefGate } from "../lib/content/humanBeliefGate.js";
import { applyNarrativeBeliefPass } from "../lib/content/narrativeBeliefPass.js";
import { HUMAN_BELIEF_MIN_SCORE } from "../lib/product/humanBeliefEngine.js";

const SAMPLE = {
  title: "평택에서 모션베드를 바라보는 시선, 템퍼 모션베드 체험 전 알아둘 것",
  sections: [
    {
      heading: "평택 템퍼, 브랜드 이해",
      body: `허리가 불편해 평택 템퍼 매장에 직접 누워보고 각도를 조절해 봤어요.
템퍼 모션베드를 브랜드 시선에서 정리했습니다.
확인되지 않은 스펙·가격·효과는 단정하지 말고 안내 가능 범위만 참고하세요.`,
    },
    {
      heading: "가격 비교 포인트",
      body: `모션베드를 가격은 모델·구성·행사·카드 혜택에 따라 달라질 수 있어 매장 견적이 가장 정확합니다.
견적 받을 때 본체·설치·배송·옵션·할인을 항목별로 분리해 요청하세요.`,
    },
    {
      heading: "라인업 — 방문·상담 때 확인할 것",
      body: `누웠을 때 체압 분산·지지감·뒤척임 시 소음·진동 전달을 10분 이상 체험해 보세요.
인기 모델은 행사 초반에 재고가 소진될 수 있어 예약·재고 문의를 권합니다.`,
    },
    {
      heading: "행사·기간",
      body: `행사 기간·대상 모델·적용 조건을 매장·공식 안내로 확인하세요.
헤드·다리 각도 조절, 무중력(제로지) 모드 등은 라인업마다 지원 범위가 다릅니다.`,
    },
    {
      heading: "할인, 이용 전에 먼저 볼 것",
      body: `모션베드을 고를 때 예산 상한·수면 자세·방 크기·알레르기 민감도를 먼저 정리하세요.
지역명은 자연스럽게만 사용.`,
    },
    {
      heading: "증정품 — 방문·상담 때 확인할 것",
      body: `증정품·사은품 구성·수령 조건을 계약 전에 확인하세요.
평택 근처·동네 방문 맥락.`,
    },
    {
      heading: "모션 기능 비교 포인트",
      body: `헤드·다리 각도 조절 범위는 라인업마다 다릅니다.
템퍼 고유 입력 기반.`,
    },
    {
      heading: "모션 기능 비교 포인트 2",
      body: `교환·반품 가능 기간·조건(개봉·사용 흔적)은 계약서·안내 문서로 확인하세요.
설치 후 각도·소음·리모컨 작동을 당일 점검하고 이상 시 즉시 매장에 연락하세요.`,
    },
  ],
  conclusion: "템퍼 평택에서 모션베드를 검토 중이라면, 매장 방문·체험·프로모션 조건을 직접 비교해 보시길 권합니다.",
};

const input = {
  brandName: "템퍼",
  region: "평택",
  topic: "모션베드특별할인",
  industry: "가구/침대",
  blogLengthTier: "medium",
  researchFacts: [
    { fact: "3월까지 모션베드 행사" },
    { fact: "평택 매장 체험 예약 가능" },
  ],
};

const ctx = { input, ...input };
const edited = applyEditorialPackGate(SAMPLE, ctx);
const narrated = applyNarrativeBeliefPass(edited, ctx);
const gated = applyHumanBeliefGate(narrated, ctx);

const belief = gated._meta?.humanBelief;
assert.ok(belief, "humanBelief meta");
assert.ok(
  belief.score >= HUMAN_BELIEF_MIN_SCORE,
  `belief should reach ${HUMAN_BELIEF_MIN_SCORE}+ after narrative pass, got ${belief.score}`,
  belief
);
assert.ok(belief.ok, "belief ok", belief);

const body = gated.sections.map((s) => s.body).join("\n");
assert.ok(!/지역명은\s*자연스럽게/.test(body), "meta leak stripped");
assert.ok(!/고유\s*입력\s*기반/.test(body), "meta leak stripped");
assert.ok(/누워보|직접|허리|매장/.test(body), "field narrative present");

console.log("OK: narrative belief pass — Temper sample belief", belief.score);
console.log("  fieldHits:", belief.fieldHits, "issues:", (belief.issues || []).join(", "));
