/**
 * 테스트·스모크용 — v17 isSubstantiveSectionBody 통과하는 블로그 초안
 */
import { buildBrandFocusedSectionHeadings } from "@/lib/content/outlinePackGuard";
import { expandPackByInformation } from "@/lib/content/informationExpansionEngine";
import {
  isFurnitureBedContext,
  normalizeBlogLengthAndStructure,
} from "@/lib/content/blogLengthControl";
import { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";
import { isCoverageExpansionForbidden } from "@/lib/product/missionFlags";
import {
  buildMissionProseFallbackPack,
  deepenMissionProseToMin,
} from "@/lib/llm/missionProseFallback";

const DEFAULT_BODIES = [
  "매장에서 라인업을 직접 체험하고 체감을 비교해 보세요. 헤드 각도와 프레임 높이를 단계별로 조절해 보는 것이 좋습니다. 할인·체험 일정은 방문 전에 전화로 먼저 확인하세요. 같은 브랜드라도 모델마다 느낌이 달라서 짧게라도 여러 가지를 비교하는 편이 낫습니다.",
  "사용 패턴에 따라 필요한 기능이 달라집니다. 매장에서 단계별로 시연해 보세요. 상담사에게 평소 이용 상황을 말해 두면 추천이 수월합니다. 버튼 위치와 소음도 함께 확인해 두세요.",
  "설치·배송·A/S 범위는 모델마다 다릅니다. 계약 전 견적서에 포함 항목을 적어 두세요. 공간 크기와 이동 경로도 함께 확인하세요. 설치 당일 시간대를 미리 잡아 두면 대기가 줄어듭니다.",
  "방문 전 예약하면 대기 없이 체험할 수 있습니다. 주차·영업 시간도 함께 확인하세요. 혼잡한 주말은 평일 오전이 비교하기 편합니다. 동행 인원이 있으면 예약 메모에 적어 두세요.",
  "프로모션 기간에는 재고가 빠르게 소진될 수 있습니다. 원하는 옵션을 미리 메모해 가세요. 체험 제품과 주문 제품이 다를 수 있으니 모델명을 적어 두세요. 행사 조건은 현장 안내와 홈페이지를 함께 대조하세요.",
  "이용 후에는 불편했던 점을 짧게 메모해 두면 상담이 수월합니다. 무리한 결정은 피하세요. 집에서 충분히 써 본 뒤 결정해도 늦지 않습니다. 재방문 때 질문할 목록을 적어 가세요.",
];

const INDUSTRY_BODIES = {
  flower: [
    "졸업식·기념일에는 수령 시간과 보관 방법을 먼저 확인하세요. 리본 색과 포장 스타일은 사진으로 미리 골라 두면 현장이 빨라집니다. 생화는 당일 픽업 가능 여부를 전화로 확인하는 편이 안전합니다.",
    "꽃다발 크기는 용도에 따라 달라집니다. 테이블 높이와 인원 수를 알려 주면 추천이 수월합니다. 알레르기가 있는 분이 함께한다면 꽃 종류를 미리 상담하세요.",
    "예약 없이 방문하면 대기가 길 수 있습니다. 주말 오전보다 평일 점심 시간이 여유 있는 경우가 많습니다. 영수증·카드 할인 조건도 함께 확인하세요.",
    "시즌마다 인기 품목이 바뀝니다. 원하는 색감을 사진으로 보내 두면 준비가 빨라집니다. 배송이 필요하면 주소와 수령 시간을 정확히 적어 주세요.",
    "포장·카드 문구는 짧게 적어 두는 편이 좋습니다. 현장에서 수정할 여지를 남겨 두세요. 생화 상태는 수령 직후 바로 확인하세요.",
    "기념일 전날 예약이 몰리면 재고가 빠르게 소진될 수 있습니다. 대체 옵션을 하나 정해 두면 마음이 편합니다.",
  ],
  hospital: [
    "상담 전에 통증 부위와 기간을 짧게 정리해 가면 진료가 수월합니다. 당일 검진 가능 여부와 준비물을 전화로 확인하세요. 주차·접수 동선도 미리 안내받으세요.",
    "치료 계획은 개인 상태에 따라 달라집니다. 비용·기간·주의사항을 항목별로 메모하세요. 타 병원 자료가 있으면 함께 제시하세요.",
    "무료 상담이라도 예약이 필요한 경우가 많습니다. 신분 확인과 보험 적용 범위를 미리 질문하세요. 동행이 필요하면 안내를 받으세요.",
    "시술 후 관리 방법을 문서로 받아 두세요. 응급 연락처와 재방문 시점을 확인하세요. 과장된 효과 표현은 단정하지 말고 안내만 참고하세요.",
    "대기 시간이 긴 요일은 피하는 편이 좋습니다. 평일 오전이 비교적 여유 있는 경우가 많습니다.",
    "비용은 항목별 견적으로 받는 편이 명확합니다. 할부·카드 조건을 함께 확인하세요.",
  ],
  cafe: [
    "반려견 동반 규칙과 좌석 배치를 먼저 확인하세요. 생일 패키지 구성과 예약 시간을 전화로 맞추세요. 알레르기 재료가 있는 메뉴는 별도로 문의하세요.",
    "실내 소음과 통풍은 반려동물 스트레스에 영향을 줍니다. 산책 후 방문이면 물·배변 패드 준비를 챙기세요. 혼잡한 시간대는 피하는 편이 좋습니다.",
    "패키지 가격은 인원·옵션에 따라 달라집니다. 사진 촬영 허용 여부도 함께 확인하세요.",
    "주차 공간이 좁은 날은 대중교통 이용을 권합니다. 예약 변경 규정을 미리 확인하세요.",
    "메뉴는 현장에서만 변경 가능한 경우가 있어요. 알레르기 정보를 직원에게 먼저 전달하세요.",
    "기념일 전날 예약이 몰리면 시간대가 빠르게 차요. 두 시간대 후보를 적어 두세요.",
  ],
  food: [
    "보양식 코스는 재료·양·제공 시간이 메뉴마다 다릅니다. 예약 시 인원과 알레르기를 미리 알려 주세요. 당일 웨이팅이 길 수 있어 시간 여유를 두세요.",
    "지역 특산 재료 사용 여부를 메뉴판에서 확인하세요. 포장·배달 가능 여부도 함께 물어보세요.",
    "점심·저녘 피크 시간은 예약이 필요합니다. 주차 가능 여부를 전화로 확인하세요.",
    "코스 순서와 제공 속도는 상담 시 조절 가능한 경우가 많습니다.",
    "계절 한정 메뉴는 조기 마감될 수 있습니다. 대체 메뉴를 하나 정해 두세요.",
    "영업 시간과 브레이크 타임을 홈페이지와 함께 대조하세요.",
  ],
  fitness: [
    "신규 혜택은 적용 기간과 대상 클래스를 확인하세요. 체험 레슨 예약 가능 시간을 전화로 맞추세요. 운동 경험과 부상 이력을 상담 시 공유하세요.",
    "시설·샤워·락커 이용 규칙을 방문 전에 확인하세요. 주차·입장 동선도 미리 안내받으세요.",
    "월 회원·회차권 비교는 항목별로 받는 편이 명확합니다.",
    "혼잡한 시간대는 피하고 본인 리듬에 맞는 시간을 고르세요.",
    "강사 스타일이 맞는지 체험 후 결정해도 늦지 않습니다.",
    "해지·환불 규정을 계약 전에 확인하세요.",
  ],
};

function industryBodyKey(input = {}) {
  const blob = `${input.industry || ""} ${input.topic || ""}`.toLowerCase();
  if (/꽃|플로리스트|flower/.test(blob)) return "flower";
  if (/병원|치과|의원|clinic/.test(blob)) return "hospital";
  if (/반려|카페|cafe/.test(blob)) return "cafe";
  if (/한식|음식|식당|보양/.test(blob)) return "food";
  if (/요가|피트니스|필라/.test(blob)) return "fitness";
  return null;
}

/**
 * @param {object} input
 * @param {{ sectionCount?: number, title?: string }} [opts]
 */
export function makeSubstantiveBlogStarter(input = {}, opts = {}) {
  const sectionCount = opts.sectionCount ?? 6;
  const headings = buildBrandFocusedSectionHeadings(input, sectionCount);
  const key = industryBodyKey(input);
  const bodies = INDUSTRY_BODIES[key] || DEFAULT_BODIES;
  const topic = String(input.topic || "이용 안내").trim();
  const region = String(input.region || "").trim();
  const brand = String(input.brandName || "").trim();
  const title =
    opts.title ||
    [region, brand, topic].filter(Boolean).join(" ").slice(0, 48) ||
    "이용 안내";

  return {
    title,
    representativeTitle: title,
    sections: headings.map((heading, i) => ({
      heading,
      body: bodies[i % bodies.length],
    })),
    conclusion: `${region ? `${region} ` : ""}${brand ? `${brand} ` : ""}방문·상담 전에 확인할 항목을 메모해 두면 도움이 됩니다. 무리한 결정은 피하고 직접 확인한 뒤 선택하세요.`,
  };
}

/**
 * @param {object} input
 * @param {object} ctx
 * @param {object} pipelineInput
 * @param {{ minChars?: number, channel?: string }} [opts]
 */
export function expandSubstantiveBlogPack(input, ctx, pipelineInput, opts = {}) {
  const tierKey = input.blogLengthTier || pipelineInput.blogLengthTier || "medium";
  const tier = resolveBlogLengthTier(tierKey);
  const minChars = opts.minChars ?? tier.min;

  const merged = { ...input, ...pipelineInput };
  let pack = makeSubstantiveBlogStarter(input, { sectionCount: 6 });
  if (
    !isCoverageExpansionForbidden() &&
    isFurnitureBedContext(ctx, merged)
  ) {
    pack = expandPackByInformation(pack, ctx, merged, {
      minChars,
      channel: opts.channel || "blog",
    });
  }
  const tierInput = {
    ...input,
    ...pipelineInput,
    blogLengthTier: tierKey,
  };
  let norm = normalizeBlogLengthAndStructure(pack, ctx, tierInput);
  pack = norm.pack;
  for (let attempt = 0; attempt < 3 && countBlogBodyCharsWithSpaces(pack) < minChars; attempt += 1) {
    pack = isCoverageExpansionForbidden()
      ? deepenMissionProseToMin(pack, minChars, tierInput)
      : deepenPackBodiesToMin(pack, minChars, ctx, tierInput);
    norm = normalizeBlogLengthAndStructure(pack, ctx, tierInput);
    pack = norm.pack;
  }
  if (countBlogBodyCharsWithSpaces(pack) < minChars) {
    pack = buildMissionProseFallbackPack(tierInput);
    norm = normalizeBlogLengthAndStructure(pack, ctx, tierInput);
    pack = norm.pack;
  }
  return pack;
}
