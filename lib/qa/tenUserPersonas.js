/**
 * 10명 실사용자 페르소나 — 채널·품질·V12 조사 스모크 공유 정의
 * @see scripts/simulate-persona-channels.mjs
 * @see scripts/check-ten-personas-v12.mjs
 */

export const TEN_USER_PERSONAS = [
  {
    id: "p1_cafe",
    label: "강남 카페 사장",
    v4Speaker: "brand_intro",
    input: {
      brandName: "모닝브루 강남",
      region: "강남",
      industry: "카페",
      topic: "봄 시즌 브런치 메뉴",
      mainKeyword: "강남 브런치 카페",
      purpose: "visitDrive",
      tone: "emotional",
    },
  },
  {
    id: "p2_salon",
    label: "홍대 미용실 원장",
    v4Speaker: "real_use",
    input: {
      brandName: "레이어드살롱",
      region: "홍대",
      industry: "미용실",
      topic: "시즌 컬러 이벤트",
      mainKeyword: "홍대 염색",
      purpose: "season",
      tone: "trust",
    },
  },
  {
    id: "p3_academy",
    label: "대구 학원 원장",
    v4Speaker: "expert_info",
    input: {
      brandName: "수학플러스",
      region: "대구 동성로",
      industry: "학원",
      topic: "여름방학 특강 모집",
      mainKeyword: "대구 수학학원",
      purpose: "info",
      tone: "informative",
    },
  },
  {
    id: "p4_flower",
    label: "꽃집 마케터",
    v4Speaker: "plain_review",
    input: {
      brandName: "플로라하우스",
      region: "부산 해운대",
      industry: "꽃집",
      topic: "어버이날 꽃다발 예약",
      mainKeyword: "해운대 꽃집",
      purpose: "season",
      tone: "emotional",
      instaScene: "매장 픽업 장면",
    },
  },
  {
    id: "p5_pension",
    label: "제주 펜션 운영",
    v4Speaker: "local_blogger",
    input: {
      brandName: "애월바다펜션",
      region: "제주 애월",
      industry: "펜션",
      topic: "비수기 장박 할인",
      mainKeyword: "제주 펜션",
      purpose: "visitDrive",
      tone: "lifestyle",
    },
  },
  {
    id: "p6_clinic",
    label: "병원 마케팅 (민감)",
    v4Speaker: "expert_info",
    sensitiveIndustry: true,
    input: {
      brandName: "연세정형외과",
      region: "인천 송도",
      industry: "병원",
      topic: "무릎 통증 상담 안내",
      mainKeyword: "송도 정형외과",
      purpose: "info",
      tone: "trust",
      sensitiveCategory: "medical",
    },
  },
  {
    id: "p7_agency",
    label: "광고대행사 B2B",
    v4Speaker: "magazine",
    input: {
      brandName: "브릭애드",
      region: "강남",
      industry: "광고대행사",
      topic: "로컬 브랜드 콘텐츠 패키지",
      mainKeyword: "로컬 마케팅",
      purpose: "brand",
      tone: "premium",
    },
  },
  {
    id: "p8_craft",
    label: "공방 작가",
    v4Speaker: "essay",
    input: {
      brandName: "도자기온",
      region: "이천",
      industry: "공방",
      topic: "원데이 클래스 오픈",
      mainKeyword: "도자기 클래스",
      purpose: "newOpen",
      tone: "emotional",
    },
  },
  {
    id: "p9_restaurant",
    label: "음식점 점주",
    v4Speaker: "plain_review",
    input: {
      brandName: "한상차림",
      region: "강남",
      industry: "음식점",
      topic: "점심 특선 리뉴얼",
      mainKeyword: "강남 한식",
      purpose: "visitDrive",
      tone: "informative",
      placePeriod: "5월 한 달",
      placeOffer: "점심 특선 9,900원",
    },
  },
  {
    id: "p10_shop",
    label: "온라인 쇼핑몰 MD",
    v4Speaker: "column",
    input: {
      brandName: "데일리핏몰",
      region: "서울",
      industry: "온라인 쇼핑몰",
      topic: "여름 운동복 출시",
      mainKeyword: "운동복 추천",
      purpose: "season",
      tone: "lifestyle",
      instaHookAngle: "착샷 비포애프터",
    },
  },
];

export function getTenUserPersona(id) {
  return TEN_USER_PERSONAS.find((p) => p.id === id);
}
