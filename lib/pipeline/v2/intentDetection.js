/**
 * STEP 1 — Intent Detection (하나 확정 전 생성 금지)
 */
export const CONTENT_INTENTS = {
  brand_intro: "브랜드 소개",
  product_intro: "상품 소개",
  event_notice: "행사 안내",
  visit_review: "후기 작성",
  local_recommend: "지역 추천",
  info: "정보형",
  compare: "비교형",
  guide: "가이드형",
};

const PURPOSE_MAP = {
  brand: "brand_intro",
  visit: "visit_review",
  visitDrive: "visit_review",
  season: "product_intro",
  event: "event_notice",
  info: "info",
  compare: "compare",
  guide: "guide",
};

export function detectContentIntent(profile = {}, ctx = {}) {
  const blob = [
    profile.topic,
    profile.includeList?.join(" "),
    profile.purposeType,
    ctx.contentObjective,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let intent = PURPOSE_MAP[profile.purposeType] || null;

  if (/체험|후기|다녀|방문해\s*보|솔직/.test(blob)) intent = "visit_review";
  else if (/비교|vs|차이/.test(blob)) intent = "compare";
  else if (
    /가이드|알아두|방법|팁|소개|사야\s*할|고르는\s*법|종류|계절|여름|가을|봄|겨울|시즌/.test(blob)
  ) {
    intent = "guide";
  } else if (/이벤트|행사|오픈|프로모|할인/.test(blob)) intent = "event_notice";
  else if (/동네|근처|로컬|주민|맛집\s*추천|카페\s*추천|꽃집\s*추천/.test(blob)) {
    intent = "local_recommend";
  } else if (/상품|메뉴|구성|제품/.test(blob)) intent = "product_intro";
  else if (/브랜드\s*이야기|철학/.test(blob)) intent = "brand_intro";
  else if (/정보|설명|정리/.test(blob)) intent = "info";

  if (!intent) {
    if (profile.brandName && !/후기/.test(blob)) intent = "brand_intro";
    else if (profile.region) intent = "local_recommend";
    else intent = "info";
  }

  const userIntent = buildUserIntentSentence(intent, profile);
  const readerOutcome = buildReaderOutcome(intent, profile);

  return {
    locked: intent,
    label: CONTENT_INTENTS[intent],
    userIntent,
    readerOutcome,
    thesis: `${profile.topic || profile.writingSubject || "이 주제"} — ${userIntent}`,
    ok: !!intent,
  };
}

function buildUserIntentSentence(intent, profile) {
  const b = profile.brandName;
  const r = profile.region;
  const t = profile.topic || profile.mainKeyword;
  switch (intent) {
    case "visit_review":
      return `${b || r || "이곳"}을 직접 경험한 느낌을 전하고 싶다`;
    case "local_recommend":
      return `${r || "이 동네"}에서 실제로 쓸 만한 ${t || "정보"}를 추천하고 싶다`;
    case "event_notice":
      return `${b || "브랜드"}의 행사·이벤트 소식을 알리고 싶다`;
    case "product_intro":
      return `${t || b || "상품"}의 특징을 이해하기 쉽게 소개하고 싶다`;
    case "compare":
      return `${t || "선택"}을 비교할 때 참고할 기준을 정리하고 싶다`;
    case "guide":
      return `${t || "주제"}에 대해 헷갈리는 점을 가이드하고 싶다`;
    case "info":
      return `${t || "주제"}에 대한 정보를 정리해 전하고 싶다`;
    default:
      return b
        ? `${b}를 ${r ? `${r}에서 ` : ""}소개하고 싶다`
        : `${t || "브랜드"} 이야기를 전하고 싶다`;
  }
}

function buildReaderOutcome(intent, profile) {
  const b = profile.brandName;
  switch (intent) {
    case "visit_review":
      return "방문 전 참고할 포인트를 얻는다";
    case "local_recommend":
      return "근처 생활에 도움이 되는 추천을 얻는다";
    case "event_notice":
      return "행사·이벤트 참여 여부를 판단할 수 있다";
    case "compare":
    case "guide":
    case "info":
      return "선택·이해에 필요한 기준을 얻는다";
    default:
      return b ? `${b}가 어떤 곳인지 감이 잡힌다` : "막연한 정보가 장면으로 정리된다";
  }
}
