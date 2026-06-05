/**
 * STEP 1-1 — 발행 목적 추론 (v6.2)
 * 사용자가 목적을 입력하지 않아도 주제·업종·피드백 맥락에서 추론한다.
 */
import { CONTENT_STRUCTURE_TYPES } from "@/lib/product/briclogMasterSystemV6";

export const PUBLISH_PURPOSES = [
  "방문 유도",
  "예약 유도",
  "전화 문의",
  "상담 유도",
  "브랜드 인지도",
  "제품 소개",
  "신제품 출시",
  "행사 홍보",
  "신뢰 확보",
  "정보 제공",
  "검색 유입",
  "매출 전환",
];

const INFERENCE_RULES = [
  {
    purpose: "신제품 출시",
    structure: "신제품 소개형",
    re: /신제품|출시|런칭|오픈|그랜드\s*오픈|리뉴얼/,
  },
  {
    purpose: "행사 홍보",
    structure: "행사 안내형",
    re: /행사|이벤트|프로모|할인|기념\s*세일|오픈\s*기념/,
  },
  {
    purpose: "정보 제공",
    structure: "정보형",
    re: /소개|사야\s*할|고르는\s*법|종류|정리|가이드|설명|알아|정보|계절|여름|가을|봄|겨울|시즌|리스트|무엇을|뭐\s*살/,
  },
  {
    purpose: "방문 유도",
    structure: "방문형",
    re: /방문|매장|플레이스|찾아|오시|길\s*안내|주차|영업\s*시간/,
  },
  {
    purpose: "예약 유도",
    structure: "문제해결형",
    re: /예약|접수|대기|당일|픽업|배송\s*일/,
  },
  {
    purpose: "전화 문의",
    structure: "Q&A형",
    re: /전화|문의|연락|상담\s*전/,
  },
  {
    purpose: "상담 유도",
    structure: "문제해결형",
    re: /상담|견적|맞춤|컨설팅/,
  },
  {
    purpose: "신뢰 확보",
    structure: "사례형",
    re: /후기|체험|다녀|솔직|사례|인증/,
  },
  {
    purpose: "브랜드 인지도",
    structure: "브랜드 철학형",
    re: /브랜드\s*이야기|철학|우리는|지향|스토리/,
  },
  {
    purpose: "제품 소개",
    structure: "신제품 소개형",
    re: /제품|메뉴|구성|라인업|모델|시리즈/,
  },
  {
    purpose: "검색 유입",
    structure: "가이드형",
    re: /검색|키워드|근처|동네|지역|로컬/,
  },
  {
    purpose: "매출 전환",
    structure: "비교형",
    re: /구매|주문|결제|가격|비교|vs|차이/,
  },
];

const PURPOSE_MAP = {
  brand: "브랜드 인지도",
  visit: "방문 유도",
  visitDrive: "방문 유도",
  season: "제품 소개",
  event: "행사 홍보",
  info: "정보 제공",
  compare: "매출 전환",
  guide: "정보 제공",
  review: "신뢰 확보",
  newOpen: "신제품 출시",
  local: "검색 유입",
  localseo: "검색 유입",
  save: "브랜드 인지도",
  branding: "브랜드 인지도",
};

function collectBlob(input = {}) {
  return [
    input.topic,
    input.mainKeyword,
    input.includePhrases,
    input.brandDescription,
    input.purposeType,
    input.purpose,
    input.contentObjective,
    input.brandFeedbackBrief,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * @param {object} input
 * @returns {{ purpose: string, structure: string, source: 'user'|'inferred'|'default', brief: string }}
 */
export function inferPublishPurpose(input = {}) {
  const explicit = String(
    input.publishPurpose || input.contentPurpose || ""
  ).trim();
  if (explicit && PUBLISH_PURPOSES.includes(explicit)) {
    const rule = INFERENCE_RULES.find((r) => r.purpose === explicit);
    return {
      purpose: explicit,
      structure: rule?.structure || "정보형",
      source: "user",
      brief: buildPurposeBrief(explicit, rule?.structure || "정보형", "user"),
    };
  }

  const purposeKey = String(
    input.purposeType || input.purpose || input.contentObjective || ""
  ).toLowerCase();
  if (purposeKey && PURPOSE_MAP[purposeKey]) {
    const purpose = PURPOSE_MAP[purposeKey];
    const rule = INFERENCE_RULES.find((r) => r.purpose === purpose);
    return {
      purpose,
      structure: rule?.structure || "정보형",
      source: "user",
      brief: buildPurposeBrief(purpose, rule?.structure || "정보형", "user"),
    };
  }

  const blob = collectBlob(input);
  for (const rule of INFERENCE_RULES) {
    if (rule.re.test(blob)) {
      return {
        purpose: rule.purpose,
        structure: rule.structure,
        source: "inferred",
        brief: buildPurposeBrief(rule.purpose, rule.structure, "inferred"),
      };
    }
  }

  const fallbackPurpose = input.region?.trim() ? "검색 유입" : "브랜드 인지도";
  const fallbackStructure = input.region?.trim() ? "가이드형" : "브랜드 철학형";
  return {
    purpose: fallbackPurpose,
    structure: fallbackStructure,
    source: "default",
    brief: buildPurposeBrief(fallbackPurpose, fallbackStructure, "default"),
  };
}

function buildPurposeBrief(purpose, structure, source) {
  const src =
    source === "inferred"
      ? " (주제·맥락 추론)"
      : source === "default"
        ? " (기본)"
        : "";
  return [
    `【발행 목적 v6.2${src}】`,
    `목적: ${purpose} — 콘텐츠 구조·톤·CTA의 최우선 기준`,
    `권장 구조: ${structure} (기승전결 고정 금지)`,
    `같은 주제라도 목적이 다르면 전혀 다른 글로 작성할 것.`,
    `허용 구조 유형: ${CONTENT_STRUCTURE_TYPES.slice(0, 8).join(" · ")} …`,
  ].join("\n");
}

export function attachPublishPurpose(input = {}) {
  const inferred = inferPublishPurpose(input);
  return {
    ...input,
    publishPurpose: inferred.purpose,
    contentStructureType: inferred.structure,
    publishPurposeBrief: inferred.brief,
    publishPurposeSource: inferred.source,
  };
}
