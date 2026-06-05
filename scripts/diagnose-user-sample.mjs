/**
 * 사용자 샘플(평택·템퍼·모션베드) — 게이트 진단
 */
import { scoreHumanBelief } from "../lib/product/humanBeliefEngine.js";
import { scoreChecklistVoice } from "../lib/product/checklistVoiceEngine.js";
import { assessCompletionReadiness, isPreviewWithholdFailure } from "../lib/product/completionStandard.js";
import { deliverBlogDespiteGate } from "../lib/product/deliverySoftPass.js";
import { scoreSignatureWritingCompliance } from "../lib/content/signatureWritingGate.js";
import { applyEditorialPackGate } from "../lib/content/editorialPackGate.js";
import { applyHumanBeliefGate } from "../lib/content/humanBeliefGate.js";

const SAMPLE = {
  title: "평택에서 모션베드를 바라보는 시선, 템퍼 모션베드 체험 전 알아둘 것",
  sections: [
    {
      heading: "평택 템퍼, 브랜드 이해",
      body: `템퍼 모션베드를 브랜드 시선에서 정리했습니다.
평택 맥락에서 읽으면 흐름이 분명해집니다.
템퍼는 이 선택과 관련해 어떤 포지션인지 공식 홈페이지·매장 안내로 확인하는 것이 좋습니다.
브랜드별 강점(품질·서비스·체험·사후 지원)을 비교할 때 기준이 되는 항목을 미리 정리해 두세요.
평택에서 템퍼를 검색할 때는 공식 채널·인증 매장 정보를 우선하세요.
확인되지 않은 스펙·가격·효과는 단정하지 말고 안내 가능 범위만 참고하세요.`,
    },
    {
      heading: "템퍼 모션베드, 제품군·구성",
      body: `템퍼 — 제품군 관련 안내는 공식·매장 채널 기준으로 확인하는 것이 좋습니다.
제품군 비교 시 평택 매장·온라인 조건을 함께 보면 누락을 줄일 수 있습니다.
확인되지 않은 수치·효과·가격은 단정하지 말고 안내 가능 범위만 참고하세요.
제품군 관련 궁금한 점은 상담 전에 목록으로 정리해 가면 효율적입니다.`,
    },
    {
      heading: "라인업 — 방문·상담 때 확인할 것",
      body: `템퍼 관련 라인업은 엔트리·미드·프리미엄 등 가격대별로 나뉩니다.
모델별 구성·체험 가능 여부는 매장마다 다를 수 있어 사전 확인이 필요합니다.
라인업 비교 시 포함 항목(본체·설치·옵션)을 견적서로 받으세요.
인기 모델은 행사 기간 재고 변동이 있을 수 있습니다.`,
    },
    {
      heading: "가격 비교 포인트",
      body: `모션베드를 가격은 모델·구성·행사·카드 혜택에 따라 달라질 수 있어 매장 견적이 가장 정확합니다.
견적 받을 때 본체·설치·배송·옵션·할인을 항목별로 분리해 요청하세요.
최종 결제 금액과 포함·제외 범위를 문서로 확인해 두세요.
행사 전후 가격 차이가 있는지도 함께 비교해 보세요.`,
    },
    {
      heading: "행사·기간",
      body: `행사 기간·대상 모델·적용 조건을 매장·공식 안내로 확인하세요.
할인율·카드·제휴 조건은 중복 적용 여부를 확인하세요.
헤드·다리 각도 조절, 무중력(제로지) 모드 등은 라인업마다 지원 범위가 다릅니다.`,
    },
    {
      heading: "할인, 이용 전에 먼저 볼 것",
      body: `모션베드을 고를 때 예산 상한·수면 자세·방 크기·알레르기 민감도를 먼저 정리하세요.
행사·카드 할인 적용 시 최종 결제 금액과 포함 항목을 견적서로 확인하세요.`,
    },
    {
      heading: "증정품 — 방문·상담 때 확인할 것",
      body: `증정품·사은품 구성·수령 조건을 계약 전에 확인하세요.
설치 후 각도·소음·리모컨 작동을 당일 점검하고 이상 시 즉시 매장에 연락하세요.`,
    },
    {
      heading: "모션 기능 비교 포인트",
      body: `헤드·다리 각도 조절 범위는 라인업마다 다릅니다.
템퍼 모션베드 라인업은 엔트리·미드·프리미엄 등 가격대별로 나뉘는 경우가 많습니다.`,
    },
  ],
  conclusion:
    "템퍼 평택에서 모션베드를 검토 중이라면, 매장 방문·체험·프로모션 조건을 직접 비교해 보시길 권합니다.",
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

const full = [
  SAMPLE.title,
  ...SAMPLE.sections.map((s) => `${s.heading}\n${s.body}`),
  SAMPLE.conclusion,
].join("\n\n");

const belief = scoreHumanBelief(full, input);
const checklist = scoreChecklistVoice(full, SAMPLE);
const sig = scoreSignatureWritingCompliance(SAMPLE, { input });
const ready = assessCompletionReadiness(SAMPLE, input);

console.log("=== BEFORE editorial gate ===");
console.log("humanBelief:", belief);
console.log("checklistVoice:", checklist);
console.log("signature:", { ok: sig.ok, issues: sig.issues?.slice(0, 5) });
console.log("completion:", ready);

const edited = applyEditorialPackGate(SAMPLE, { input });
const editedFull = [
  edited.title,
  ...edited.sections.map((s) => `${s.heading}\n${s.body}`),
  edited.conclusion,
].join("\n\n");
console.log("\n=== AFTER editorial gate ===");
console.log("sections:", edited.sections?.length);
console.log("humanBelief:", scoreHumanBelief(editedFull, input));
console.log("checklistVoice:", scoreChecklistVoice(editedFull, edited));
console.log("completion:", assessCompletionReadiness(edited, input));

const gated = applyHumanBeliefGate(edited, { input, ...input });
const gatedFull = [
  gated.title,
  ...gated.sections.map((s) => `${s.heading}\n${s.body}`),
  gated.conclusion,
].join("\n\n");
console.log("\n=== AFTER narrative belief pass (humanBeliefGate) ===");
console.log("humanBelief:", scoreHumanBelief(gatedFull, input, gated));
console.log("narrativeApplied:", gated._meta?.humanBelief?.narrativeBeliefPass);
console.log("completion:", assessCompletionReadiness(gated, input));

const gate = {
  reasons: ["topic_dominance_low", "information_yield_low", "human_belief_low"],
};
console.log("\n=== UI delivery (Temper scenario) ===");
console.log("previewWithhold:", isPreviewWithholdFailure(gate, edited, input));
const delivered = deliverBlogDespiteGate(input, edited, gate);
console.log(
  "deliverBlogDespiteGate:",
  delivered?.blogContent?.sections?.length || 0,
  "sections",
  delivered?.blogContent?._meta?.deliveryPreview ? "(preview)" : ""
);
if (!delivered?.blogContent?.sections?.length) {
  throw new Error("Temper editorial pack must preview-deliver");
}
