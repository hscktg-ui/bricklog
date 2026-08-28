/**
 * 글 유형·독자 계약 SSOT — persona / intent / outline / UI 공통
 */
import {
  isInformationalTopicInput,
  isSpecDenseLowPublicInfoTopic,
  isVisitReviewTopicInput,
  topicRaw,
} from "@/lib/content/topicFacetEngine";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";

export const WRITING_CONTRACT_VERSION = "writing-contract-v1";

/** @typedef {"segmented"|"narrative"} WritingDensity */
/** @typedef {"product_guide"|"info_guide"|"info_compare"|"info"|"visit_review"|"brand_story"|"brand_philosophy"|"local_recommend"|"event_notice"} WritingContractType */

export const WRITING_CONTRACT_LABELS = {
  product_guide: "제품·라인업 소개",
  info_guide: "가이드·선택 기준",
  info_compare: "비교·정리",
  info: "정보 소개",
  visit_review: "방문·체험 후기",
  brand_story: "브랜드 이야기",
  brand_philosophy: "브랜드·철학",
  local_recommend: "지역 추천",
  event_notice: "행사·이벤트",
};

const INTENT_BY_TYPE = {
  product_guide: "product_intro",
  info_guide: "guide",
  info_compare: "compare",
  info: "info",
  visit_review: "visit_review",
  brand_story: "brand_intro",
  brand_philosophy: "brand_intro",
  local_recommend: "local_recommend",
  event_notice: "event_notice",
};

const PERSONA_BY_TYPE = {
  product_guide: { persona: "info_intro", subtype: "guide" },
  info_guide: { persona: "info_intro", subtype: "guide" },
  info_compare: { persona: "info_intro", subtype: "compare" },
  info: { persona: "info_intro", subtype: "explain" },
  visit_review: { persona: "visit_review", subtype: "review" },
  brand_story: { persona: "brand_story", subtype: "product" },
  brand_philosophy: { persona: "brand_story", subtype: "philosophy" },
  local_recommend: { persona: "local_guide", subtype: "area" },
  event_notice: { persona: "brand_story", subtype: "event" },
};

const DENSITY_BY_TYPE = {
  product_guide: "segmented",
  info_guide: "segmented",
  info_compare: "segmented",
  info: "segmented",
  visit_review: "narrative",
  brand_story: "narrative",
  brand_philosophy: "narrative",
  local_recommend: "narrative",
  event_notice: "narrative",
};

const READER_GAIN_BY_TYPE = {
  product_guide: "제품·기능·라인업을 항목별로 이해한다",
  info_guide: "선택·이용 전 확인할 기준을 얻는다",
  info_compare: "비교할 때 참고할 차이를 얻는다",
  info: "주제에 대한 정보를 정리해 얻는다",
  visit_review: "방문·체험 전 참고할 포인트를 얻는다",
  brand_story: "브랜드가 어떤 곳·서비스인지 감이 잡힌다",
  brand_philosophy: "브랜드가 지향하는 방향을 이해한다",
  local_recommend: "근처 생활에 도움이 되는 추천을 얻는다",
  event_notice: "행사·이벤트 참여 여부를 판단할 수 있다",
};

const BRICLOG_PHILOSOPHY_TOPIC_RE =
  /철학|비전|왜\s*브릭|brand\s*content\s*os|콘텐츠\s*os|지향|이야기\s*말고|ai\s*writer\s*가\s*아니/i;
const BRICLOG_PRODUCT_TOPIC_RE =
  /기능|사용법|사용\s*법|작업실|채널|조사|이야기·플레이스|플레이스|인스타|검수|운영\s*계획|소개|어떻게|시작|입력|생성|초안/i;
const SAAS_INDUSTRY_RE =
  /saas|ai|platform|플랫폼|마케팅|소프트웨어|서비스|콘텐츠\s*운영|디지털/i;

function textBlob(input = {}) {
  return [
    input.topic,
    input.includePhrases,
    input.mainKeyword,
    input.brandDescription,
    input.storeFeatures,
    input.industry,
    input.brandName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isBriclogSelfBrandInput(input = {}) {
  const hay = `${input.brandName || ""} ${input.topic || ""} ${input.mainKeyword || ""}`;
  return /브릭로그|briclog/i.test(hay);
}

export function isSaasLikeInput(input = {}) {
  return SAAS_INDUSTRY_RE.test(textBlob(input)) || isBriclogSelfBrandInput(input);
}

/** 방문 후기 — 명시 신호 있을 때만 (로컬 업종 기본 visit 금지) */
export function isExplicitVisitReviewInput(input = {}) {
  if (isVisitReviewTopicInput(input)) return true;

  const purpose = input.purposeType || input.purpose || "";
  if (purpose === "review" || purpose === "visit" || purpose === "visitDrive") {
    return true;
  }

  const t = textBlob(input);
  if (
    /체험단|체험\s*후기|제공받|협찬|솔직\s*후기|방문\s*후기|다녀온|직접\s*다녀|기자단|취재|보도\s*기사/.test(
      t
    )
  ) {
    return true;
  }
  if (/블로거|블로그\s*후기|포스팅|서포터즈|인플루언서|협업|릴스|인스타\s*후기/.test(t)) {
    return true;
  }
  if (isInformationalTopicInput(input)) return false;
  if (/후기|방문해|다녀|솔직히/.test(t)) return true;

  return false;
}

function subtypeFromTopic(type, t) {
  const mapped = PERSONA_BY_TYPE[type] || PERSONA_BY_TYPE.brand_story;
  if (type === "info_guide" || type === "info") {
    if (/비교|vs|차이/.test(t)) return { ...mapped, subtype: "compare" };
    if (/설명/.test(t)) return { ...mapped, subtype: "explain" };
  }
  if (type === "visit_review") {
    if (/추천/.test(t)) return { persona: "visit_review", subtype: "recommend" };
    if (/체험/.test(t)) return { persona: "visit_review", subtype: "experience" };
  }
  if (type === "brand_story" && /오픈|신규|그랜드|리뉴얼/.test(t)) {
    return { persona: "brand_story", subtype: "new_open" };
  }
  return mapped;
}

function buildUserIntent(type, input = {}) {
  const b = String(input.brandName || "").trim();
  const r = String(input.region || "").trim();
  const t = topicRaw(input) || String(input.topic || "").trim();
  const brandObj = koreanObjectParticle(b || r || "이곳");
  const topicObj = koreanObjectParticle(t || b || "제품");
  switch (type) {
    case "visit_review":
      return `${brandObj} 직접 경험한 느낌을 전하고 싶다`;
    case "product_guide":
      return `${topicObj} 항목별로 이해하기 쉽게 소개하고 싶다`;
    case "info_guide":
    case "info_compare":
    case "info":
      return `${t || "주제"}에 대해 헷갈리는 점을 정리해 전하고 싶다`;
    case "local_recommend":
      return `${r || "이 동네"}에서 실제로 쓸 만한 ${t || "정보"}를 추천하고 싶다`;
    case "event_notice":
      return `${b || "브랜드"}의 행사·이벤트 소식을 알리고 싶다`;
    case "brand_philosophy":
      return `${b || "브랜드"}가 지향하는 방향을 설명하고 싶다`;
    default:
      return b
        ? `${b}의 ${koreanObjectParticle(t || "이야기")} 브랜드 입장에서 전하고 싶다`
        : `${t || "브랜드"} 이야기를 전하고 싶다`;
  }
}

function inferContractType(input = {}) {
  const t = textBlob(input);
  const purpose = input.purposeType || input.purpose || "";
  const rawTopic = topicRaw(input).toLowerCase();

  if (isExplicitVisitReviewInput(input)) return "visit_review";

  if (isBriclogSelfBrandInput(input)) {
    if (BRICLOG_PHILOSOPHY_TOPIC_RE.test(t)) return "brand_philosophy";
    return "product_guide";
  }

  if (isInformationalTopicInput(input)) {
    if (/비교|vs|차이/.test(t)) return "info_compare";
    if (
      /가이드|알아두|방법|팁|고르는\s*법|종류|선택\s*기준|체크|꿀팁|정리/.test(t)
    ) {
      return "info_guide";
    }
    if (/상품|메뉴|구성|제품|라인업|시리즈|모델|시술|기능|화면|채널/.test(t)) {
      return "product_guide";
    }
    return "info";
  }

  if (isSpecDenseLowPublicInfoTopic(input)) return "product_guide";

  if (SAAS_INDUSTRY_RE.test(t) && !isExplicitVisitReviewInput(input)) {
    if (/철학|비전|지향/.test(t)) return "brand_philosophy";
    if (/기능|사용|소개|방법|프로세스|채널|운영/.test(t)) return "product_guide";
    return "info_guide";
  }

  if (/비교|vs|차이/.test(t)) return "info_compare";
  if (
    /가이드|알아두|방법|팁|소개|사야\s*할|고르는\s*법|종류|선택\s*기준/.test(t)
  ) {
    return "info_guide";
  }
  if (/이벤트|행사|오픈|프로모|할인/.test(t) || purpose === "event") {
    return "event_notice";
  }
  if (
    /동네|근처|로컬|주민|맛집\s*추천|카페\s*추천|꽃집\s*추천/.test(t) ||
    input.contentObjective === "localSeo"
  ) {
    return "local_recommend";
  }
  if (/상품|메뉴|구성|제품|라인업/.test(t) || purpose === "season") {
    return "product_guide";
  }
  if (/철학|이야기|브랜드\s*소개|우리는|지향/.test(t) || purpose === "brand") {
    return "brand_philosophy";
  }
  if (purpose === "info") return "info_guide";
  if (purpose === "visitDrive" || purpose === "visit") {
    return isExplicitVisitReviewInput(input) ? "visit_review" : "brand_story";
  }

  if (input.brandName && !/후기/.test(rawTopic)) return "brand_story";
  if (input.region) return "local_recommend";
  return "info";
}

function contractFromUserPersona(input = {}) {
  const requested = input.contentPersona;
  if (!requested || requested === "auto") return null;

  const map = {
    visit_review: "visit_review",
    info_intro: "info_guide",
    brand_story: "brand_story",
    local_guide: "local_recommend",
  };
  const type = map[requested] || "brand_story";
  const subtype =
    input.contentPersonaSubtype || PERSONA_BY_TYPE[type]?.subtype || "product";
  return finalizeContract(type, input, {
    source: "user_persona",
    persona: requested,
    personaSubtype: subtype,
  });
}

function finalizeContract(type, input = {}, overrides = {}) {
  const personaFields = overrides.persona
    ? { persona: overrides.persona, subtype: overrides.personaSubtype }
    : subtypeFromTopic(type, textBlob(input));
  const intent = INTENT_BY_TYPE[type] || "info";
  const density = DENSITY_BY_TYPE[type] || "narrative";
  const visitToneAllowed = type === "visit_review";
  const label = WRITING_CONTRACT_LABELS[type] || type;
  const readerGain = READER_GAIN_BY_TYPE[type] || READER_GAIN_BY_TYPE.brand_story;
  const userIntent = buildUserIntent(type, input);
  const topic = topicRaw(input) || String(input.topic || "").trim();

  return {
    version: WRITING_CONTRACT_VERSION,
    type,
    label,
    density,
    intent,
    intentLabel: label,
    persona: personaFields.persona,
    personaSubtype: personaFields.subtype,
    visitToneAllowed,
    readerGain,
    userIntent,
    thesis: `${topic || "이 주제"} — ${userIntent}`,
    previewLine: `이번 글: ${label} · ${readerGain}`,
    source: overrides.source || "auto",
  };
}

/**
 * @param {object} input
 * @returns {import("./writingContract.js").WritingContract}
 */
export function resolveWritingContract(input = {}) {
  if (input._writingContract?.version === WRITING_CONTRACT_VERSION) {
    return input._writingContract;
  }
  if (input.writingContract?.version === WRITING_CONTRACT_VERSION) {
    return input.writingContract;
  }

  const userPersona = contractFromUserPersona(input);
  if (userPersona) return userPersona;

  const type = inferContractType(input);
  return finalizeContract(type, input);
}

export const BRICLOG_PRODUCT_BLUEPRINT = [
  "이번 글에서 다룰 기능·화면",
  "입력·설정: 브랜드·주제·조사",
  "생성 흐름: 조사 → 초안 → 검수",
  "채널별 산출: 이야기·플레이스·인스타·상품 상세(860px)",
  "운영 계획·발행 준비도",
  "누가·어떤 상황에 맞는지",
  "마무리: 시작할 때 확인할 것",
];

export function resolveBriclogSectionBlueprint(input = {}, contract = null) {
  const c = contract || resolveWritingContract(input);
  if (!isBriclogSelfBrandInput(input)) return null;
  if (c.type === "brand_philosophy") return "philosophy";
  return "product";
}
