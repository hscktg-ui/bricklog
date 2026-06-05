/**
 * BRICLOG SEARCH EXPANSION ENGINE
 * 사용자 입력을 단일 검색어가 아닌 — 의도·구매·비교·FAQ·운영·방문 축으로 확장
 */
import { buildDefaultResearchQuery } from "@/lib/research/needsOnlineResearch";
import { discoverClues } from "@/lib/content/clueDiscoveryEngine";
import {
  buildKnowledgeCoverageMap,
  coverageAreaToSearchQuery,
} from "@/lib/content/knowledgeCoverageEngine";

export const SEARCH_EXPANSION_STAGE_LABELS = {
  entities: "핵심 엔티티 분석 중…",
  expand: "검색 의도·연관 주제 확장 중…",
  multi: "다중 검색 수행 중…",
  map: "지식 맵 구성 중…",
};

function topicLine(input = {}) {
  return (
    String(input.topic || "")
      .trim()
      .split(/[,，]/)[0]
      ?.trim() ||
    String(input.mainKeyword || "").trim()
  );
}

function stripPromoWords(text = "") {
  return String(text)
    .replace(/특별\s*할인|할인\s*행사|프로모션|이벤트|행사/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** @param {Record<string, unknown>} input */
export function resolveResearchCategoryKey(input = {}) {
  const blob = `${input.industry || input.industryText || ""} ${topicLine(input)} ${input.brandName || ""}`.toLowerCase();
  if (/가구|침대|매트리스|모션|furniture|bed|mattress|템퍼|침실/.test(blob)) return "furniture";
  if (/꽃|플라워|flower|플로리스트|화환/.test(blob)) return "flower";
  if (/병원|의원|치과|한의|clinic|hospital|검진/.test(blob)) return "hospital";
  if (/카페|coffee|베이커리|브런치|디저트/.test(blob)) return "cafe";
  if (/반려|펫|애견|강아지|고양이|pet\b|수제\s*간식|간식\s*업체/.test(blob)) return "pet";
  if (/미용|헤어|염색|펌|두피|네일|살롱|barber/.test(blob)) return "salon";
  if (/세차|카워시|디테일링|코팅|세차장/.test(blob)) return "carwash";
  if (/건설|시공|인테리어|리모델|공사/.test(blob)) return "construction";
  if (/변호|법률|법무|로펌/.test(blob)) return "lawyer";
  if (/saas|software|플랫폼|솔루션|b2b/.test(blob)) return "saas";
  if (/마케팅|광고|대행|퍼포먼스|캠페인/.test(blob)) return "marketing";
  if (/학원|교육|과외|어학|academy/.test(blob)) return "education";
  if (/공공|관공|시청|구청|주민센터/.test(blob)) return "public";
  return "default";
}

/**
 * @param {Record<string, unknown>} input
 */
export function extractCoreEntities(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = topicLine(input);
  const sub = String(input.subKeyword || "").trim();
  const rawQuery = buildDefaultResearchQuery(input) || [brand, region, topic].filter(Boolean).join(" ");
  const tokens = rawQuery
    .split(/[\s,，·/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
  const promoTerms = tokens.filter((t) =>
    /할인|행사|프로모|특별|이벤트|혜택|증정/.test(t)
  );
  const productCore = stripPromoWords(topic) || topic;
  const discovery = input.clueDiscovery || discoverClues(input);

  return {
    brand,
    region,
    topic,
    productCore,
    sub,
    rawQuery,
    tokens: [...new Set(tokens)],
    promoTerms,
    productHints: discovery.inferences?.map((i) => i.label).filter(Boolean) || [],
    entityVariants: discovery.entityVariants || [],
    searchIntents: discovery.searchQueries?.slice(0, 4) || [],
  };
}

/** @typedef {(e: ReturnType<typeof extractCoreEntities>) => string[]} BucketBuilder */

/** @type {Record<string, Record<string, BucketBuilder>>} */
const EXPANSION_BY_CATEGORY = {
  furniture: {
    brand: (e) => [
      e.brand,
      e.brand && e.productCore ? `${e.brand} ${e.productCore}` : null,
      /템퍼/i.test(e.brand) ? `${e.brand} Ergo` : null,
      /템퍼/i.test(e.brand) ? `${e.brand} 프로스마트` : null,
      e.brand ? `${e.brand} 라인업` : null,
    ],
    product: (e) => [
      e.productCore,
      /모션|전동|리클/.test(e.topic) ? "모션베드" : null,
      /모션|전동|리클/.test(e.topic) ? "전동침대" : null,
      /모션|전동|리클/.test(e.topic) ? "리클라이닝 침대" : null,
      "매트리스",
      "프레임",
      ...e.entityVariants.slice(0, 2),
    ],
    feature: () => [
      "무중력 자세",
      "체압 분산",
      "코골이",
      "다리 올리기",
      "헤드 각도",
      "모션 기능",
    ],
    compare: (e) => [
      "일반 침대 차이",
      "타 브랜드 비교",
      "프레임 차이",
      "매트리스 조합",
      e.brand ? `${e.brand} 비교` : null,
    ],
    purchase: (e) => [
      "가격",
      "행사",
      "할인",
      "증정",
      "카드 혜택",
      ...e.promoTerms,
      e.topic && /할인|행사|특별/.test(e.topic) ? e.topic : null,
    ],
    ops: () => ["설치", "배송", "AS", "보증", "교환"],
    visit: (e) => [
      "체험",
      "매장 예약",
      "주차",
      "영업시간",
      e.region ? `${e.region} 매장` : null,
    ],
    faq: (e) => [
      e.productCore ? `${e.productCore} FAQ` : "자주 묻는 질문",
      "비용 문의",
      "설치 기간",
    ],
  },
  flower: {
    brand: (e) => [e.brand, e.brand ? `${e.brand} 꽃다발` : null],
    product: () => ["꽃다발", "꽃 종류", "계절 꽃", "화환", "플라워 박스"],
    feature: () => ["꽃 관리법", "보존", "향"],
    compare: () => ["가격대 비교", "구성 비교"],
    purchase: (e) => ["가격", "할인", "이벤트", ...e.promoTerms],
    ops: () => ["포장", "배송", "픽업", "당일 배송"],
    visit: (e) => ["예약", "매장", e.region ? `${e.region} 꽃집` : null],
    faq: () => ["배송 가능 지역", "예약 방법", "관리법"],
  },
  hospital: {
    brand: (e) => [e.brand, e.brand ? `${e.brand} 진료` : null],
    product: () => ["진료", "검사", "치료", "상담"],
    feature: () => ["치료 과정", "회복", "주의사항"],
    compare: () => ["치료 옵션 비교", "비용 안내"],
    purchase: () => ["비용", "보험", "견적"],
    ops: () => ["예약", "접수", "대기", "운영 시간"],
    visit: (e) => ["방문 준비", "주차", e.region ? `${e.region} 병원` : null],
    faq: () => ["예약 필요", "준비물", "주의사항"],
  },
  cafe: {
    brand: (e) => [e.brand, e.brand ? `${e.brand} 메뉴` : null],
    product: () => ["메뉴", "시그니처", "브런치", "디저트"],
    feature: () => ["공간", "분위기", "좌석"],
    compare: () => ["가격 비교", "메뉴 구성"],
    purchase: (e) => ["가격", "할인", ...e.promoTerms],
    ops: () => ["예약", "단체석", "포장"],
    visit: (e) => ["주차", "영업시간", e.region ? `${e.region} 카페` : null],
    faq: () => ["웨이팅", "알레르기", "원두 선택"],
  },
  carwash: {
    brand: (e) => [e.brand],
    product: () => ["세차", "코팅", "디테일링", "광택"],
    feature: () => ["작업 과정", "소요 시간"],
    compare: () => ["패키지 비교", "코스 비교"],
    purchase: (e) => ["가격", "할인", ...e.promoTerms],
    ops: () => ["예약", "대기", "멤버십"],
    visit: (e) => ["주차", e.region ? `${e.region} 세차` : null],
    faq: () => ["소요 시간", "주의사항", "관리 주기"],
  },
  saas: {
    brand: (e) => [e.brand, e.brand ? `${e.brand} 기능` : null],
    product: () => ["기능", "연동", "API", "자동화"],
    feature: () => ["활용법", "도입", "워크플로"],
    compare: () => ["대안 비교", "차별점", "비용"],
    purchase: () => ["가격", "요금제", "도입 비용"],
    ops: () => ["지원", "온보딩", "보안"],
    visit: () => ["데모", "상담", "문의"],
    faq: () => ["도입 효과", "FAQ", "사례"],
  },
  default: {
    brand: (e) => [e.brand, e.brand && e.productCore ? `${e.brand} ${e.productCore}` : null],
    product: (e) => [e.productCore, e.sub, ...e.productHints.slice(0, 3)],
    feature: (e) => [e.topic ? `${e.topic} 특징` : "특징", "이용 방법"],
    compare: () => ["비교", "선택 기준", "차이"],
    purchase: (e) => ["가격", "혜택", "할인", ...e.promoTerms],
    ops: () => ["예약", "이용 절차", "A/S"],
    visit: (e) => ["방문", "문의", e.region ? `${e.region} ${e.brand}` : null],
    faq: (e) => [e.productCore ? `${e.productCore} FAQ` : "자주 묻는 질문"],
  },
};

function buildCategoryBuckets(categoryKey, entities) {
  const templates = EXPANSION_BY_CATEGORY[categoryKey] || EXPANSION_BY_CATEGORY.default;
  /** @type {Record<string, string[]>} */
  const buckets = {};
  for (const [key, fn] of Object.entries(templates)) {
    const items = fn(entities)
      .map((s) => String(s || "").trim())
      .filter((s) => s.length > 1);
    buckets[key] = [...new Set(items)].slice(0, 8);
  }
  return buckets;
}

function defaultMaxQueries() {
  const n = Number(process.env.BRICLOG_SEARCH_EXPANSION_MAX_QUERIES);
  return Number.isFinite(n) && n >= 4 ? Math.min(n, 14) : 10;
}

/**
 * @param {ReturnType<typeof buildSearchExpansionPlan>} plan
 * @param {{ max?: number }} [opts]
 */
export function buildExpandedSearchQueries(plan, opts = {}) {
  const max = opts.max ?? defaultMaxQueries();
  const { entities, buckets } = plan;
  const { brand, region, topic, productCore } = entities;
  const seen = new Set();
  const out = [];

  const push = (q, stage = "intent") => {
    const s = String(q || "").trim().replace(/\s+/g, " ");
    if (s.length < 3) return;
    const k = s.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ query: s, stage });
  };

  push(plan.primaryQuery, "primary");
  if (region && brand && topic) push(`${region} ${brand} ${topic}`, "intent");
  if (brand && productCore && productCore !== topic) {
    push(`${brand} ${productCore}`, "product");
  }

  const coverage = plan.coverage || { areas: [] };
  const queryInput = {
    brandName: brand,
    region,
    topic,
    mainKeyword: topic,
  };

  for (const area of (coverage.areas || []).slice(0, 12)) {
    push(coverageAreaToSearchQuery(area, queryInput), area.id || "coverage");
    if (out.length >= max) break;
  }

  const order = [
    "purchase",
    "product",
    "ops",
    "feature",
    "compare",
    "visit",
    "brand",
    "faq",
  ];
  for (const bucketKey of order) {
    for (const term of buckets[bucketKey] || []) {
      if (brand) push(`${brand} ${term}`, bucketKey);
      if (region && brand) push(`${region} ${brand} ${term}`, bucketKey);
      if (out.length >= max) break;
    }
    if (out.length >= max) break;
  }

  for (const q of entities.searchIntents.slice(0, 3)) {
    push(q, "clue");
  }
  for (const v of entities.entityVariants.slice(0, 2)) {
    if (brand) push(`${brand} ${v}`, "variant");
  }

  return out.slice(0, max);
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ maxQueries?: number }} [opts]
 */
export function buildSearchExpansionPlan(input = {}, opts = {}) {
  const entities = extractCoreEntities(input);
  const categoryKey = resolveResearchCategoryKey(input);
  const buckets = buildCategoryBuckets(categoryKey, entities);
  const primaryQuery = buildDefaultResearchQuery(input);
  const coverage = input.knowledgeCoverage || buildKnowledgeCoverageMap(input);

  const plan = {
    categoryKey,
    entities,
    buckets,
    coverage,
    intents: [
      "검색 의도 — 정보 탐색·비교",
      "구매 의도 — 가격·행사·조건",
      "방문 의도 — 체험·예약·동선",
      "운영 의도 — 설치·배송·사후",
    ],
    primaryQuery,
    searchQueries: [],
    queryItems: [],
  };

  plan.queryItems = buildExpandedSearchQueries(plan, {
    max: opts.maxQueries ?? defaultMaxQueries(),
  });
  plan.searchQueries = plan.queryItems.map((x) => x.query);

  return plan;
}

/** GPT·Writer 내부용 — 검색 스니펫 복사 금지, 조사 방향만 */
export function formatExpansionForPrompt(plan) {
  if (!plan?.buckets) return "";
  const { entities, buckets, categoryKey } = plan;
  const lines = [
    "【SEARCH EXPANSION · 내부 조사 축 — 출력·복사 금지】",
    `카테고리: ${categoryKey} · 핵심: ${entities.brand} / ${entities.region} / ${entities.topic}`,
    `확장 검색 ${plan.searchQueries?.length || 0}건 — 단일 키워드가 아닌 질문 묶음 조사`,
  ];
  const labels = {
    brand: "브랜드",
    product: "제품",
    feature: "기능",
    compare: "비교",
    purchase: "구매",
    ops: "운영",
    visit: "방문",
    faq: "FAQ",
  };
  for (const [key, label] of Object.entries(labels)) {
    const items = buckets[key];
    if (items?.length) lines.push(`· ${label}: ${items.join(" · ")}`);
  }
  lines.push(
    "수집 스니펫은 FACT 후보만. 지식 맵(주제→연관→FAQ→비교→구매→활용)으로 재구성 후 작성."
  );
  return lines.join("\n");
}
