/**
 * BRICLOG KNOWLEDGE COVERAGE ENGINE
 * 검색 전 최소 20개 정보 영역 — 주제 분해 후 조사·칼럼 재구성
 */
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { resolveResearchCategoryKey } from "@/lib/research/searchExpansionEngine";
import { topicWritingFacet, topicRaw, deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

export const MIN_COVERAGE_AREAS = 20;
export const KNOWLEDGE_COVERAGE_STAGE_LABEL = "정보 영역 설계 중…";

function coverageContext(input = {}) {
  const writeCtx = deriveTopicWritingContext(input);
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topicRawVal = topicRaw(input) || "이용";
  const topic = topicWritingFacet(input);
  return {
    brand,
    region,
    topic,
    topicRaw: topicRawVal,
    topicFacet: topic,
    regionBit: region ? `${region} ` : "",
    topicObj: koreanObjectParticle(topic),
    readerPhrase: writeCtx.topic || writeCtx.readerPhrase || "이 선택",
  };
}

/** @typedef {{ id: string, label: string, headingSuffix: string, keywords: string[], group: string }} CoverageAreaDef */

/** @type {Record<string, CoverageAreaDef[]>} */
const CATEGORY_COVERAGE = {
  furniture: [
    { id: "brand", label: "브랜드", headingSuffix: "브랜드 이해", keywords: ["브랜드", "포지션"], group: "brand" },
    { id: "product_line", label: "제품군", headingSuffix: "제품군·구성", keywords: ["제품군", "구성", "시리즈"], group: "product" },
    { id: "lineup", label: "라인업", headingSuffix: "라인업·모델", keywords: ["라인업", "모델", "Ergo"], group: "product" },
    { id: "price", label: "가격", headingSuffix: "가격·견적", keywords: ["가격", "비용", "견적"], group: "purchase" },
    { id: "event", label: "행사", headingSuffix: "행사·기간", keywords: ["행사", "기간", "이벤트"], group: "purchase" },
    { id: "discount", label: "할인", headingSuffix: "할인·혜택", keywords: ["할인", "프로모", "혜택"], group: "purchase" },
    { id: "gift", label: "증정품", headingSuffix: "증정·카드 혜택", keywords: ["증정", "카드", "제휴"], group: "purchase" },
    { id: "motion_feature", label: "모션 기능", headingSuffix: "모션·각도 조절", keywords: ["모션", "각도", "전동"], group: "feature" },
    { id: "zero_gravity", label: "무중력 자세", headingSuffix: "무중력·제로지", keywords: ["무중력", "제로지", "Zero-G"], group: "feature" },
    { id: "pressure_distribution", label: "체압 분산", headingSuffix: "체압·지지감", keywords: ["체압", "지지", "분산"], group: "feature" },
    { id: "sleep_posture", label: "수면 자세", headingSuffix: "수면 자세·체험", keywords: ["수면", "자세", "뒤척임"], group: "feature" },
    { id: "mattress_combo", label: "매트리스 조합", headingSuffix: "매트리스·조합", keywords: ["매트리스", "조합", "레이어"], group: "product" },
    { id: "frame_type", label: "프레임 종류", headingSuffix: "프레임·베이스", keywords: ["프레임", "베이스", "헤드보드"], group: "product" },
    { id: "install", label: "설치", headingSuffix: "설치·준비", keywords: ["설치", "조립", "준비"], group: "ops" },
    { id: "delivery", label: "배송", headingSuffix: "배송·일정", keywords: ["배송", "출고", "일정"], group: "ops" },
    { id: "as", label: "AS", headingSuffix: "A/S·보증", keywords: ["AS", "보증", "사후"], group: "ops" },
    { id: "exchange", label: "교환", headingSuffix: "교환·반품", keywords: ["교환", "반품", "환불"], group: "ops" },
    { id: "trial_zone", label: "체험존", headingSuffix: "매장 체험", keywords: ["체험", "체험존", "누워"], group: "visit" },
    { id: "visit_reserve", label: "방문 예약", headingSuffix: "방문·예약", keywords: ["예약", "방문", "상담"], group: "visit" },
    { id: "parking", label: "주차", headingSuffix: "주차·동선", keywords: ["주차", "동선", "영업"], group: "visit" },
    { id: "faq", label: "FAQ", headingSuffix: "자주 묻는 질문", keywords: ["FAQ", "질문", "문의"], group: "faq" },
    { id: "compare", label: "비교 포인트", headingSuffix: "비교·차이", keywords: ["비교", "차이", "대안"], group: "compare" },
    { id: "purchase_checklist", label: "구매 체크포인트", headingSuffix: "구매 전 확인", keywords: ["체크", "확인", "선택"], group: "purchase" },
  ],
  flower: [
    { id: "brand", label: "브랜드", headingSuffix: "브랜드·스타일", keywords: ["브랜드", "꽃집"], group: "brand" },
    { id: "product", label: "상품", headingSuffix: "상품 구성", keywords: ["상품", "다발", "박스"], group: "product" },
    { id: "flower_types", label: "꽃 종류", headingSuffix: "꽃 종류·의미", keywords: ["꽃", "종류", "장미"], group: "product" },
    { id: "seasonal", label: "계절 상품", headingSuffix: "시즌·추천", keywords: ["계절", "시즌", "추천"], group: "product" },
    { id: "packaging", label: "포장", headingSuffix: "포장·메시지", keywords: ["포장", "리본", "카드"], group: "ops" },
    { id: "reserve", label: "예약", headingSuffix: "예약·주문", keywords: ["예약", "주문"], group: "visit" },
    { id: "delivery", label: "배송", headingSuffix: "배송·픽업", keywords: ["배송", "픽업", "당일"], group: "ops" },
    { id: "care", label: "보관법", headingSuffix: "관리·보관", keywords: ["관리", "보관", "수명"], group: "feature" },
    { id: "price_range", label: "가격대", headingSuffix: "가격·예산", keywords: ["가격", "예산", "비용"], group: "purchase" },
    { id: "gift_message", label: "선물·메시지", headingSuffix: "선물·메시지 카드", keywords: ["선물", "메시지", "카드"], group: "purchase" },
    { id: "event", label: "행사", headingSuffix: "행사·할인", keywords: ["행사", "할인"], group: "purchase" },
    { id: "visit", label: "방문", headingSuffix: "매장 방문", keywords: ["방문", "매장"], group: "visit" },
    { id: "compare", label: "비교", headingSuffix: "구성 비교", keywords: ["비교", "차이"], group: "compare" },
    { id: "faq", label: "FAQ", headingSuffix: "자주 묻는 질문", keywords: ["FAQ", "질문"], group: "faq" },
    { id: "same_day", label: "당일 처리", headingSuffix: "당일·긴급", keywords: ["당일", "긴급"], group: "ops" },
  ],
  hospital: [
    { id: "brand", label: "병원", headingSuffix: "병원·진료과", keywords: ["병원", "의원", "진료"], group: "brand" },
    { id: "care", label: "진료", headingSuffix: "진료·상담", keywords: ["진료", "상담"], group: "product" },
    { id: "exam", label: "검사", headingSuffix: "검사·진단", keywords: ["검사", "진단", "촬영"], group: "product" },
    { id: "treatment", label: "치료", headingSuffix: "치료·관리", keywords: ["치료", "관리", "시술"], group: "product" },
    { id: "reserve", label: "예약", headingSuffix: "예약·접수", keywords: ["예약", "접수"], group: "visit" },
    { id: "cost", label: "비용", headingSuffix: "비용·보험", keywords: ["비용", "보험", "견적"], group: "purchase" },
    { id: "caution", label: "주의사항", headingSuffix: "주의·금기", keywords: ["주의", "금기", "부작용"], group: "feature" },
    { id: "prep", label: "방문 준비", headingSuffix: "방문 전 준비", keywords: ["준비", "서류", "금식"], group: "visit" },
    { id: "flow", label: "진료 흐름", headingSuffix: "접수·대기·흐름", keywords: ["흐름", "대기", "접수"], group: "ops" },
    { id: "hours", label: "운영", headingSuffix: "운영·휴무", keywords: ["운영", "시간", "휴무"], group: "visit" },
    { id: "parking", label: "주차", headingSuffix: "주차·오시는 길", keywords: ["주차", "위치"], group: "visit" },
    { id: "specialty", label: "전문 분야", headingSuffix: "전문·특화", keywords: ["전문", "특화"], group: "brand" },
    { id: "followup", label: "사후 관리", headingSuffix: "경과·재방문", keywords: ["경과", "재방", "관리"], group: "ops" },
    { id: "faq", label: "FAQ", headingSuffix: "자주 묻는 질문", keywords: ["FAQ", "질문"], group: "faq" },
    { id: "compare", label: "선택 기준", headingSuffix: "병원 선택 기준", keywords: ["비교", "선택"], group: "compare" },
  ],
  carwash: [
    { id: "brand", label: "업체", headingSuffix: "세차장 소개", keywords: ["세차", "업체"], group: "brand" },
    { id: "service", label: "서비스", headingSuffix: "서비스 종류", keywords: ["서비스", "코스", "세차"], group: "product" },
    { id: "process", label: "작업 공정", headingSuffix: "작업·공정", keywords: ["공정", "과정", "단계"], group: "feature" },
    { id: "duration", label: "소요시간", headingSuffix: "소요·대기", keywords: ["소요", "시간", "대기"], group: "ops" },
    { id: "price", label: "가격", headingSuffix: "가격·패키지", keywords: ["가격", "패키지"], group: "purchase" },
    { id: "coating", label: "코팅", headingSuffix: "코팅·광택", keywords: ["코팅", "광택", "왁스"], group: "product" },
    { id: "detailing", label: "디테일링", headingSuffix: "디테일링", keywords: ["디테일링", "실내"], group: "product" },
    { id: "care_tips", label: "관리법", headingSuffix: "차량 관리", keywords: ["관리", "유지", "주기"], group: "feature" },
    { id: "membership", label: "멤버십", headingSuffix: "멤버십·쿠폰", keywords: ["멤버십", "쿠폰"], group: "purchase" },
    { id: "promo", label: "행사", headingSuffix: "행사·할인", keywords: ["행사", "할인"], group: "purchase" },
    { id: "reserve", label: "예약", headingSuffix: "예약·이용", keywords: ["예약", "이용"], group: "visit" },
    { id: "parking", label: "주차", headingSuffix: "주차·대기", keywords: ["주차", "대기"], group: "visit" },
    { id: "caution", label: "주의사항", headingSuffix: "주의·케어", keywords: ["주의", "주의사항"], group: "feature" },
    { id: "compare", label: "비교", headingSuffix: "코스 비교", keywords: ["비교", "차이"], group: "compare" },
    { id: "faq", label: "FAQ", headingSuffix: "자주 묻는 질문", keywords: ["FAQ", "질문"], group: "faq" },
  ],
  saas: [
    { id: "brand", label: "서비스", headingSuffix: "서비스 개요", keywords: ["서비스", "솔루션"], group: "brand" },
    { id: "problem", label: "문제", headingSuffix: "해결하려는 문제", keywords: ["문제", "병목", "Pain"], group: "product" },
    { id: "feature", label: "기능", headingSuffix: "핵심 기능", keywords: ["기능", "자동", "연동"], group: "feature" },
    { id: "usage", label: "활용법", headingSuffix: "활용·도입", keywords: ["활용", "도입", "사용"], group: "feature" },
    { id: "automation", label: "자동화", headingSuffix: "자동화·워크플로", keywords: ["자동", "워크플로", "API"], group: "feature" },
    { id: "compare", label: "비교", headingSuffix: "대안·비교", keywords: ["비교", "대안", "차별"], group: "compare" },
    { id: "adoption_effect", label: "도입효과", headingSuffix: "기대 효과·ROI", keywords: ["효과", "ROI", "절감"], group: "purchase" },
    { id: "pricing", label: "요금", headingSuffix: "요금·플랜", keywords: ["요금", "가격", "플랜"], group: "purchase" },
    { id: "integration", label: "연동", headingSuffix: "연동·호환", keywords: ["연동", "호환", "API"], group: "ops" },
    { id: "security", label: "보안", headingSuffix: "보안·권한", keywords: ["보안", "권한", "인증"], group: "ops" },
    { id: "onboarding", label: "온보딩", headingSuffix: "도입·교육", keywords: ["온보딩", "교육", "셋업"], group: "ops" },
    { id: "support", label: "지원", headingSuffix: "고객 지원", keywords: ["지원", "CS", "SLA"], group: "ops" },
    { id: "demo", label: "데모", headingSuffix: "데모·상담", keywords: ["데모", "상담", "문의"], group: "visit" },
    { id: "case", label: "사례", headingSuffix: "활용 사례", keywords: ["사례", "케이스"], group: "compare" },
    { id: "faq", label: "FAQ", headingSuffix: "자주 묻는 질문", keywords: ["FAQ", "질문"], group: "faq" },
  ],
  default: [
    { id: "brand", label: "브랜드", headingSuffix: "브랜드·개요", keywords: ["브랜드"], group: "brand" },
    { id: "offer", label: "제품·서비스", headingSuffix: "제품·서비스", keywords: ["제품", "서비스"], group: "product" },
    { id: "feature", label: "특징", headingSuffix: "특징·차별", keywords: ["특징", "차별"], group: "feature" },
    { id: "price", label: "가격", headingSuffix: "가격·조건", keywords: ["가격", "비용"], group: "purchase" },
    { id: "promo", label: "혜택", headingSuffix: "혜택·행사", keywords: ["혜택", "할인"], group: "purchase" },
    { id: "process", label: "이용 과정", headingSuffix: "이용·절차", keywords: ["이용", "절차"], group: "ops" },
    { id: "reserve", label: "예약", headingSuffix: "예약·문의", keywords: ["예약", "문의"], group: "visit" },
    { id: "visit", label: "방문", headingSuffix: "방문·위치", keywords: ["방문", "위치"], group: "visit" },
    { id: "prep", label: "준비", headingSuffix: "이용 전 준비", keywords: ["준비", "확인"], group: "feature" },
    { id: "care", label: "관리", headingSuffix: "관리·사후", keywords: ["관리", "사후"], group: "ops" },
    { id: "compare", label: "비교", headingSuffix: "비교·선택", keywords: ["비교", "선택"], group: "compare" },
    { id: "checklist", label: "체크리스트", headingSuffix: "확인 체크", keywords: ["체크", "확인"], group: "purchase" },
    { id: "faq", label: "FAQ", headingSuffix: "자주 묻는 질문", keywords: ["FAQ"], group: "faq" },
    { id: "caution", label: "주의", headingSuffix: "주의·유의", keywords: ["주의", "유의"], group: "feature" },
    { id: "support", label: "지원", headingSuffix: "A/S·지원", keywords: ["지원", "AS"], group: "ops" },
  ],
};

/** @type {Record<string, (p: ReturnType<typeof coverageContext>) => string[]>} */
const AREA_INFO_BUILDERS = {
  brand: (p) => [
    `${p.brand}는 ${p.readerPhrase || "이 선택"}과 관련해 어떤 포지션인지 공식 홈페이지·매장 안내로 확인하는 것이 좋습니다.`,
    `브랜드별 강점(품질·서비스·체험·사후 지원)을 비교할 때 기준이 되는 항목을 미리 정리해 두세요.`,
    `${p.region ? `${p.region}에서 ` : ""}${p.brand}를 검색할 때는 공식 채널·인증 매장 정보를 우선하세요.`,
    `확인되지 않은 스펙·가격·효과는 단정하지 말고 안내 가능 범위만 참고하세요.`,
  ],
  lineup: (p) => [
    `${p.brand} 관련 라인업은 엔트리·미드·프리미엄 등 가격대별로 나뉩니다.`,
    `모델별 구성·체험 가능 여부는 매장마다 다를 수 있어 사전 확인이 필요합니다.`,
    `라인업 비교 시 포함 항목(본체·설치·옵션)을 견적서로 받으세요.`,
    `인기 모델은 행사 기간 재고 변동이 있을 수 있습니다.`,
  ],
  motion_feature: (p) => [
    `헤드·다리 각도 조절 범위는 라인업마다 다릅니다.`,
    `모션 작동 시 소음·진동·파트너 전달감을 체험해 보세요.`,
    `리모컨·앱 등 조작 방식도 매장에서 확인하세요.`,
  ],
  zero_gravity: (p) => [
    `무중력(제로지) 모드 지원 여부는 모델별로 다릅니다.`,
    `다리·상체 각도 조합에 따라 체압감이 달라질 수 있습니다.`,
    `10분 이상 해당 자세로 체험해 보는 것을 권합니다.`,
  ],
  pressure_distribution: (p) => [
    `체압 분산·지지감은 수면 자세·체형에 따라 느낌이 다릅니다.`,
    `누워서 어깨·허리·골반 지지 포인트를 함께 확인하세요.`,
    `단단함 선호는 주관적이므로 본인·파트너 모두 체험하세요.`,
  ],
  sleep_posture: (p) => [
    `옆·등·엎드림 등 주 수면 자세에 맞는 지지감을 확인하세요.`,
    `뒤척임·각도 변경 시 소음·전달감도 체크 포인트입니다.`,
    `알레르기·온열감 민감도도 함께 상담하세요.`,
  ],
  mattress_combo: (p) => [
    `매트리스 단독·프레임+매트리스·모션 베이스 조합을 비교하세요.`,
    `조합에 따라 설치비·체험 항목이 달라질 수 있습니다.`,
    `기존 프레임 호환 여부를 주문 전에 확인하세요.`,
  ],
  frame_type: (p) => [
    `프레임·베이스·헤드보드 유무에 따라 방 동선·수납이 달라집니다.`,
    `모션 베이스와 일반 프레임의 기능 차이를 확인하세요.`,
    `높이·콘센트 위치·통로 확보를 설치 전에 점검하세요.`,
  ],
  price: (p) => [
    `${p.topicObj} 가격은 모델·구성·행사·카드 혜택에 따라 달라질 수 있어 매장 견적이 가장 정확합니다.`,
    `견적 받을 때 본체·설치·배송·옵션·할인을 항목별로 분리해 요청하세요.`,
    `최종 결제 금액과 포함·제외 범위를 문서로 확인해 두세요.`,
    `행사 전후 가격 차이가 있는지도 함께 비교해 보세요.`,
  ],
  event: (p) => [
    `행사 기간·대상 모델·적용 조건을 매장·공식 안내로 확인하세요.`,
    `행사 전후 가격·혜택 차이를 비교해 보세요.`,
    `선착순·재고 소진 시 적용 변경 가능성을 문의하세요.`,
  ],
  discount: (p) => [
    `할인율·카드·제휴 조건은 중복 적용 여부를 확인하세요.`,
    `프로모션과 A/S·교환 정책이 동시에 적용되는지 질문하세요.`,
    `할인 적용 후에도 체험·설치 범위가 동일한지 확인하세요.`,
  ],
  gift: (p) => [
    `증정품·사은품 구성·수령 조건을 계약 전에 확인하세요.`,
    `카드 청구 할인·캐시백 등은 별도 조건이 있을 수 있습니다.`,
    `증정 재고·교환 가능 여부도 함께 문의하세요.`,
  ],
  install: (p) => [
    `설치 소요 시간·당일 준비물(통로·콘센트·기존 가구 처리)을 안내받으세요.`,
    `층간 이동·엘리베이터 사용 가능 여부를 주문 전 확인하세요.`,
    `설치 후 작동·소음·각도를 당일 점검하세요.`,
  ],
  delivery: (p) => [
    `배송 가능 지역·출고·도착 일정은 재고·지역에 따라 달라집니다.`,
    `배송비·설치비 포함 여부를 견적에 명시해 받으세요.`,
    `희망 설치일과 행사 마감일을 함께 조율하세요.`,
  ],
  as: (p) => [
    `보증 범위(모터·리모컨·스프링 등)와 제외 항목을 문서로 확인하세요.`,
    `A/S 접수 채널·처리 기간을 구매 전에 안내받으세요.`,
    `행사 제품의 보증 조건이 동일한지 확인하세요.`,
  ],
  exchange: (p) => [
    `교환·반품 가능 기간·개봉·사용 흔적 조건을 확인하세요.`,
    `행사 구매 시 교환 정책이 일반 구매와 같은지 질문하세요.`,
    `계약서·영수증 보관을 권합니다.`,
  ],
  trial_zone: (p) => [
    `매장 체험존에서 10~15분 이상 누워보는 것을 권합니다.`,
    `체험 가능 모델·대기 시간은 매장·시기마다 다릅니다.`,
    `체험 시 불편·선호를 메모해 상담에 활용하세요.`,
  ],
  visit_reserve: (p) => [
    `${p.regionBit}매장 방문·상담 예약 가능 여부를 미리 확인하세요.`,
    `주말·행사 기간 대기 시간이 길 수 있어 평일 방문도 고려하세요.`,
    `상담 시 모델명·예산·희망 설치일을 알려주면 효율적입니다.`,
  ],
  parking: (p) => [
    `매장 주차·대중교통·영업·휴무 시간을 방문 전 확인하세요.`,
    `${p.regionBit}동선·주차비·혼잡 시간대를 함께 보면 편합니다.`,
    `당일 체험·구매 일정을 여유 있게 잡으세요.`,
  ],
  faq: (p) => [
    `Q. ${p.topicFacet || p.topic} 관련 비용은? A. 모델·구성·행사에 따라 ${p.brand} 매장 견적이 정확합니다.`,
    `Q. 설치·배송 기간은? A. 지역·재고에 따라 다르며 계약 시 확정일을 받으세요.`,
    `Q. 체험 필수인가요? A. 10분 이상 체험을 권합니다.`,
  ],
  compare: (p) => [
    `가격만 비교하면 설치·배송·회수비가 빠질 수 있습니다.`,
    `동일 조건(모션·레이어·보증)으로 타 옵션과 비교하세요.`,
    `견적 항목별 비교표를 만들면 숨은 비용을 줄일 수 있습니다.`,
  ],
  purchase_checklist: (p) => [
    `구매 전: 예산·수면 자세·방 크기·설치일·행사 조건을 정리하세요.`,
    `체험·견적·계약서·A/S 범위를 같은 날 확인하면 누락이 줄어듭니다.`,
    `확인되지 않은 스펙·가격은 단정하지 말고 매장 안내를 따르세요.`,
  ],
};

function defaultInfoPoints(p, area) {
  return [
    `${p.brand} — ${area.label} 관련 안내는 공식·매장 채널 기준으로 확인하는 것이 좋습니다.`,
    `${area.label} 비교 시 ${p.region ? `${p.region} ` : ""}매장·온라인 조건을 함께 보면 누락을 줄일 수 있습니다.`,
    `확인되지 않은 수치·효과·가격은 단정하지 말고 안내 가능 범위만 참고하세요.`,
    `${area.label} 관련 궁금한 점은 상담 전에 목록으로 정리해 가면 효율적입니다.`,
  ];
}

const COLUMN_HEADING_VARIANTS = [
  (def) => def.headingSuffix || def.label,
  (def) => `${def.label}, 이용 전에 먼저 볼 것`,
  (def) => `${def.label} — 방문·상담 때 확인할 것`,
  (def) => `${def.label} 비교 포인트`,
];

/** 칼럼형 소제목 — 매 섹션마다 지역·브랜드·주제 전체 반복 금지 */
function buildAreaPublishHeading(def, ctx, index) {
  const { region, brand, topic } = ctx;
  const suffix = def.headingSuffix || def.label;
  if (index === 0 && region && brand) {
    return `${region} ${brand}, ${suffix}`;
  }
  if (index === 1 && brand) {
    const topicShort = String(topic || "").trim();
    return topicShort ? `${brand} ${topicShort}, ${suffix}` : `${brand}, ${suffix}`;
  }
  const pick = COLUMN_HEADING_VARIANTS[index % COLUMN_HEADING_VARIANTS.length];
  return pick(def);
}

/**
 * @param {Record<string, unknown>} input
 */
export function buildKnowledgeCoverageMap(input = {}) {
  const ctx = coverageContext(input);
  const categoryKey = resolveResearchCategoryKey(input);
  const defs = CATEGORY_COVERAGE[categoryKey] || CATEGORY_COVERAGE.default;
  const areas = defs.map((def, index) => ({
    ...def,
    heading: buildAreaPublishHeading(def, ctx, index),
    searchQuery: [ctx.brand, def.label, ctx.topic].filter(Boolean).join(" ").trim(),
  }));

  return {
    categoryKey,
    brand: ctx.brand,
    region: ctx.region,
    topic: ctx.topic,
    areas,
    minAreas: MIN_COVERAGE_AREAS,
    coverageCount: areas.length,
    meetsMinimum: areas.length >= MIN_COVERAGE_AREAS,
  };
}

export function buildCoverageAreaBody(area, input = {}, depth = 0) {
  const p = coverageContext(input);
  const builder = AREA_INFO_BUILDERS[area.id];
  let points = builder ? builder(p) : defaultInfoPoints(p, area);
  const start = depth % Math.max(1, points.length - 2);
  points = points.slice(start, start + 5);
  while (points.length < 3) {
    points.push(`${p.brand} ${area.label} 관련 추가 안내는 상담 시 확인하세요.`);
  }
  let merged = points.slice(0, 5);
  if (merged.join("\n\n").replace(/\s/g, "").length < 100) {
    merged = [...merged, ...defaultInfoPoints(p, area)].slice(0, 5);
  }
  return merged.join("\n\n");
}

export function coverageAreaToSearchQuery(area, input = {}) {
  const ctx = coverageContext(input);
  return (
    area.searchQuery ||
    [ctx.brand, ctx.region, area.label, ctx.topic].filter(Boolean).join(" ")
  );
}

export function formatCoverageMapForPrompt(map) {
  if (!map?.areas?.length) return "";
  if (isBriclogMissionEnforced()) {
    const labels = map.areas.slice(0, 12).map((a) => a.label).join(" · ");
    return [
      "【KNOWLEDGE COVERAGE · Gemini 조사용 — 본문 섹션 출력 금지】",
      `업종 ${map.categoryKey} · 조사할 주제: ${labels}${map.areas.length > 12 ? " …" : ""}`,
      "위 영역은 조사·팩트 수집용이다. 영역마다 소제목·섹션을 만들지 말 것.",
      "조사 결과를 칼럼 한 편(문제→이유→비교→브랜드→정리)에 녹일 것.",
      "「확인하세요」「견적서로」 문장 나열·체크리스트 형식 금지.",
    ].join("\n");
  }
  const lines = [
    "【KNOWLEDGE COVERAGE · 검색 전 정보 영역 — 출력 금지】",
    `카테고리: ${map.categoryKey} · 영역 ${map.coverageCount}개 (최소 ${map.minAreas})`,
    `주제 재해석: ${map.topic} · 원문 주제 그대로 출력 금지`,
    "번호 증가 소제목(2)(3) 금지 · 동일 의미 섹션 복제 금지",
  ];
  map.areas.forEach((a, i) => {
    lines.push(`${i + 1}. [${a.label}] ${a.headingSuffix} — 키워드: ${a.keywords.slice(0, 4).join(", ")}`);
  });
  return lines.join("\n");
}

function packText(pack) {
  return [
    pack?.title,
    ...(pack?.sections || []).map((s) => `${s.heading}\n${s.body}`),
    pack?.conclusion,
  ].join("\n");
}

function normalizeHeadingKey(heading = "") {
  return String(heading)
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function scoreCoverageInPack(map, pack) {
  const text = packText(pack);
  const covered = [];
  const missing = [];
  for (const area of map.areas || []) {
    const hit =
      area.keywords.some((k) => text.includes(k)) ||
      (area.label && text.includes(area.label));
    if (hit) covered.push(area);
    else missing.push(area);
  }
  const ratio = map.areas.length ? covered.length / map.areas.length : 0;
  return { covered, missing, ratio, ok: covered.length >= Math.min(MIN_COVERAGE_AREAS, map.areas.length * 0.4) };
}

export function getUncoveredCoverageAreas(map, pack) {
  return scoreCoverageInPack(map, pack).missing;
}

export { coverageContext, normalizeHeadingKey };
