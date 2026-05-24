import {
  LAB_RESEARCH_CATEGORIES,
  LAB_SENSITIVE_CATEGORIES,
  LAB_PERSONAS,
  LAB_EMOTIONS,
} from "@/lib/evolution-lab/constants";

const REGIONS = ["강남", "홍대", "판교", "부산 서면", "대구 동성로", "제주"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fingerprint(input) {
  return [
    input.industry,
    input.region,
    input.contentPersona,
    input.emotionTemperature,
    input.purpose,
  ].join("|");
}

export function generateLabInput(options = {}, seen = new Set()) {
  const pool = [
    ...LAB_RESEARCH_CATEGORIES,
    ...(options.includeSensitive ? LAB_SENSITIVE_CATEGORIES : []),
  ];
  const categories = options.categories?.length
    ? options.categories.filter((c) => pool.includes(c))
    : pool;

  for (let i = 0; i < 50; i++) {
    const industry = pick(categories.length ? categories : pool);
    const region = pick(REGIONS);
    const persona = pick(LAB_PERSONAS);
    const emotion = pick(LAB_EMOTIONS);
    const brandName = `${region} ${industry} ${pick(["하우스", "스튜디오", "살롱", "라운지"])}`;

    const input = {
      brandType: "local_store",
      industry,
      region,
      brandName,
      mainKeyword: `${region} ${industry}`,
      subKeyword: `${industry}, ${region} 추천`,
      topic: `${region} ${industry}`,
      purpose: pick(["season", "visitDrive", "info", "review", "brand"]),
      tone: emotion === "고급스러움" ? "premium" : "emotional",
      includePhrases: "시즌 소식, 방문 포인트, 단골 혜택",
      excludePhrases: "최고, 1등, 무조건",
      brandDescription: `${brandName} — ${industry} 브랜드`,
      storeFeatures: `${region} 로컬 ${industry}`,
      contentPersona: persona.id,
      v4Speaker: persona.id,
      emotionTemperature: emotion,
      _labPersonaLabel: persona.label,
      _labEmotionLabel: emotion,
    };

    const fp = fingerprint(input);
    if (!seen.has(fp)) {
      seen.add(fp);
      return {
        input,
        industry,
        persona: persona.label,
        emotion,
        fingerprint: fp,
      };
    }
  }

  return generateLabInput(
    { ...options, includeSensitive: false },
    seen
  );
}
