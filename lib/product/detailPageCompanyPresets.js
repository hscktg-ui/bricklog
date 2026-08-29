/**
 * 눌러 채워보는 상품 예시만. 해신·HOME100·BRICLOG OS 양식은 두지 않는다.
 * 상세페이지는 월간 콘텐츠 운영이 아니라, 고르는 손님이 보는 상품 화면이다.
 */
export const DETAIL_PAGE_OPEN_EXAMPLES = [
  {
    id: "open-rice",
    label: "포장 쌀",
    productName: "여주 햅쌀 10kg",
    brandName: "우리쌀가게",
    region: "여주",
    industry: "쌀가게",
    target: "집밥 차리는 손님",
    searchIntent: "포장만 보고 밥맛까지는 가늠이 안 된다",
    features: "당일 도정\n진공 포장\n여주 수확",
    highlights: "진공 포장 그대로 집까지\n주문 당일 도정",
    accent: "#3f6b4a",
    pageLength: "standard",
    price: "32,900원",
    options: "10kg / 20kg",
    weight: "10kg",
    origin: "여주",
    variety: "진상",
    ingredient: "쌀",
    producer: "우리쌀가게",
    process: "주문 당일 도정",
    pack: "진공 포장",
    storage: "직사광선을 피한 서늘한 곳",
    milledAt: "주문 당일 도정",
    shipping: "3,000원 · 3만원 이상 무료",
    dispatch: "평일 오후 2시 이전 주문 당일 출고",
    exchange: "단순 변심 7일. 개봉한 쌀은 교환되지 않습니다",
    shelfLife: "도정일로부터 1년",
    caution: "개봉 후 서늘한 곳에 두고, 개봉한 쌀은 교환되지 않습니다",
    islandShipping: "3,500원 추가",
  },
  {
    id: "open-beans",
    label: "원두",
    productName: "하우스 블렌드 원두 200g",
    brandName: "골목카페",
    region: "여주",
    industry: "카페",
    target: "집에서 내려 마시는 손님",
    searchIntent: "향은 좋은데, 집에서 어떻게 내려야 할지 모르겠다",
    features: "중배전 블렌드\n주문 후 분쇄 가능\n당일 로스팅 안내",
    highlights: "주문 후 분쇄\n당일 로스팅",
    accent: "#5c4033",
    pageLength: "standard",
    price: "14,500원",
    options: "홀빈 / 에스프레소 / 핸드드립",
    weight: "200g",
    origin: "블렌드",
    ingredient: "커피 원두",
    producer: "골목카페",
    process: "중배전",
    pack: "밸브 포장",
    storage: "직사광선·습기를 피한 실온, 개봉 후 밀봉",
    madeOn: "주문 당일 로스팅",
    shipping: "3,000원 · 3만원 이상 무료",
    dispatch: "로스팅 당일 출고",
    exchange: "개봉 원두는 교환되지 않습니다. 파손만 7일",
    shelfLife: "로스팅일로부터 한 달 안에 마시는 것을 권합니다",
    caution: "생두 특성상 개봉 후 교환되지 않습니다",
    islandShipping: "3,500원 추가",
  },
];

export function getDetailPageExample(id) {
  return DETAIL_PAGE_OPEN_EXAMPLES.find((p) => p.id === String(id || "")) || null;
}

export function resolveDetailPageSampleId(id) {
  return getDetailPageExample(id)?.id || DETAIL_PAGE_OPEN_EXAMPLES[0].id;
}

export function detailPageSampleSrc(id) {
  const resolved = resolveDetailPageSampleId(id);
  const base = "/detail/sample";
  return resolved === DETAIL_PAGE_OPEN_EXAMPLES[0].id
    ? base
    : `${base}?id=${encodeURIComponent(resolved)}`;
}

export function detailPageSamplePageSrc(id, crop = "hero") {
  const resolved = resolveDetailPageSampleId(id);
  const kind = crop === "full" || crop === "mid" ? crop : "hero";
  return `/detail-sample/${resolved}-page-${kind}.png`;
}

export function getDetailPageCompanyPreset(id) {
  return getDetailPageExample(id);
}
