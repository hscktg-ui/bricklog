import { PUBLIC_TEST_SAMPLES } from "@/lib/publicTest/publicTestSamples";
import { resolveIndustryFromFreeText } from "@/lib/simpleIndustry";

/** topic·브랜드 키워드 → 가상 샘플 템플릿 */
const KEYWORD_TEMPLATE_RULES = [
  { re: /꽃|플로리스트|어버이날|화환|플라워/, id: "flower_gift" },
  { re: /내과|검진|병원|의원|클리닉|건강검진/, id: "clinic_visit" },
  { re: /펜션|숙박|바베큐|애월|제주\s*숙/, id: "pension_weekend" },
  { re: /미용|살롱|염색|두피|헤어|컷/, id: "salon_care" },
  { re: /베이커리|빵\s|식빵|크루아상|제과/, id: "bakery_open" },
  { re: /반려|펫|강아지|고양이|그루밍|목욕/, id: "pet_groom" },
  { re: /요가|필라테스|필라|체형|스트레칭/, id: "yoga_today" },
  { re: /한식|식당|코스\s|한옥|기와/, id: "korean_dining" },
  { re: /정비|자동차|타이어|오일\s|카센터/, id: "auto_service" },
  { re: /필라테스|재활\s*필/, id: "core_pilates" },
  { re: /카페|coffee|브런치|커피|디저트|라떼|에스프레소/, id: "cafe_brunch" },
];

const INDUSTRY_TO_SAMPLE = {
  카페: "cafe_brunch",
  꽃집: "flower_gift",
  의료: "clinic_visit",
  숙박: "pension_weekend",
  미용실: "salon_care",
  베이커리: "bakery_open",
  펫샵: "pet_groom",
  요가: "yoga_today",
  한식: "korean_dining",
  자동차: "auto_service",
  필라테스: "core_pilates",
};

function norm(s = "") {
  return String(s || "").trim();
}

function mergeTemplateWithInput(template, rawInput = {}) {
  if (!template) return null;
  const brandName = norm(rawInput.brandName) || template.brandName;
  const region = norm(rawInput.region) || template.region;
  const topic =
    norm(rawInput.topic || rawInput.mainKeyword) || template.topic;
  if (!brandName || !region || !topic) return null;

  const topicWords = topic.split(/\s+/).filter(Boolean);
  const topicTrait =
    norm(rawInput.includePhrases) ||
    (topicWords.length >= 2 ? topicWords.slice(0, 2).join(" ") : topic) ||
    template.topicTrait;

  return {
    ...template,
    brandName,
    region,
    topic,
    topicTrait,
  };
}

/**
 * 직접 입력 — 업종·키워드에 맞는 가상 템플릿 + 사용자 브랜드·지역·주제
 */
export function pickPublicTestTemplateForInput(rawInput = {}) {
  const haystack = [
    rawInput.topic,
    rawInput.mainKeyword,
    rawInput.brandName,
    rawInput.industry,
    rawInput.storeFeatures,
  ]
    .filter(Boolean)
    .join(" ");

  for (const { re, id } of KEYWORD_TEMPLATE_RULES) {
    if (!re.test(haystack)) continue;
    const template = PUBLIC_TEST_SAMPLES.find((s) => s.id === id);
    if (template) return mergeTemplateWithInput(template, rawInput);
  }

  const resolved = resolveIndustryFromFreeText(haystack);
  if (resolved?.industryLabel) {
    const sampleId = INDUSTRY_TO_SAMPLE[resolved.industryLabel];
    if (sampleId) {
      const template = PUBLIC_TEST_SAMPLES.find((s) => s.id === sampleId);
      if (template) return mergeTemplateWithInput(template, rawInput);
    }
  }

  return mergeTemplateWithInput(PUBLIC_TEST_SAMPLES[0], rawInput);
}
