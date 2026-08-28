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
    accent: "#03a94d",
    pageLength: "standard",
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
    accent: "#5c4033",
    pageLength: "standard",
  },
];

export function getDetailPageExample(id) {
  return DETAIL_PAGE_OPEN_EXAMPLES.find((p) => p.id === id) || null;
}

export function getDetailPageCompanyPreset(id) {
  return getDetailPageExample(id);
}
