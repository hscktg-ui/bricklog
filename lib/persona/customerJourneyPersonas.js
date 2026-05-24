/**
 * 고객군별 여정 테스트용 3인 페르소나 — 시작점·피드백·붙여넣기 초안 포함
 * scripts/simulate-three-persona-journeys.mjs · QA 문서에서 공유
 */

export const CUSTOMER_JOURNEY_PERSONAS = [
  {
    id: "journey_cafe_gangnam",
    label: "민지 — 강남 로컬 카페 사장",
    category: "카페·F&B",
    entryPoint: "blog",
    v4Speaker: "brand_intro",
    feedback: [
      "플레이스는 더 짧고 담백하게 써줘",
      "인스타는 이모지 조금만 넣어줘",
    ],
    input: {
      brandName: "모닝브루 강남",
      region: "강남",
      industry: "카페",
      topic: "봄 시즌 브런치·디저트 라인업",
      mainKeyword: "강남 브런치 카페",
      purpose: "visitDrive",
      tone: "emotional",
      blogLengthTier: "medium",
    },
    pasteDraft: null,
  },
  {
    id: "journey_clinic_songdo",
    label: "박원장 — 송도 정형외과 (민감 업종)",
    category: "의료·클리닉",
    entryPoint: "paste_place",
    v4Speaker: "expert_info",
    feedback: [
      "의료 광고 느낌 줄이고 키워드는 덜 넣어줘",
      "상담 안내만 담백하게",
    ],
    input: {
      brandName: "연세정형외과",
      region: "인천 송도",
      industry: "병원",
      topic: "무릎 통증 상담 안내",
      mainKeyword: "송도 정형외과",
      purpose: "info",
      tone: "trust",
      sensitiveCategory: "medical",
      excludePhrases: "완치, 100%, 최고, 무조건",
    },
    pasteDraft: {
      channel: "place",
      placeTitle: "연세정형외과 송도",
      placeShort:
        "무릎 통증으로 고민이시면 송도 정형외과에서 정확한 진단과 최고의 치료를 받으세요. 완치 보장 상담 100% 만족.",
      placeDetail:
        "송도 정형외과 무릎 통증 전문. 송도 정형외과 예약은 전화 문의. 송도 최고 병원.",
    },
  },
  {
    id: "journey_flower_haeundae",
    label: "수아 — 해운대 꽃집 마케터",
    category: "꽃집·이커머스",
    entryPoint: "instagram",
    v4Speaker: "plain_review",
    feedback: [
      "블로그는 정보형으로 차분하게",
      "해시태그는 부산·해운대 로컬 위주로",
    ],
    input: {
      brandName: "꽃담",
      region: "부산 해운대",
      industry: "꽃집",
      topic: "어버이날 꽃다발 예약",
      mainKeyword: "해운대 꽃집",
      purpose: "season",
      tone: "emotional",
      instaScene: "매장 픽업·포장 장면",
      instaHookAngle: "어버이날 마감 임박",
    },
    pasteDraft: null,
  },
];

export function getJourneyPersona(id) {
  return CUSTOMER_JOURNEY_PERSONAS.find((p) => p.id === id);
}
