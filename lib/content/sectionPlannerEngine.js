/**
 * CRITICAL FIX — Section Planner (Writer 이전, 카테고리 무관)
 * 사용자 입력 → 서로 다른 정보 단위·섹션 계획
 */
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { topicWritingFacet } from "@/lib/content/topicFacetEngine";
import { buildWriterSectionBody } from "@/lib/content/sectionWriterBodies";

/** @typedef {{ id: string, label: string, headingSuffix: string, keywords: string[] }} InfoSlot */

/** 카테고리별 정보 단위 (각 섹션은 서로 다른 정보) */
const CATEGORY_SLOTS = {
  furniture: [
    { id: "lineup", label: "제품군", headingSuffix: "라인업·구성", keywords: ["제품", "라인업", "모델", "매트리스", "프레임"] },
    { id: "feature", label: "기능", headingSuffix: "기능·체험 포인트", keywords: ["기능", "모션", "각도", "지지", "체험"] },
    { id: "buy", label: "구매 포인트", headingSuffix: "비교·선택 기준", keywords: ["비교", "선택", "쿠션", "체압", "예산"] },
    { id: "promo", label: "프로모션", headingSuffix: "행사·할인", keywords: ["할인", "행사", "프로모", "혜택", "증정"] },
    { id: "install", label: "설치", headingSuffix: "설치·배송", keywords: ["설치", "배송", "조립", "일정"] },
    { id: "as", label: "AS", headingSuffix: "A/S·교환", keywords: ["AS", "교환", "보증", "사후"] },
    { id: "visit", label: "방문", headingSuffix: "방문·예약", keywords: ["방문", "예약", "매장", "상담"] },
  ],
  flower: [
    { id: "product", label: "상품", headingSuffix: "상품 구성", keywords: ["꽃", "구성", "다발", "박스", "시즌"] },
    { id: "price", label: "가격대", headingSuffix: "가격·예산", keywords: ["가격", "비용", "예산"] },
    { id: "reserve", label: "예약", headingSuffix: "예약·주문", keywords: ["예약", "주문", "문의"] },
    { id: "pack", label: "포장", headingSuffix: "포장·메시지", keywords: ["포장", "리본", "카드"] },
    { id: "delivery", label: "배송", headingSuffix: "배송·픽업", keywords: ["배송", "픽업", "당일"] },
  ],
  hospital: [
    { id: "care", label: "진료", headingSuffix: "진료·검사", keywords: ["진료", "검사", "치료", "상담"] },
    { id: "reserve", label: "예약", headingSuffix: "예약·접수", keywords: ["예약", "접수", "문의"] },
    { id: "flow", label: "방문 흐름", headingSuffix: "방문·진료 흐름", keywords: ["흐름", "접수", "대기", "안내"] },
    { id: "prep", label: "방문 준비", headingSuffix: "방문 전 준비", keywords: ["준비", "서류", "주의"] },
    { id: "treatment", label: "치료", headingSuffix: "치료·관리", keywords: ["치료", "관리", "회복"] },
  ],
  cafe: [
    { id: "menu", label: "메뉴", headingSuffix: "메뉴·시그니처", keywords: ["메뉴", "음료", "디저트", "브런치"] },
    { id: "space", label: "공간", headingSuffix: "공간·분위기", keywords: ["공간", "좌석", "테라스", "분위기"] },
    { id: "price", label: "가격", headingSuffix: "가격·구성", keywords: ["가격", "세트", "할인"] },
    { id: "visit", label: "방문", headingSuffix: "방문·예약", keywords: ["방문", "예약", "웨이팅", "주차"] },
    { id: "location", label: "위치", headingSuffix: "위치·동선", keywords: ["위치", "역", "주차", "생활권"] },
  ],
  carwash: [
    { id: "service", label: "서비스", headingSuffix: "서비스 종류", keywords: ["세차", "코팅", "디테일링", "광택"] },
    { id: "price", label: "가격", headingSuffix: "가격·패키지", keywords: ["가격", "패키지", "할인"] },
    { id: "process", label: "작업 과정", headingSuffix: "작업·소요 시간", keywords: ["과정", "소요", "단계", "코스"] },
    { id: "benefit", label: "혜택", headingSuffix: "혜택·멤버십", keywords: ["혜택", "멤버십", "쿠폰", "행사"] },
    { id: "care", label: "관리", headingSuffix: "차량 관리 팁", keywords: ["관리", "유지", "주기"] },
  ],
  construction: [
    { id: "scope", label: "시공 범위", headingSuffix: "시공·공사 범위", keywords: ["시공", "공사", "범위", "공종"] },
    { id: "process", label: "진행 과정", headingSuffix: "진행·일정", keywords: ["일정", "공정", "착공", "준공"] },
    { id: "material", label: "자재·품질", headingSuffix: "자재·품질 기준", keywords: ["자재", "품질", "시공사"] },
    { id: "quote", label: "견적", headingSuffix: "견적·계약", keywords: ["견적", "계약", "비용", "예산"] },
    { id: "as", label: "하자·A/S", headingSuffix: "하자·사후관리", keywords: ["하자", "보수", "A/S", "보증"] },
  ],
  lawyer: [
    { id: "field", label: "분야", headingSuffix: "전문 분야", keywords: ["분야", "전문", "사건", "자문"] },
    { id: "process", label: "절차", headingSuffix: "상담·진행 절차", keywords: ["절차", "상담", "소송", "진행"] },
    { id: "fee", label: "비용", headingSuffix: "비용·수임", keywords: ["비용", "수임", "성공보수"] },
    { id: "prep", label: "준비", headingSuffix: "상담 전 준비", keywords: ["준비", "서류", "증거"] },
    { id: "visit", label: "문의", headingSuffix: "문의·예약", keywords: ["문의", "예약", "방문"] },
  ],
  saas: [
    { id: "problem", label: "문제 정의", headingSuffix: "해결하려는 문제", keywords: ["문제", "병목", "한계", "Pain"] },
    { id: "feature", label: "기능", headingSuffix: "핵심 기능", keywords: ["기능", "자동", "연동", "API"] },
    { id: "use", label: "활용법", headingSuffix: "활용·도입 방법", keywords: ["활용", "도입", "사용", "적용"] },
    { id: "effect", label: "도입 효과", headingSuffix: "기대 효과", keywords: ["효과", "절감", "개선", "ROI"] },
    { id: "compare", label: "비교", headingSuffix: "비교 포인트", keywords: ["비교", "차별", "대안"] },
  ],
  marketing: [
    { id: "goal", label: "목표", headingSuffix: "캠페인·목표", keywords: ["목표", "KPI", "전환", "노출"] },
    { id: "channel", label: "채널", headingSuffix: "채널·매체", keywords: ["채널", "매체", "광고", "SNS"] },
    { id: "process", label: "진행", headingSuffix: "진행·일정", keywords: ["일정", "제작", "집행"] },
    { id: "offer", label: "혜택", headingSuffix: "혜택·조건", keywords: ["혜택", "할인", "프로모"] },
    { id: "result", label: "성과", headingSuffix: "성과·지표", keywords: ["성과", "리포트", "개선"] },
  ],
  education: [
    { id: "curriculum", label: "커리큘럼", headingSuffix: "과정·커리큘럼", keywords: ["커리큘럼", "과정", "단계", "레벨"] },
    { id: "target", label: "대상", headingSuffix: "수강 대상", keywords: ["대상", "레벨", "연령"] },
    { id: "method", label: "수업 방식", headingSuffix: "수업·운영 방식", keywords: ["수업", "방식", "온라인", "오프라인"] },
    { id: "price", label: "수강료", headingSuffix: "수강료·혜택", keywords: ["수강료", "할인", "등록"] },
    { id: "visit", label: "상담", headingSuffix: "상담·등록", keywords: ["상담", "등록", "체험", "방문"] },
  ],
  public: [
    { id: "service", label: "서비스", headingSuffix: "제공 서비스", keywords: ["서비스", "업무", "민원"] },
    { id: "eligibility", label: "대상", headingSuffix: "대상·자격", keywords: ["대상", "자격", "신청"] },
    { id: "process", label: "절차", headingSuffix: "신청·처리 절차", keywords: ["절차", "신청", "접수", "처리"] },
    { id: "hours", label: "운영", headingSuffix: "운영·문의", keywords: ["운영", "시간", "휴무", "문의"] },
    { id: "location", label: "위치", headingSuffix: "위치·방문", keywords: ["위치", "오시는", "주차"] },
  ],
  default: [
    { id: "overview", label: "개요", headingSuffix: "알아보는 이유", keywords: ["개요", "소개", "특징"] },
    { id: "offer", label: "제품·서비스", headingSuffix: "제품·서비스 구성", keywords: ["제품", "서비스", "구성", "종류"] },
    { id: "compare", label: "비교", headingSuffix: "비교·선택 기준", keywords: ["비교", "선택", "차이", "기준"] },
    { id: "process", label: "이용 과정", headingSuffix: "이용·진행 과정", keywords: ["이용", "진행", "절차", "방법"] },
    { id: "pricing", label: "가격·혜택", headingSuffix: "가격·혜택·조건", keywords: ["가격", "비용", "혜택", "할인"] },
    { id: "visit", label: "방문·문의", headingSuffix: "방문·예약·문의", keywords: ["방문", "예약", "문의", "연락"] },
    { id: "faq", label: "FAQ", headingSuffix: "자주 묻는 질문", keywords: ["FAQ", "질문", "궁금"] },
    { id: "aftercare", label: "사후", headingSuffix: "사후·관리·A/S", keywords: ["A/S", "관리", "사후", "지원"] },
  ],
};

const EXPANSION_EXTRAS = [
  { id: "faq_extra", label: "FAQ", headingSuffix: "자주 묻는 질문", keywords: ["질문", "FAQ"] },
  { id: "compare_extra", label: "비교", headingSuffix: "추가 비교 포인트", keywords: ["비교", "차이"] },
  { id: "usecase", label: "활용", headingSuffix: "활용·적용 사례", keywords: ["사례", "활용", "적용"] },
  { id: "checklist", label: "체크", headingSuffix: "방문·구매 전 체크", keywords: ["체크", "확인", "준비"] },
];

/**
 * 카테고리 무관 분류
 */
export function resolveCategoryKey(ctx = {}, input = {}) {
  const blob = `${input.industry || ctx.industryLabel || ""} ${input.topic || input.mainKeyword || ctx.topic || ""}`.toLowerCase();
  if (/가구|침대|매트리스|모션|furniture|bed|mattress|템퍼/.test(blob)) return "furniture";
  if (/꽃|플라워|flower|플로리스트/.test(blob)) return "flower";
  if (/병원|의원|치과|한의|clinic|hospital/.test(blob)) return "hospital";
  if (/카페|coffee|베이커리|브런치|디저트/.test(blob)) return "cafe";
  if (/세차|카워시|디테일링|코팅/.test(blob)) return "carwash";
  if (/건설|시공|인테리어|리모델|공사/.test(blob)) return "construction";
  if (/변호|법률|법무|로펌/.test(blob)) return "lawyer";
  if (/saas|ai|software|플랫폼|솔루션/.test(blob)) return "saas";
  if (/마케팅|광고|대행|퍼포먼스/.test(blob)) return "marketing";
  if (/학원|교육|과외|어학|academy/.test(blob)) return "education";
  if (/공공|관공|시청|구청|주민센터/.test(blob)) return "public";
  return "default";
}

/**
 * @param {object} ctx
 * @param {object} input
 */
export function buildSectionPlan(ctx = {}, input = {}) {
  const categoryKey = resolveCategoryKey(ctx, input);
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  const region = String(ctx.region || input.region || "").trim();
  const topic =
    topicWritingFacet({ ...input, ...ctx }) ||
    String(input.topic || input.mainKeyword || ctx.topic || "매장 안내")
      .trim()
      .split(/[,，]/)[0]
      ?.trim() ||
    "매장 안내";
  const slots = CATEGORY_SLOTS[categoryKey] || CATEGORY_SLOTS.default;

  const sections = slots.map((slot) => ({
    id: slot.id,
    infoUnit: slot.label,
    keywords: slot.keywords,
    heading: region
      ? `${region} ${brand} ${topic} — ${slot.headingSuffix}`
      : `${brand} ${topic} — ${slot.headingSuffix}`,
  }));

  return {
    categoryKey,
    brand,
    region,
    topic,
    sections,
    expansionExtras: EXPANSION_EXTRAS.map((slot) => ({
      ...slot,
      heading: `${brand} ${topic} — ${slot.headingSuffix}`,
    })),
  };
}

function slotBody(slot, plan, input = {}) {
  const { brand, region, topic } = plan;
  const topicObj = koreanObjectParticle(topic);
  const regionBit = region ? `${region} ` : "";
  const bodies = {
    lineup: `${brand} ${topic} 관련 제품군은 라인업·구성·가격대별로 나뉩니다. ${regionBit}매장·공식 안내에서 모델별 차이를 비교해 보세요.`,
    feature: `${topic}의 핵심 기능·특징은 직접 체험하거나 상담으로 확인하는 편이 정확합니다. ${brand} 기준 안내를 참고하세요.`,
    buy: `${topicObj} 고를 때 예산·사용 목적·비교 항목을 먼저 정리하면 상담이 빨라집니다.`,
    promo: `행사·할인이 있다면 대상·기간·조건·증정을 ${regionBit}매장에서 들은 대로 정리했어요.`,
    install: `설치·배송 일정, 당일 준비 사항, 기존 제품 처리 여부를 계약 전에 확인하세요.`,
    as: `교환·A/S·보증 범위는 구매 전에 문서·안내로 확인하는 것이 좋습니다.`,
    visit: `${regionBit}방문 동선·주차·영업 시간·예약 가능 여부를 미리 보면 당일 이용이 수월합니다.`,
    product: `${brand} 상품 구성·시즌 추천·맞춤 옵션을 문의 시 안내받을 수 있습니다.`,
    price: `가격대·패키지·할인 조건은 시기·구성에 따라 달라질 수 있어 최신 안내를 확인하세요.`,
    reserve: `예약·주문 방법, 소요 시간, 변경·취소 규정을 미리 확인하세요.`,
    pack: `포장·메시지 카드·수령 방법은 목적(선물·행사)에 맞게 선택할 수 있습니다.`,
    delivery: `배송·픽업 가능 지역·시간대·당일 처리 여부를 ${regionBit}기준으로 확인하세요.`,
    care: `진료·검사·치료 범위는 개인 상태에 따라 달라질 수 있어 공식 안내·상담을 기준으로 하세요.`,
    flow: `접수·대기·상담·안내 순서를 알아두면 방문 부담이 줄어듭니다.`,
    prep: `방문 전 준비 서류·복용 정보·궁금한 점을 정리해 가면 상담이 효율적입니다.`,
    treatment: `치료·관리 계획은 전문의 안내에 따르며, 과장·단정 표현은 피하는 것이 좋습니다.`,
    menu: `대표 메뉴·시그니처·세트 구성을 확인하고, 알레르기·원두 선택 등 문의 사항을 정리해 두세요.`,
    space: `좌석·단체석·테라스 등 공간 특성은 방문 목적(모임·작업)에 맞게 고르세요.`,
    service: `${brand} ${topic} 서비스 종류·코스·소요 시간을 비교해 보세요.`,
    process: `이용·작업·진행 단계별로 무엇이 포함되는지 확인하면 오해가 줄어듭니다.`,
    benefit: `멤버십·쿠폰·시즌 혜택이 있다면 적용 조건을 함께 확인하세요.`,
    scope: `시공·공사 범위, 포함·제외 항목, 일정을 견적서 기준으로 정리하세요.`,
    material: `사용 자재·시공 방식·품질 기준은 계약 전에 명확히 하는 것이 좋습니다.`,
    quote: `견적·계약·중도금·잔금 일정을 서면으로 확인하세요.`,
    field: `전문 분야·유사 사례 경험 여부를 상담 시 확인하세요.`,
    fee: `수임료·성공보수·추가 비용 발생 조건을 미리 안내받으세요.`,
    problem: `${topic}로 해결하려는 업무 병목을 먼저 정의하면 도입 판단이 쉬워집니다.`,
    feature: `핵심 기능·연동·자동화 범위를 실제 업무 흐름에 맞춰 비교하세요.`,
    use: `도입·활용 단계(시범·전사)와 담당 역할을 정리하면 실행이 수월합니다.`,
    effect: `기대 효과는 수치·사례가 확인 가능한 범위에서 검토하세요.`,
    compare: `대안 대비 차별점·비용·운영 부담을 표로 정리해 비교해 보세요.`,
    goal: `캠페인 목표·KPI·기간을 먼저 정하면 채널 선택이 명확해집니다.`,
    channel: `매체·채널별 역할(인지·전환)을 나눠 설계하는 편이 효율적입니다.`,
    result: `성과 지표·리포트 주기·개선 포인트를 사전에 합의하세요.`,
    curriculum: `과정 단계·수업 시간·레벨 구분을 확인하고 본인 목표와 맞는지 비교하세요.`,
    target: `수강 대상·선수 지식·목표(시험·취업)를 기준으로 과정을 고르세요.`,
    method: `온·오프라인·소수정예·그룹 등 수업 방식 차이를 확인하세요.`,
    overview: `${regionBit}${brand} ${topic} — 어떤 분들이 찾는지, 왜 비교하는지부터 정리합니다.`,
    offer: `${brand}에서 제공하는 ${topic} 관련 구성·옵션을 현장에서 본 대로 짚어 봤어요.`,
    pricing: `가격·혜택·적용 조건은 시기·구성에 따라 달라질 수 있어 최신 안내를 확인하세요.`,
    faq: `자주 묻는 질문: 비용·소요 시간·예약·준비물은 ${brand}${region ? ` ${region}` : ""} 안내로 최종 확인하세요.`,
    faq_extra: `Q. ${topic} 비용은 어떻게 확인하나요? A. ${brand} 공식·매장 안내 기준입니다. Q. 예약이 필요한가요? A. 시기·상품에 따라 다릅니다.`,
    usecase: `${topic}를 ${regionBit}생활권에서 이용하는 경우, 동선·시간·준비물을 미리 보면 편합니다.`,
    checklist: `방문·구매 전: 일정, 예산, 비교 항목, 문의할 질문 목록을 정리해 두세요.`,
  };
  if (bodies[slot.id]) return bodies[slot.id];
  return `${brand} ${slot.infoUnit || slot.label} — ${regionBit}${topic} 관련 안내는 확인 가능한 범위에서 ${brand} 기준으로 정리했습니다.`;
}

function buildFaqBlock(plan, input = {}) {
  const { brand, topic, region } = plan;
  const regionBit = region ? `${region} ` : "";
  return [
    `Q. ${topic} 비용·조건은 어떻게 확인하나요? A. ${brand} ${regionBit}공식·매장 안내 기준으로 확인하세요.`,
    `Q. 예약·방문이 필요한가요? A. 시기·상품에 따라 다르므로 사전 문의를 권합니다.`,
    `Q. 준비물·비교 항목이 있나요? A. 예산, 일정, 본인 우선순위(가격·품질·위치)를 정리해 가면 상담이 빨라집니다.`,
  ].join("\n\n");
}

function buildCompareBlock(plan, input = {}) {
  const { brand, topic } = plan;
  return [
    `${topic}를 비교할 때는 가격만이 아니라 포함 범위·일정·사후 지원·체험 가능 여부를 함께 봐야 합니다.`,
    `${brand} 선택 시 동일 조건에서 타 옵션과 차이(구성·기간·혜택)를 표로 정리해 보는 것도 도움이 됩니다.`,
  ].join("\n\n");
}

export function renderPlannedSectionBody(slot, plan, input = {}, depth = 0) {
  return buildWriterSectionBody(slot, plan, input, depth);
}

function angleParagraph(slot, plan, depth = 0) {
  const { brand, topic, region } = plan;
  const regionBit = region ? `${region} ` : "";
  const angles = [
    `${topic}를 ${regionBit}에서 알아볼 때는 본인 상황(예산·일정·우선순위)을 먼저 정리하는 편이 좋습니다.`,
    `동일 ${slot.infoUnit || "항목"}이라도 시기·구성·행사에 따라 조건이 달라질 수 있어 ${brand} 안내를 최종 확인하세요.`,
    `처음 방문·문의 시 궁금한 점을 메모해 가면 상담 시간을 줄일 수 있습니다.`,
  ];
  return angles[(depth + String(slot.id).length) % angles.length];
}

function regionContextLine(plan) {
  const { region, brand, topic } = plan;
  if (!region) return `${brand} ${topic} 관련 최신 조건은 문의 시 안내받을 수 있습니다.`;
  return `${region} 생활권에서 ${topic}를 알아볼 때는 방문 동선·주차·영업 시간도 함께 확인하세요.`;
}

/**
 * @param {ReturnType<typeof buildSectionPlan>} plan
 * @param {object} pack
 * @param {string} channel
 */
export function scoreSectionPlanCoverage(plan, pack, channel = "blog") {
  const text = channel === "blog"
    ? [
        pack?.title,
        ...(pack?.sections || []).map((s) => `${s.heading}\n${s.body}`),
        pack?.conclusion,
      ].join("\n")
    : [
        pack?.title,
        pack?.shortNotice,
        pack?.detailBody,
        pack?.body,
        pack?.hook,
      ].join("\n");

  const allSlots = [...plan.sections, ...plan.expansionExtras];
  const covered = [];
  const missing = [];

  for (const slot of allSlots) {
    const hit =
      slot.keywords.some((k) => text.includes(k)) ||
      (slot.heading && text.includes(slot.heading.slice(0, 12)));
    if (hit) covered.push(slot);
    else missing.push(slot);
  }

  const ratio = allSlots.length ? covered.length / allSlots.length : 1;
  return {
    ok: ratio >= 0.5,
    ratio,
    covered,
    missing,
    total: allSlots.length,
  };
}

import { formatPerspectiveStructureForPlanner } from "@/lib/content/perspectiveEngine";

/** Writer 프롬프트용 — PLAN 출력 아님, 내부 섹션별 정보 단위 안내 */
export function formatSectionPlanForPrompt(ctx = {}, input = {}) {
  const plan = buildSectionPlan(ctx, input);
  const lines = plan.sections.map(
    (s, i) =>
      `${i + 1}. 소제목 방향: 「${s.heading.replace(plan.brand, "").trim()}」 — ${s.infoUnit} 관련 실제 정보 3~5문장`
  );
  const perspectiveBlock = formatPerspectiveStructureForPlanner(ctx, input);
  return `【내부 기획 참고 · 사용자 출력 금지】카테고리=${plan.categoryKey}
【관점 구조】
${perspectiveBlock}
${lines.join("\n")}
내부 식별자(lineup_x0 등)·괄호 ID·플래너 메타는 절대 본문에 쓰지 마세요. 각 소제목은 발행용 제목+완성 문단만.`;
}

export { EXPANSION_EXTRAS };
