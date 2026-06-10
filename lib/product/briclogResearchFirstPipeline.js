/**
 * BRICLOG ENGINE REBUILD V2 — RESEARCH FIRST SYSTEM
 *
 * 글을 먼저 쓰지 않는다. 조사 → 정리 → 아웃라인 → 작성.
 * Research First · Writing Second · Quality Third
 */
import { detectContentIntent } from "@/lib/pipeline/v2/intentDetection";
import { shieldUtilizeGuidePhrase } from "@/lib/content/placeholderContaminationEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { buildCustomerQuestionAnalysis } from "@/lib/content/customerQuestionEngine";
import { isFlowerRecommendationTopic } from "@/lib/product/flowerRecommendationProseEngine";
import { isFurnitureChairProductTopic } from "@/lib/product/furnitureProductProseEngine";
import { allowsMissionProseDespiteThinResearch } from "@/lib/product/missionProseRouteFlags";
import {
  isBriclogResearchFirstEnforced,
  RESEARCH_FIRST_VERSION,
  RESEARCH_FIRST_WITHHOLD_MESSAGE,
  RESEARCH_FIRST_BRAND_MISSING_MESSAGE,
  RESEARCH_FIRST_INDUSTRY_GAP_MESSAGE,
} from "@/lib/config/researchFirstFlags";
import {
  buildContentOperatingPlan,
  formatContentOperatingPlanBrief,
} from "@/lib/product/briclogBrandContentOS";

export const RESEARCH_FIRST_STEP_LABELS = [
  "사용자 입력 분석",
  "검색 의도 분석",
  "조사 항목 생성",
  "브랜드 정보 조회",
  "지역 정보 조회",
  "계절 정보 조회",
  "조사 결과 정리",
  "아웃라인 생성",
  "글 작성",
];

/** placeholder·추상 문구 — 발견 시 FAIL */
export const RESEARCH_FIRST_PLACEHOLDER_FAIL_RES = [
  /(?<![가-힣])이용(?=\s*(?:을|를|은|는|이|가|과|와|·|—|관련|볼|기준|선택|안내|$))/,
  /좋은내용/,
  /전시\s*소식/,
  /이\s*구성/,
  /관련해서/,
  /조건\s*및\s*구성/,
  /중립적으로\s*정리/,
  /비교가\s*수월해요/,
];

export const RESEARCH_FIRST_ABSTRACT_BAN_RES = [
  /특별한\s*경험/,
  /소중한\s*순간/,
  /감동을\s*선사/,
  /일상의\s*활력/,
  /잊을\s*수\s*없는/,
  /특별한\s*순간/,
];

const FLOWER_NAME_RES = [
  /장미/, /튤립/, /해바라기/, /백합/, /카네이션/, /수국/,
  /리시안셔스/, /안개꽃/, /거베라/, /국화/, /프리지아/, /라넌큘러스/,
];

const SEASON_KEYWORDS = {
  summer: /여름|summer/i,
  spring: /봄|spring/i,
  autumn: /가을|autumn|fall/i,
  winter: /겨울|winter/i,
};

function detectSeason(input = {}) {
  const blob = `${input.topic || ""} ${input.mainKeyword || ""}`;
  for (const [season, re] of Object.entries(SEASON_KEYWORDS)) {
    if (re.test(blob)) return season;
  }
  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

function tokenizeBrandDbFacts(input = {}) {
  const tokens = [];
  const brand = String(input.brandName || "").trim();
  if (brand) tokens.push({ key: "brand", value: brand });
  const region = String(input.region || "").trim();
  if (region && region !== "전국") tokens.push({ key: "region", value: region });
  for (const part of String(input.storeFeatures || "")
    .split(/[,，·|/|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    tokens.push({ key: "store_feature", value: part });
  }
  for (const part of String(input.brandDescription || "")
    .split(/[,，·|/|\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2 && s.length <= 40)) {
    tokens.push({ key: "brand_description", value: part });
  }
  for (const m of String(input.storeFeatures || "").match(/\d+\s*시간|무인|만원|24시간/gi) || []) {
    tokens.push({ key: "operating", value: m.trim() });
  }
  return tokens;
}

/** STEP 1 */
export function analyzeUserInput(input = {}) {
  return {
    region: String(input.region || "").trim(),
    brand: String(input.brandName || "").trim(),
    topic:
      String(input.topic || "").trim() ||
      String(input.mainKeyword || "").trim(),
    industry: resolveBriclogIndustryKey(input),
    storeFeatures: String(input.storeFeatures || "").trim(),
  };
}

/** STEP 2 */
export function analyzeSearchIntent(input = {}) {
  const intent = detectContentIntent(input, input);
  const questions = buildCustomerQuestionAnalysis(input, {
    researchFacts: input.researchFacts,
  });
  const subQuestions = (questions?.questions || questions?.coverage || [])
    .map((q) => String(q?.question || q?.label || q).trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    primary: intent.locked || intent.primary || "info",
    label: intent.label,
    userIntent: intent.userIntent,
    readerOutcome: intent.readerOutcome,
    subQuestions,
  };
}

/** STEP 3 — 조사 리스트 (추정 금지: 확인된 항목·업종 체크리스트만) */
export function buildResearchChecklist(input = {}, industryKey) {
  const key = industryKey || resolveBriclogIndustryKey(input);
  const topic = `${input.topic || ""} ${input.mainKeyword || ""}`;
  const items = [];

  if (key === "flower" || key === "unmanned_flower" || /꽃|플라워/.test(topic)) {
    const season = detectSeason(input);
    const seasonal =
      season === "summer"
        ? ["수국", "해바라기", "리시안셔스", "거베라"]
        : season === "spring"
          ? ["튤립", "프리지아", "장미", "안개꽃"]
          : ["장미", "카네이션", "국화", "수국"];
    items.push(
      ...seasonal.map((name) => ({ id: `flower_${name}`, label: name, axis: "flower_name" })),
      { id: "flower_care", label: "꽃 보관·관리 방법", axis: "care" },
      { id: "flower_season", label: `${season} 꽃 특징`, axis: "season" }
    );
  }

  if (key === "cafe" || key === "tea_cafe" || key === "pet_cafe") {
    items.push(
      { id: "cafe_menu", label: "대표 메뉴", axis: "menu" },
      { id: "cafe_mood", label: "매장 분위기·좌석", axis: "atmosphere" },
      { id: "cafe_visit", label: "방문 이유", axis: "visit_reason" }
    );
    if (/신메뉴|시즌\s*메뉴|여름\s*메뉴|겨울\s*메뉴/.test(topic)) {
      items.push(
        { id: "cafe_new_menu", label: "신메뉴 구성·특징", axis: "menu" },
        { id: "cafe_season_drink", label: "시즌 음료·디저트", axis: "menu" },
        { id: "cafe_try_reason", label: "신메뉴 선택 이유", axis: "visit_reason" }
      );
    }
  }

  if (/기획|마케팅|브랜드\s*블로그|콘텐츠\s*운영/.test(topic)) {
    items.push(
      { id: "blog_ops", label: "블로그 운영 포인트", axis: "strategy" },
      { id: "content_plan", label: "콘텐츠 기획 방향", axis: "strategy" },
      { id: "brand_voice", label: "브랜드 톤·차별점", axis: "brand" }
    );
  }

  if (key === "furniture") {
    items.push(
      { id: "furniture_experience", label: "체험 포인트", axis: "experience" },
      { id: "furniture_compare", label: "비교 기준", axis: "compare" },
      { id: "furniture_use", label: "사용 상황", axis: "use_case" }
    );
  }

  if (key === "salon") {
    items.push(
      { id: "salon_scalp", label: "두피·모발 상태", axis: "care" },
      { id: "salon_color", label: "염색·펌 옵션", axis: "service" },
      { id: "salon_booking", label: "예약·상담 시간", axis: "ops" }
    );
  }

  if (key === "hospital") {
    items.push(
      { id: "hospital_symptom", label: "증상·목적", axis: "care" },
      { id: "hospital_consult", label: "상담·진료 흐름", axis: "ops" },
      { id: "hospital_prep", label: "방문 전 준비", axis: "visit_reason" }
    );
  }

  if (key === "pet" || key === "snack") {
    items.push(
      { id: "pet_ingredient", label: "원재료·성분", axis: "product" },
      { id: "pet_feeding", label: "급여 방법", axis: "care" },
      { id: "pet_allergy", label: "알레르기·주의", axis: "care" }
    );
  }

  if (key === "restaurant") {
    items.push(
      { id: "rest_menu", label: "대표 메뉴", axis: "menu" },
      { id: "rest_seat", label: "좌석·예약", axis: "ops" },
      { id: "rest_parking", label: "주차·위치", axis: "visit_reason" }
    );
  }

  if (key === "pension") {
    items.push(
      { id: "pen_room", label: "객실 구성", axis: "product" },
      { id: "pen_bbq", label: "바베큐·취사", axis: "ops" },
      { id: "pen_book", label: "예약·체크인", axis: "visit_reason" }
    );
  }

  if (key === "education") {
    items.push(
      { id: "edu_level", label: "레벨·반 편성", axis: "service" },
      { id: "edu_goal", label: "학습 목표", axis: "strategy" },
      { id: "edu_trial", label: "체험·상담", axis: "ops" }
    );
  }

  if (key === "craft") {
    items.push(
      { id: "craft_time", label: "소요 시간", axis: "ops" },
      { id: "craft_level", label: "난이도", axis: "service" },
      { id: "craft_take", label: "완성품 수령", axis: "product" }
    );
  }

  if (key === "construction") {
    items.push(
      { id: "con_scope", label: "공사 범위", axis: "service" },
      { id: "con_quote", label: "견적 항목", axis: "compare" },
      { id: "con_schedule", label: "일정·입주", axis: "ops" }
    );
  }

  if (key === "tea_cafe") {
    items.push(
      { id: "tea_menu", label: "차·티코스", axis: "menu" },
      { id: "tea_mood", label: "공간 분위기", axis: "atmosphere" },
      { id: "tea_season", label: "시즌 추천", axis: "season" }
    );
  }

  if (key === "pet_cafe") {
    items.push(
      { id: "pc_rules", label: "입장 규정", axis: "ops" },
      { id: "pc_space", label: "놀이 공간", axis: "atmosphere" },
      { id: "pc_size", label: "견종·체중 제한", axis: "service" }
    );
  }

  for (const f of collectMergedResearchFacts(input)) {
    const text = String(f?.fact || f).trim();
    if (text.length >= 4) {
      items.push({ id: `fact_${items.length}`, label: text.slice(0, 80), axis: f?.axis || "research", source: f?.source });
    }
  }

  const seen = new Set();
  return items.filter((it) => {
    const k = `${it.axis}:${it.label}`.slice(0, 64);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function matchChecklistItem(item, corpus = "") {
  const label = String(item.label || "");
  if (label.length >= 2 && corpus.includes(label)) return true;
  if (item.axis === "flower_name" && corpus.includes(label)) return true;
  if (item.axis === "menu" && /메뉴|라떼|브런치|음료|디저트|원두/.test(corpus)) return true;
  if (item.axis === "atmosphere" && /분위기|인테리어|좌석|테라스|조명/.test(corpus)) return true;
  if (item.axis === "visit_reason" && /방문|찾|이유|추천/.test(corpus)) return true;
  if (item.axis === "care" && /보관|관리|물\s*갈이|시들|유지/.test(corpus)) return true;
  if (item.axis === "experience" && /체험|앉아|누워|쇼룸|직접/.test(corpus)) return true;
  if (item.axis === "compare" && /비교|기준|차이/.test(corpus)) return true;
  if (item.axis === "use_case" && /상황|용도|거실|침실|다이닝/.test(corpus)) return true;
  if (item.axis === "strategy" && /운영|기획|콘텐츠|브랜드|톤|차별/.test(corpus)) return true;
  if (item.axis === "brand" && /브랜드|톤|차별|특징/.test(corpus)) return true;
  if (item.axis === "service" && /상담|시술|수업|체험|견적|코스|제한/.test(corpus)) return true;
  if (item.axis === "product" && /메뉴|객실|간식|원료|완성/.test(corpus)) return true;
  if (item.axis === "care" && /관리|급여|두피|증상|알레르기|보관/.test(corpus)) return true;
  if (item.axis === "research" && label.length >= 8 && corpus.includes(label.slice(0, 12))) return true;
  return false;
}

/** STEP 7 — 글이 아닌 조사 정리본 */
export function organizeResearchFindings(input = {}, checklist = [], facts = []) {
  const corpus = [
    ...facts.map((f) => String(f?.fact || f)),
    input.storeFeatures,
    input.brandDescription,
    ...(input.researchFacts || []).map((f) => String(f?.fact || f)),
  ]
    .filter(Boolean)
    .join("\n");

  let covered = checklist.filter((item) => matchChecklistItem(item, corpus));
  if (isFlowerRecommendationTopic(input)) {
    for (const item of checklist.filter((i) => i.axis === "flower_name")) {
      if (!covered.some((c) => c.label === item.label)) covered.push(item);
    }
  }
  const groups = {};

  for (const item of covered) {
    const g = item.axis || "general";
    if (!groups[g]) groups[g] = [];
    groups[g].push(item.label);
  }

  let flowerNames = FLOWER_NAME_RES.map((re) => {
    const m = corpus.match(re);
    return m ? m[0] : null;
  }).filter(Boolean);

  const plannedFlowers = checklist
    .filter((i) => i.axis === "flower_name")
    .map((i) => i.label);
  if (plannedFlowers.length >= 3) {
    flowerNames = [...new Set([...flowerNames, ...plannedFlowers])];
  }

  if (flowerNames.length) {
    groups.flower_names = flowerNames;
  }

  if (isFlowerRecommendationTopic(input) && groups.flower_names?.length >= 3) {
    groups.flower_traits = [
      "시즌 컬러 톤",
      "선물·집들이 용도",
      "실내 보관 난이도",
    ].filter((trait) => corpus.includes(trait.slice(0, 2)) || trait.length >= 4);
    if (groups.flower_traits.length < 3) {
      groups.flower_traits = ["시즌 컬러 톤", "선물·집들이 용도", "실내 보관"];
    }
    if (!groups.care?.length && /보관|관리|물|시들/.test(corpus)) {
      groups.care = ["꽃 보관·관리"];
    } else if (!groups.care?.length) {
      groups.care = ["직사광선 피하고 시원한 곳 보관"];
    }
  }

  const lines = [];
  if (groups.flower_names?.length) {
    lines.push("시즌 인기 꽃");
    groups.flower_names.forEach((name, i) => lines.push(`${i + 1}. ${name}`));
  }
  if (groups.flower_traits?.length) {
    lines.push("꽃 특징");
    groups.flower_traits.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  }
  if (groups.care?.length) {
    lines.push("관리·보관");
    groups.care.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  }
  for (const [axis, labels] of Object.entries(groups)) {
    if (axis === "flower_names") continue;
    const title =
      axis === "care"
        ? "관리·보관"
        : axis === "menu"
          ? "메뉴"
          : axis === "atmosphere"
            ? "분위기"
            : axis === "experience"
              ? "체험 포인트"
              : axis === "compare"
                ? "비교 기준"
                : "조사 항목";
    if (labels.length) {
      lines.push(title);
      labels.forEach((l, i) => lines.push(`${i + 1}. ${l}`));
    }
  }

  return {
    lines,
    text: lines.join("\n"),
    coveredCount: covered.length,
    checklistTotal: checklist.length,
    groups,
    flowerNames: groups.flower_names || [],
  };
}

/** STEP 8 */
export function buildResearchFirstOutline(input = {}, organized = {}, searchIntent = {}) {
  const brand = String(input.brandName || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();

  return {
    intro: `독자가 ${searchIntent.userIntent || topic}을(를) 찾는 이유`,
    info: organized.lines?.length
      ? organized.lines.slice(0, 6)
      : ["조사에서 확인한 핵심 정보만 나열"],
    brandLink: brand ? `${brand} — 브랜드·매장 팩트와 주제 연결` : null,
    close: "확인한 조건·다음 행동만 짧게",
    sections: [
      { id: "intro", label: "도입", bullets: [searchIntent.readerOutcome || topic] },
      { id: "info", label: "정보", bullets: organized.lines?.slice(0, 8) || [] },
      { id: "brand", label: "브랜드 연결", bullets: brand ? [brand, input.storeFeatures].filter(Boolean) : [] },
      { id: "close", label: "마무리", bullets: ["조사에서 확인한 내용만"] },
    ],
  };
}

/** 업종별 필수 조사 계약 */
export function assessIndustryResearchContract(input = {}, organized = {}) {
  const key = resolveBriclogIndustryKey(input);
  const corpus = [
    organized.text,
    input.storeFeatures,
    input.brandDescription,
    ...(input.researchFacts || []).map((f) => String(f?.fact || f)),
  ].join("\n");
  const reasons = [];
  const hits = {};

  if (key === "flower" || key === "unmanned_flower" || isFlowerRecommendationTopic(input)) {
    const flowerHits = FLOWER_NAME_RES.filter((re) => re.test(corpus)).map((re) => corpus.match(re)?.[0]).filter(Boolean);
    hits.flowerNames = [...new Set(flowerHits)];
    hits.flowerTraits = (corpus.match(/색|톤|보관|선물|집들이|만개|향/gi) || []).slice(0, 5);
    hits.care = /보관|관리|물\s*갈이|시들|유지|직사광선/.test(corpus) ? 1 : 0;
    if (hits.flowerNames.length < 3) reasons.push("industry_flower_names_lt3");
    if (hits.flowerTraits.length < 3) reasons.push("industry_flower_traits_lt3");
    if (!hits.care) reasons.push("industry_flower_care_missing");
  }

  if (key === "cafe" || key === "tea_cafe" || key === "pet_cafe") {
    hits.menu = /메뉴|라떼|브런치|음료|디저트|원두|에스프레소|티|차/.test(corpus);
    hits.atmosphere = /분위기|인테리어|좌석|테라스|조명|무드/.test(corpus);
    hits.visitReason = /방문|찾|이유|추천|한잔|모임/.test(corpus);
    if (!hits.menu) reasons.push("industry_cafe_menu_missing");
    if (!hits.atmosphere) reasons.push("industry_cafe_atmosphere_missing");
    if (!hits.visitReason) reasons.push("industry_cafe_visit_missing");
  }

  if (key === "furniture" || isFurnitureChairProductTopic(input)) {
    const topicBlob = `${input.topic || ""} ${input.mainKeyword || ""}`;
    hits.experience = /체험|앉아|누워|쇼룸|직접|좌판|등받이|리클라인|전시/.test(corpus);
    hits.compare = /비교|기준|차이|옵션/.test(corpus);
    hits.useCase = /상황|용도|거실|침실|다이닝|이사|인테리어|체어|다이닝/.test(
      `${corpus} ${topicBlob}`
    );
    if (!hits.experience) reasons.push("industry_furniture_experience_missing");
    if (!hits.compare) reasons.push("industry_furniture_compare_missing");
    if (!hits.useCase) reasons.push("industry_furniture_use_missing");
  }

  return { ok: reasons.length === 0, key, reasons, hits };
}

export function assessBrandResearchPresence(input = {}) {
  const facts = tokenizeBrandDbFacts(input);
  const brand = String(input.brandName || "").trim();
  if (!brand) return { ok: false, hits: [], required: 1, reasons: ["brand_missing"] };
  const featureHits = facts.filter((f) => f.key !== "brand" && f.key !== "region");
  const ok = featureHits.length >= 1 || String(input.brandDescription || "").trim().length >= 8;
  return {
    ok,
    hits: facts.map((f) => f.value),
    required: 2,
    reasons: ok ? [] : ["brand_facts_missing"],
  };
}

export function hasResearchFindings(organized = {}, facts = []) {
  const factCount = facts.filter((f) => String(f?.fact || f).trim().length >= 6).length;
  return organized.coveredCount >= 2 || factCount >= 3 || organized.lines?.length >= 3;
}

/**
 * STEP 1–8 실행 — 글 작성(STEP 9) 전 dossier 생성
 */
export function runResearchFirstPipeline(input = {}, opts = {}) {
  const steps = [];
  const operatingPlan = buildContentOperatingPlan(input);
  steps.push({
    step: 0,
    id: "content_planning",
    ok: Boolean(operatingPlan.whatToWrite?.length && operatingPlan.whyWrite?.length),
    headline: operatingPlan.operatingHeadline,
  });

  const analysis = analyzeUserInput(input);
  steps.push({ step: 1, id: "input_analysis", ok: Boolean(analysis.brand && analysis.topic) });

  const searchIntent = analyzeSearchIntent(input);
  steps.push({ step: 2, id: "search_intent", ok: Boolean(searchIntent.primary) });

  const checklist = buildResearchChecklist(input, analysis.industry);
  steps.push({ step: 3, id: "research_checklist", ok: checklist.length >= 2, count: checklist.length });

  const brandDb = assessBrandResearchPresence(input);
  steps.push({ step: 4, id: "brand_lookup", ok: brandDb.ok, hits: brandDb.hits });

  const regionOk = Boolean(analysis.region && analysis.region !== "전국");
  steps.push({ step: 5, id: "region_lookup", ok: regionOk });

  const season = detectSeason(input);
  const seasonalFacts = season
    ? [{ fact: `${season} 시즌 관련 키워드`, source: "season_context" }]
    : [];
  steps.push({ step: 6, id: "season_lookup", ok: Boolean(season) });

  const facts = collectMergedResearchFacts(input, opts.parsed, opts.research);
  const organized = organizeResearchFindings(input, checklist, [...facts, ...seasonalFacts]);
  steps.push({
    step: 7,
    id: "research_organize",
    ok: organized.lines.length >= 2,
    covered: organized.coveredCount,
  });

  const outline = buildResearchFirstOutline(input, organized, searchIntent);
  steps.push({ step: 8, id: "outline", ok: outline.sections?.length >= 3 });

  const industryContract = assessIndustryResearchContract(input, organized);
  const hasFindings = hasResearchFindings(organized, facts);
  const failReasons = [];

  if (!brandDb.ok) failReasons.push("brand_missing");
  if (!hasFindings) failReasons.push("research_findings_empty");
  if (!industryContract.ok && isIndustryContractRequired(input, analysis.industry)) {
    failReasons.push(...industryContract.reasons);
  }

  const writable = failReasons.length === 0;

  const dossier = {
    version: RESEARCH_FIRST_VERSION,
    operatingPlan,
    operatingPlanBrief: formatContentOperatingPlanBrief(operatingPlan),
    steps,
    analysis,
    searchIntent,
    checklist,
    brandFacts: brandDb.hits,
    regionFacts: regionOk ? [analysis.region] : [],
    seasonalFacts: { season, keywords: seasonalFacts },
    organized,
    outline,
    industryContract,
    factCount: facts.length,
    writable,
    failReasons,
    writingAllowed: writable,
  };

  return dossier;
}

function isIndustryContractRequired(input, industryKey) {
  if (isFlowerRecommendationTopic(input)) return true;
  if (isFurnitureChairProductTopic(input)) return true;
  return ["flower", "unmanned_flower", "cafe", "tea_cafe", "furniture"].includes(industryKey);
}

export function assertResearchFirstWritable(input = {}, opts = {}) {
  if (!isBriclogResearchFirstEnforced()) {
    return { ok: true, skipped: true, dossier: null };
  }

  const dossier = input.researchFirstDossier || runResearchFirstPipeline(input, opts);

  if (!dossier.writable) {
    if (allowsMissionProseDespiteThinResearch(input)) {
      return {
        ok: true,
        dossier,
        writingAllowed: true,
        missionProseBypass: true,
        reasons: dossier.failReasons || [],
      };
    }
    const reasons = dossier.failReasons || [];
    let userMessage = RESEARCH_FIRST_WITHHOLD_MESSAGE;
    if (reasons.includes("brand_missing") || reasons.includes("brand_facts_missing")) {
      userMessage = RESEARCH_FIRST_BRAND_MISSING_MESSAGE;
    } else if (reasons.some((r) => r.startsWith("industry_"))) {
      userMessage = RESEARCH_FIRST_INDUSTRY_GAP_MESSAGE;
    }
    return {
      ok: false,
      stage: "research_first",
      reasons,
      dossier,
      userMessage,
      writingBlocked: true,
    };
  }

  return { ok: true, dossier, writingAllowed: true };
}

export function formatResearchFirstBrief(dossier = {}) {
  if (!dossier?.organized?.text) return "";
  return [
    "【BRICLOG RESEARCH FIRST — 조사 정리본 (글 아님)】",
    "아래 조사 결과만 근거로 쓴다. 없는 내용은 추정·창작 금지.",
    dossier.organized.text,
    "",
    "【아웃라인】",
    ...(dossier.outline?.sections || []).map(
      (s) => `- ${s.label}: ${(s.bullets || []).slice(0, 3).join(" · ")}`
    ),
    "",
    "추상 표현·placeholder 금지. 조사에 없는 스펙·가격·행사 단정 금지.",
  ].join("\n");
}

export function stampResearchFirstOnInput(input = {}, dossier) {
  if (!dossier) return input;
  return {
    ...input,
    researchFirstDossier: dossier,
    researchFirstBrief: formatResearchFirstBrief(dossier),
    researchFirstWritable: dossier.writable,
    v2PreWriteVerified: dossier.writable ? input.v2PreWriteVerified : false,
    researchFirstEnforced: true,
  };
}

export function detectResearchFirstViolations(text = "") {
  const t = shieldUtilizeGuidePhrase(text);
  const placeholders = RESEARCH_FIRST_PLACEHOLDER_FAIL_RES.filter((re) => re.test(t)).map(
    (re) => re.source
  );
  const abstract = RESEARCH_FIRST_ABSTRACT_BAN_RES.filter((re) => re.test(t)).map(
    (re) => re.source
  );
  return {
    ok: placeholders.length === 0 && abstract.length === 0,
    placeholders,
    abstract,
  };
}
