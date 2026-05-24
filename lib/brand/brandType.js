/** 브랜드 유형 — 업종 드롭다운 대신 1차 분류 */

export const BRAND_TYPE_OPTIONS = [
  {
    value: "local_store",
    label: "로컬 매장",
    businessType: "localVisit",
    hint: "동네 매장·상권·방문",
  },
  {
    value: "professional",
    label: "전문 서비스",
    businessType: "service",
    hint: "세무·법무·상담·의뢰",
  },
  {
    value: "online_shop",
    label: "온라인 쇼핑몰",
    businessType: "brand",
    hint: "자사몰·D2C·배송",
  },
  {
    value: "brand_hq",
    label: "브랜드 본사",
    businessType: "brand",
    hint: "브랜드 스토리·본사 소통",
  },
  {
    value: "franchise",
    label: "프랜차이즈",
    businessType: "brand",
    hint: "가맹·본부·매장 네트워크",
  },
  {
    value: "corporate",
    label: "기업/법인",
    businessType: "b2b",
    hint: "B2B·제안·기업 소개",
  },
  {
    value: "creator",
    label: "콘텐츠 크리에이터",
    businessType: "info",
    hint: "크리에이터·미디어·채널",
  },
  {
    value: "other",
    label: "기타",
    businessType: "localVisit",
    hint: "위에 없는 브랜드",
  },
];

export function getBrandTypeOption(value) {
  return (
    BRAND_TYPE_OPTIONS.find((o) => o.value === value) ||
    BRAND_TYPE_OPTIONS.find((o) => o.value === "other")
  );
}
