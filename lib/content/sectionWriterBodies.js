/**
 * Section Planner → Writer: 슬롯별 실제 정보 문장 (3~5개, 내부 ID 미노출)
 */
import { buildCoverageAreaBody } from "@/lib/content/knowledgeCoverageEngine";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";

/** slot.id → 구체 정보 포인트 (발행용 문장) */
const SLOT_INFO_POINTS = {
  lineup: (p) => [
    `${p.brand} ${p.topic} 라인업은 엔트리·미드·프리미엄 등 가격대별로 나뉘는 경우가 많습니다.`,
    `매트리스 단독·프레임+매트리스·모션 베이스 조합에 따라 체험 포인트가 달라집니다.`,
    `${p.regionBit}매장에서 모델별 스펙·구성 차이를 표로 정리해 받으면 비교가 수월합니다.`,
    `동일 브랜드라도 매장·행사에 따라 체험 가능 모델이 다를 수 있어 사전 확인이 필요합니다.`,
  ],
  feature: (p) => [
    `헤드·다리 각도 조절, 무중력(제로지) 모드 등은 라인업마다 지원 범위가 다릅니다.`,
    `누웠을 때 체압 분산·지지감·뒤척임 시 소음·진동 전달을 10분 이상 체험해 보세요.`,
    `파트너와 함께 체험할 경우 모션 작동 시 전달감도 함께 확인하는 것이 좋습니다.`,
    `리모컨·앱 연동 등 조작 방식은 매장에서 직접 테스트해 보시길 권합니다.`,
  ],
  buy: (p) => [
    `${p.topicObj} 고를 때 예산 상한·수면 자세·방 크기·알레르기 민감도를 먼저 정리하세요.`,
    `단단함·지지감·온열감 선호는 사람마다 달라 '인기 모델'만으로 결정하기 어렵습니다.`,
    `프레임 높이·헤드보드 유무·수납 옵션은 방 동선과 맞는지 함께 보세요.`,
    `행사·카드 할인 적용 시 최종 결제 금액과 포함 항목을 견적서로 확인하세요.`,
  ],
  promo: (p) => [
    `행사 기간·대상 모델·할인율·증정품은 매장 안내 기준으로 최종 확인하세요.`,
    `일부 혜택은 특정 카드·제휴·선착순 조건이 있을 수 있습니다.`,
    `프로모션과 A/S·교환 정책이 동시에 적용되는지 구매 전에 질문하세요.`,
    `인기 모델은 행사 초반에 재고가 소진될 수 있어 예약·재고 문의를 권합니다.`,
  ],
  install: (p) => [
    `설치 소요 시간은 보통 1~2시간 내외이나 모델·현장 상황에 따라 달라집니다.`,
    `배송 가능 지역·층간 이동·엘리베이터 사용 가능 여부를 주문 전에 확인하세요.`,
    `설치 전 통로 확보·기존 침대·매트리스 처리(회수·철거) 방법을 정리해 두세요.`,
    `설치 후 각도·소음·리모컨 작동을 당일 점검하고 이상 시 즉시 매장에 연락하세요.`,
  ],
  as: (p) => [
    `교환·반품 가능 기간·조건(개봉·사용 흔적)은 계약서·안내 문서로 확인하세요.`,
    `보증 범위(스프링·모터·리모컨 등)와 제외 항목을 구분해 안내받으세요.`,
    `A/S 접수 채널(매장·고객센터)과 처리 기간을 미리 알아두면 편합니다.`,
    `행사 제품의 사후 지원이 동일한지 프로모션 조건과 함께 확인하세요.`,
  ],
  visit: (p) => [
    `${p.regionBit}매장 주차·대중교통·영업 시간·휴무일을 방문 전에 확인하세요.`,
    `체험만 하려면 예약이 필요한 매장이 있어 전화·온라인 예약 가능 여부를 보세요.`,
    `상담 대기 시간이 긴 주말·행사 기간에는 평일 방문이 수월한 경우가 많습니다.`,
    `체험 시 수면 자세·불편 요소를 메모해 가면 상담 효율이 올라갑니다.`,
  ],
  faq: (p) => [
    `Q. ${p.topic} 비용은 어떻게 되나요? A. 모델·구성·행사에 따라 달라 ${p.brand} 매장 견적이 정확합니다.`,
    `Q. 설치·배송은 며칠 걸리나요? A. 지역·재고·일정에 따라 다르며 계약 시 확정일을 받으세요.`,
    `Q. 체험 없이 구매해도 되나요? A. 가능하지만 10~15분 이상 체험을 권합니다.`,
    `Q. 행사 할인은 언제까지인가요? A. 매장·공식 안내의 적용 기간을 확인하세요.`,
  ],
  compare: (p) => [
    `가격만 비교하면 설치비·배송비·회수비 등이 빠져 최종 비용이 달라질 수 있습니다.`,
    `동일 가격대에서도 레이어 구성·모션 기능·보증 기간이 다를 수 있습니다.`,
    `${p.brand}와 타 브랜드를 비교할 때는 체험 항목(지지감·소음·조작)을 동일하게 맞추세요.`,
    `견적서 항목별(본체·설치·옵션·할인)로 나눠 받으면 숨은 비용을 줄일 수 있습니다.`,
  ],
};

function planContext(plan, input = {}) {
  const merged = {
    ...input,
    topic: plan.topic || input.topic || input.mainKeyword,
    mainKeyword: plan.topic || input.mainKeyword || input.topic,
    brandName: plan.brand || input.brandName,
    region: plan.region || input.region,
  };
  return deriveTopicWritingContext(merged);
}

function baseSlotId(slot) {
  return String(slot?.id || "")
    .replace(/_x\d+$/i, "")
    .replace(/_block$/i, "");
}

export function countSubstantiveSentences(text) {
  const paras = String(text || "")
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 12);
  if (paras.length >= 3) return paras.length;
  return String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 12).length;
}

export function isSubstantiveSectionBody(body, minSentences = 3, minChars = 100) {
  const t = String(body || "").trim();
  if (t.replace(/\s/g, "").length < minChars) return false;
  return countSubstantiveSentences(t) >= minSentences;
}

/**
 * Writer 단계 본문 — 최소 3문장의 실제 정보
 */
export function buildWriterSectionBody(slot, plan, input = {}, depth = 0) {
  if (slot?.id && slot?.label && slot?.headingSuffix) {
    return buildCoverageAreaBody(slot, input, depth);
  }
  const p = planContext(plan, input);
  const id = baseSlotId(slot);
  const factory = SLOT_INFO_POINTS[id];
  let points = factory ? factory(p) : [
    `${p.brand} ${p.topic} 관련 ${slot.infoUnit || "안내"}는 매장·공식 채널 기준으로 확인하세요.`,
    `${p.regionBit}방문·문의 전 예산·일정·비교 항목을 정리하면 상담이 빨라집니다.`,
    `확인되지 않은 스펙·가격·효과는 단정하지 말고 안내 가능 범위만 참고하세요.`,
    `행사·재고·설치 일정은 시기에 따라 달라질 수 있습니다.`,
  ];
  const start = depth % Math.max(1, points.length - 2);
  points = points.slice(start, start + 5);
  while (points.length < 3) {
    points.push(
      `${p.brand}에서 추가로 궁금한 점은 상담 시 확인하세요.`
    );
  }
  return points.slice(0, 5).join("\n\n");
}
