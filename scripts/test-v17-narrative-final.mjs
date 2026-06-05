/**
 * Mission 최종 패스 — expansion 오염 후 editorial+narrative (v17 말미와 동일)
 */
import assert from "node:assert/strict";
import { applyEditorialPackGate } from "../lib/content/editorialPackGate.js";
import { applyHumanBeliefGate } from "../lib/content/humanBeliefGate.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "../lib/product/humanBeliefEngine.js";

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

/** 사용자가 붙여넣은 expansion 오염본 (5섹션) */
const userPolluted = {
  title: "평택에서 모션베드를 바라보는 시선, 템퍼 모션베드 체험 전 알아둘 것",
  sections: [
    {
      heading: "왜 모션베드 특별할인을 찾게 되는가",
      body: `평택 템퍼 매장에서 모션베드 관련 모델을 직접 누워보고 비교할 수 있습니다.
매트리스 단독·프레임+매트리스·모션 베이스 조합에 따라 체험 포인트가 달라집니다.
보증 범위(스프링·모터·리모컨 등)와 제외 항목을 구분해 안내받으세요.`,
    },
    {
      heading: "모션베드 특별할인, 왜 지금 검색하게 되는지",
      body: `평택 매장에서 모델별 스펙·구성 차이를 표로 정리해 받으면 비교가 수월합니다.
행사 기간·대상 모델·할인율·증정품은 매장 안내 기준으로 최종 확인하세요.
배송 가능 지역·층간 이동·엘리베이터 사용 가능 여부를 주문 전에 확인하세요.`,
    },
    {
      heading: "비교할 때 막히는 지점",
      body: `평택에서 방문·체험·비교를 전제로 글을 읽는 경우.
동일 브랜드라도 매장·행사에 따라 체험 가능 모델이 다를 수 있어 사전 확인이 필요합니다.
템퍼 매장·행사 조건은 공식·매장 안내 기준으로 확인.`,
    },
    {
      heading: "평택 템퍼, 선택지로 볼 때",
      body: `헤드·다리 각도 조절, 무중력(제로지) 모드 등은 라인업마다 지원 범위가 다릅니다.
설치 후 각도·소음·리모컨 작동을 당일 점검하고 이상 시 즉시 매장에 연락하세요.
모션베드을 고를 때 예산 상한·수면 자세·방 크기·알레르기 민감도를 먼저 정리하세요.`,
    },
    {
      heading: "평택에서 방문·결정 전에",
      body: `누웠을 때 체압 분산·지지감·뒤척임 시 소음·진동 전달을 10분 이상 체험해 보세요.
인기 모델은 행사 초반에 재고가 소진될 수 있어 예약·재고 문의를 권합니다.
교환·반품 가능 기간·조건(개봉·사용 흔적)은 계약서·안내 문서로 확인하세요.`,
    },
  ],
  conclusion:
    "평택 템퍼 매장에서 체험·행사 조건을 본인 기준에 맞춰 정리해 보시면 됩니다.",
};

const ctx = { input, ...input };
const edited = applyEditorialPackGate(userPolluted, ctx);
const out = applyHumanBeliefGate(edited, ctx);
const full = getBlogFullText(out);
const belief = scoreHumanBelief(full, input, out);

assert.ok(!/방문·체험·비교를\s*전제로/.test(full), "meta reader phrase removed");
assert.ok(!/공식·매장\s*안내\s*기준/.test(full), "prompt-like fact removed");
assert.ok(!/모션베드을/.test(full), "particle grammar fixed");
assert.ok(out._meta?.humanBelief?.narrativeBeliefPass, "narrative pass applied");
assert.ok(
  belief.score >= HUMAN_BELIEF_MIN_SCORE,
  `belief ${belief.score} should reach ${HUMAN_BELIEF_MIN_SCORE}+`,
  belief
);
assert.ok(/누워보|직접|허리|매장에\s*갔/.test(full), "field narrative in body");

console.log("OK: mission final pass (user polluted) — belief", belief.score);
