/**
 * 카테고리 × 성별 × 연령 페르소나 10종 — humanity/QA용
 * (기존 humanity: 가구·꽃·치과·반려카페·한식·요가·미용·학원 제외)
 */

/** @typedef {{ gender: 'female'|'male', ageBand: '20s'|'30s'|'40s'|'50s', label: string, speechStyle: string, emotionTemperature: string, v4Speaker: string, contentPerspective?: string }} DemographicPersona */

/** @type {Array<{ id: string, label: string, industry: string, input: object, persona: DemographicPersona }>} */
export const PERSONA_DEMOGRAPHIC_SCENARIOS = [
  {
    id: "cafe_20f",
    label: "카페 · 20대 여성",
    industry: "카페/디저트",
    persona: {
      gender: "female",
      ageBand: "20s",
      label: "20대 여성",
      speechStyle: "friendly_blog",
      emotionTemperature: "excited",
      v4Speaker: "essay",
      contentPerspective: "customer",
    },
    input: {
      brandName: "오후세시",
      region: "성수",
      topic: "봄 시즌 디저트·브런치",
      mainKeyword: "성수 디저트 카페",
      industry: "카페/디저트",
    },
  },
  {
    id: "interior_30m",
    label: "인테리어 · 30대 남성",
    industry: "인테리어/리모델링",
    persona: {
      gender: "male",
      ageBand: "30s",
      label: "30대 남성",
      speechStyle: "friendly_blog",
      emotionTemperature: "trust",
      v4Speaker: "column",
      contentPerspective: "comparison",
    },
    input: {
      brandName: "우드앤라이트",
      region: "판교",
      topic: "거실 리모델링 상담",
      industry: "인테리어/리모델링",
    },
  },
  {
    id: "pension_40f",
    label: "펜션 · 40대 여성",
    industry: "펜션/숙박",
    persona: {
      gender: "female",
      ageBand: "40s",
      label: "40대 여성",
      speechStyle: "experience_share",
      emotionTemperature: "warm",
      v4Speaker: "plain_review",
      contentPerspective: "storytelling",
    },
    input: {
      brandName: "바람언덕펜션",
      region: "양평",
      topic: "가족 여행 숙소 추천",
      industry: "펜션/숙박",
    },
  },
  {
    id: "workshop_20m",
    label: "공방 · 20대 남성",
    industry: "공방/원데이클래스",
    persona: {
      gender: "male",
      ageBand: "20s",
      label: "20대 남성",
      speechStyle: "friendly_blog",
      emotionTemperature: "playful",
      v4Speaker: "real_use",
      contentPerspective: "customer",
    },
    input: {
      brandName: "손끝공방",
      region: "전주",
      topic: "가죽 소품 원데이 클래스",
      industry: "공방/원데이클래스",
    },
  },
  {
    id: "pharmacy_50f",
    label: "약국 · 50대 여성",
    industry: "약국/건강",
    persona: {
      gender: "female",
      ageBand: "50s",
      label: "50대 여성",
      speechStyle: "experience_share",
      emotionTemperature: "trust",
      v4Speaker: "expert_info",
      contentPerspective: "informational",
    },
    input: {
      brandName: "온누리약국",
      region: "수원",
      topic: "겨울철 면역·영양제 상담",
      industry: "약국/건강",
    },
  },
  {
    id: "realestate_40m",
    label: "부동산 · 40대 남성",
    industry: "부동산/중개",
    persona: {
      gender: "male",
      ageBand: "40s",
      label: "40대 남성",
      speechStyle: "magazine_tone",
      emotionTemperature: "calm",
      v4Speaker: "column",
      contentPerspective: "comparison",
    },
    input: {
      brandName: "한빛공인중개사",
      region: "분당",
      topic: "전세 매물 상담 안내",
      industry: "부동산/중개",
    },
  },
  {
    id: "hospital_30f",
    label: "병원 · 30대 여성",
    industry: "병원/내과",
    persona: {
      gender: "female",
      ageBand: "30s",
      label: "30대 여성",
      speechStyle: "friendly_blog",
      emotionTemperature: "trust",
      v4Speaker: "expert_info",
      contentPerspective: "informational",
    },
    input: {
      brandName: "연세내과의원",
      region: "일산",
      topic: "건강검진·내시경 예약 안내",
      industry: "병원/내과",
    },
  },
  {
    id: "retail_20f",
    label: "패션 · 20대 여성",
    industry: "리테일/패션",
    persona: {
      gender: "female",
      ageBand: "20s",
      label: "20대 여성",
      speechStyle: "friendly_blog",
      emotionTemperature: "excited",
      v4Speaker: "plain_review",
      contentPerspective: "review",
    },
    input: {
      brandName: "모노웨ar",
      region: "홍대",
      topic: "겨울 아우터 신상 입고",
      industry: "리테일/패션",
    },
  },
  {
    id: "legal_50m",
    label: "법률 · 50대 남성",
    industry: "법률/상담",
    persona: {
      gender: "male",
      ageBand: "50s",
      label: "50대 남성",
      speechStyle: "polite_explain",
      emotionTemperature: "pro",
      v4Speaker: "expert_info",
      contentPerspective: "expert",
    },
    input: {
      brandName: "법률사무소 바른",
      region: "서초",
      topic: "임대차 분쟁 초기 상담",
      industry: "법률/상담",
    },
  },
  {
    id: "ecommerce_30f",
    label: "쇼핑몰 · 30대 여성",
    industry: "온라인/쇼핑몰",
    persona: {
      gender: "female",
      ageBand: "30s",
      label: "30대 여성",
      speechStyle: "friendly_blog",
      emotionTemperature: "friendly",
      v4Speaker: "magazine",
      contentPerspective: "brand",
    },
    input: {
      brandName: "데일리루틴",
      region: "온라인",
      topic: "겨울 스킨케어 기획전",
      industry: "온라인/쇼핑몰",
    },
  },
];

/** 페르소나 필드를 입력에 병합 */
export function mergeDemographicPersonaInput(scenario) {
  const { input, persona } = scenario;
  const genderKo = persona.gender === "female" ? "여성" : "남성";
  const targetAudience = `${persona.ageBand.replace("s", "대")} ${genderKo}`;
  return {
    ...input,
    blogLengthTier: input.blogLengthTier || "medium",
    writerGender: persona.gender,
    writerAgeBand: persona.ageBand,
    writerPersonaLabel: persona.label,
    targetAudience,
    speechStyle: persona.speechStyle,
    emotionTemperature: persona.emotionTemperature,
    v4Speaker: persona.v4Speaker,
    contentPerspective: persona.contentPerspective || input.contentPerspective || "auto",
  };
}

export function listPersonaDemographicIndustries() {
  return PERSONA_DEMOGRAPHIC_SCENARIOS.map((s) => s.industry);
}
