const GENERAL_CATEGORIES = [
  "카페",
  "꽃집",
  "음식점",
  "미용실",
  "학원",
  "가구점",
  "인테리어",
  "헬스장",
  "광고대행사",
  "온라인 쇼핑몰",
  "펜션",
  "공방",
];

const SENSITIVE_CATEGORIES = [
  "병원",
  "약국",
  "법률",
  "세무",
  "노무",
  "부동산",
  "금융",
  "보험",
  "건강기능식품",
];

const PERSONAS = [
  { id: "brand_story", label: "브랜드 소개형", v4Speaker: "brand_intro" },
  { id: "visit_review", label: "방문 후기형", v4Speaker: "real_use" },
  { id: "info_intro", label: "정보 제공형", v4Speaker: "expert_info" },
  { id: "local_guide", label: "지역 추천형", v4Speaker: "local_blogger" },
  { id: "info_intro", label: "매거진형", v4Speaker: "magazine" },
  { id: "visit_review", label: "담백한 후기형", v4Speaker: "plain_review" },
];

const EMOTIONS = [
  { label: "담백함", key: "plain", tone: "informative" },
  { label: "따뜻함", key: "warm", tone: "emotional" },
  { label: "신뢰감", key: "trust", tone: "trust" },
  { label: "전문성", key: "pro", tone: "informative" },
  { label: "유쾌함", key: "playful", tone: "lifestyle" },
  { label: "고급스러움", key: "premium", tone: "premium" },
  { label: "차분함", key: "calm", tone: "trust" },
];

const PURPOSES = [
  { value: "brand", label: "브랜드 소개" },
  { value: "season", label: "시즌 콘텐츠" },
  { value: "visitDrive", label: "방문 유도" },
  { value: "info", label: "정보형" },
  { value: "review", label: "후기형" },
  { value: "newOpen", label: "신규 오픈" },
];

const CHANNELS = ["blog", "place", "instagram"];

const REGIONS = [
  "강남",
  "홍대",
  "부산 해운대",
  "대구 동성로",
  "제주 애월",
  "인천 송도",
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function inputFingerprint(input) {
  return JSON.stringify({
    industry: input.industry,
    region: input.region,
    mainKeyword: input.mainKeyword,
    persona: input.contentPersona,
    channel: input._channel,
  });
}

export function getCategoryPools(includeSensitive = true) {
  return includeSensitive
    ? [...GENERAL_CATEGORIES, ...SENSITIVE_CATEGORIES]
    : [...GENERAL_CATEGORIES];
}

export function generateTrainingInput(options = {}, seen = new Set()) {
  const categories = getCategoryPools(options.includeSensitive !== false);
  let attempt = 0;
  while (attempt < 40) {
    const industry = pick(categories);
    const region = pick(REGIONS);
    const brandName = `${region} ${industry} ${pick(["하우스", "스튜디오", "라운지", "공방", "살롱"])}`;
    const persona = pick(PERSONAS);
    const emotion = pick(EMOTIONS);
    const purpose = pick(PURPOSES);
    const channel = pick(
      options.channels?.length ? options.channels : CHANNELS
    );
    const mainKeyword = `${region} ${industry}`;
    const input = {
      brandType: /법률|세무|노무|금융|보험|병원|약국/.test(industry)
        ? "professional"
        : "local_store",
      industry,
      region,
      brandName,
      mainKeyword,
      subKeyword: `${industry}, ${region} 추천`,
      topic: mainKeyword,
      purpose: purpose.value,
      tone: emotion.tone,
      includePhrases: "시즌 이벤트, 단골 혜택, 방문 포인트",
      excludePhrases: "최고, 1등, 무조건",
      brandDescription: `${brandName} — ${industry} 전문`,
      storeFeatures: `${region} 로컬 ${industry}`,
      contentPersona: persona.id,
      v4Speaker: persona.v4Speaker,
      emotionTemperature: emotion.key,
      _channel: channel,
      _category: industry,
      _personaLabel: persona.label,
      _emotionLabel: emotion.label,
      _purposeLabel: purpose.label,
    };
    const fp = inputFingerprint(input);
    if (!seen.has(fp)) {
      seen.add(fp);
      return {
        input,
        channel,
        industry,
        persona: persona.label,
        emotion: emotion.label,
        fingerprint: fp,
      };
    }
    attempt += 1;
  }
  const fallback = generateTrainingInput({ ...options, includeSensitive: false }, seen);
  return fallback;
}

export { GENERAL_CATEGORIES, SENSITIVE_CATEGORIES, PERSONAS, CHANNELS };
