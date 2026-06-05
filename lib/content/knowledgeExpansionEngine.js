/**
 * BRICLOG KNOWLEDGE EXPANSION ENGINE
 * 사용자 입력 → 주제 분해 → 정보 조사 → 정보 확장 → 에디터 작성 → 검수 → 출력
 * 입력 즉시 글 생성 금지
 */
import { buildKnowledgeCoverageMap, MIN_COVERAGE_AREAS } from "@/lib/content/knowledgeCoverageEngine";
import { buildSearchExpansionPlan } from "@/lib/research/searchExpansionEngine";
import {
  decomposeTopicToInformationUnits,
  formatInformationUnitsForPrompt,
  MIN_INFORMATION_UNITS,
  MAX_INFORMATION_UNITS,
  TARGET_INFORMATION_UNITS,
  TOPIC_DECOMPOSITION_BRIEF,
  EDITOR_RECONSTRUCTION_BRIEF,
} from "@/lib/content/informationUnitEngine";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { getUncoveredCoverageAreas } from "@/lib/content/knowledgeCoverageEngine";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { detectVerbatimTopicUsage } from "@/lib/content/informationUnitEngine";
import { MASTER_QUALITY_EDITOR_BRIEF } from "@/lib/product/masterQualityDirective";
import { resolveBlogLengthTier } from "@/lib/constants";
import {
  formatCustomerResearchBlockMessage,
  resolveInformationUnitFloor,
} from "@/lib/product/researchReadiness";

export const KNOWLEDGE_EXPANSION_STAGES = [
  "topic_decompose",
  "information_research",
  "information_expand",
  "editor_write",
  "review",
  "output",
];

export const KNOWLEDGE_EXPANSION_STAGE_LABELS = {
  topic_decompose: "주제 정보 단위 분해 중…",
  information_research: "정보 조사·검색 확장 중…",
  information_expand: "조사 자료 정리·정보 확장 중…",
  editor_write: "전문 에디터 칼럼 작성 중…",
  review: "발행 전 검수 중…",
  output: "결과 정리 중…",
};

/** @deprecated alias — MASTER QUALITY DIRECTIVE V1 */
export const KNOWLEDGE_EXPANSION_EDITOR_BRIEF = MASTER_QUALITY_EDITOR_BRIEF;

/** @type {{ id: string, label: string, headingSuffix: string, keywords: string[], group: string }[]} */
const UNIVERSAL_TOPIC_FACET_DEFS = [
  { id: "topic_def", label: "개념", headingSuffix: "란 · 개념", keywords: ["란", "개념", "정의"], group: "concept" },
  { id: "how_works", label: "작동방식", headingSuffix: "작동·원리", keywords: ["작동", "원리", "방식"], group: "feature" },
  { id: "pros", label: "장점", headingSuffix: "장점·효과", keywords: ["장점", "효과", "이점"], group: "compare" },
  { id: "cons", label: "단점", headingSuffix: "단점·한계", keywords: ["단점", "한계", "주의"], group: "caution" },
  { id: "recommended", label: "추천 사용자", headingSuffix: "추천·적합", keywords: ["추천", "적합", "맞는"], group: "decision" },
  { id: "not_recommended", label: "비추천 사용자", headingSuffix: "비추천·부적합", keywords: ["비추천", "부적합", "피할"], group: "caution" },
  { id: "compare_criteria", label: "비교 기준", headingSuffix: "비교·선택 기준", keywords: ["비교", "기준", "선택"], group: "compare" },
  { id: "cautions", label: "주의사항", headingSuffix: "주의·유의", keywords: ["주의", "유의", "실수"], group: "caution" },
  { id: "selection", label: "선택 기준", headingSuffix: "고를 때 확인", keywords: ["선택", "확인", "체크"], group: "decision" },
  { id: "price", label: "가격대", headingSuffix: "가격·비용", keywords: ["가격", "비용", "견적"], group: "purchase" },
  { id: "purchase_mistakes", label: "구매 실수", headingSuffix: "흔한 실수", keywords: ["실수", "후회", "놓치"], group: "caution" },
  { id: "purchase_checklist", label: "구매 체크리스트", headingSuffix: "구매 전 체크", keywords: ["체크", "목록", "확인"], group: "decision" },
  { id: "trial", label: "체험 포인트", headingSuffix: "체험·직접 확인", keywords: ["체험", "확인", "테스트"], group: "visit" },
  { id: "brand_diff", label: "브랜드 차별점", headingSuffix: "브랜드·차별", keywords: ["브랜드", "차별", "강점"], group: "brand" },
  { id: "competitor", label: "경쟁사 비교", headingSuffix: "대안·비교", keywords: ["경쟁", "대안", "비교"], group: "compare" },
  { id: "install", label: "설치", headingSuffix: "설치·준비", keywords: ["설치", "조립", "준비"], group: "ops" },
  { id: "delivery", label: "배송", headingSuffix: "배송·일정", keywords: ["배송", "출고", "일정"], group: "ops" },
  { id: "as", label: "AS", headingSuffix: "A/S·보증", keywords: ["AS", "보증", "사후"], group: "ops" },
  { id: "exchange", label: "교환", headingSuffix: "교환·반품", keywords: ["교환", "반품", "환불"], group: "ops" },
  { id: "compatibility", label: "조합·궁합", headingSuffix: "조합·호환", keywords: ["조합", "궁합", "호환"], group: "product" },
];

/** @type {{ test: RegExp, facets: { id: string, label: string, headingSuffix: string, keywords: string[], group: string }[] }[]} */
const KEYWORD_TOPIC_FACETS = [
  {
    test: /모션|전동|리클|zero|제로/i,
    facets: [
      { id: "zero_g", label: "무중력 기능", headingSuffix: "무중력·제로지", keywords: ["무중력", "제로지"], group: "feature" },
      { id: "head_angle", label: "헤드 각도", headingSuffix: "헤드·상체 각도", keywords: ["헤드", "상체", "각도"], group: "feature" },
      { id: "leg_angle", label: "다리 각도", headingSuffix: "다리·하체 각도", keywords: ["다리", "하체", "각도"], group: "feature" },
      { id: "noise", label: "소음", headingSuffix: "소음·진동", keywords: ["소음", "진동", "작동음"], group: "feature" },
      { id: "power", label: "전력소비", headingSuffix: "전력·사용량", keywords: ["전력", "소비", "전기"], group: "feature" },
      { id: "mattress_fit", label: "매트리스 궁합", headingSuffix: "매트리스·조합", keywords: ["매트리스", "조합", "궁합"], group: "product" },
    ],
  },
  {
    test: /꽃|플라워|다발|화환|플로리스트/i,
    facets: [
      { id: "flower_types", label: "꽃 종류", headingSuffix: "꽃·구성", keywords: ["꽃", "종류", "구성"], group: "product" },
      { id: "flower_care", label: "관리법", headingSuffix: "관리·보관", keywords: ["관리", "보관", "수명"], group: "feature" },
      { id: "flower_pack", label: "포장", headingSuffix: "포장·메시지", keywords: ["포장", "리본", "카드"], group: "ops" },
    ],
  },
  {
    test: /임플란|치과|진료|검진|시술/i,
    facets: [
      { id: "exam_flow", label: "진료 흐름", headingSuffix: "접수·진행", keywords: ["접수", "진행", "흐름"], group: "ops" },
      { id: "med_cost", label: "비용·보험", headingSuffix: "비용·적용", keywords: ["비용", "보험", "견적"], group: "purchase" },
      { id: "med_prep", label: "방문 준비", headingSuffix: "사전 준비", keywords: ["준비", "금식", "서류"], group: "visit" },
    ],
  },
];

function facetLabel(def, topicFacet) {
  if (def.id === "topic_def" && topicFacet) return `${topicFacet}란`;
  return def.label;
}

function facetHeading(def, topicFacet, index) {
  if (def.id === "topic_def" && topicFacet) return `${topicFacet}란 · 개념`;
  return def.headingSuffix || def.label;
}

/**
 * 주제 중심 세부 정보 항목 (업종·브랜드·지역과 결합해 조사)
 * @param {Record<string, unknown>} input
 */
export function buildTopicKnowledgeFacets(input = {}) {
  const ctx = deriveTopicWritingContext(input);
  const blob = `${ctx.topicRaw} ${ctx.topicFacet} ${input.industry || ""} ${input.brandType || ""}`;
  const facets = [];
  const seen = new Set();

  const push = (def) => {
    const id = def.id;
    if (seen.has(id)) return;
    seen.add(id);
    const label = facetLabel(def, ctx.topicFacet);
    facets.push({
      ...def,
      label,
      headingSuffix: facetHeading(def, ctx.topicFacet, facets.length),
      keywords: [...new Set([...(def.keywords || []), label, ctx.topicFacet].filter(Boolean))],
      searchQuery: [ctx.brand, ctx.region, label, ctx.topicFacet].filter(Boolean).join(" ").trim(),
    });
  };

  for (const def of UNIVERSAL_TOPIC_FACET_DEFS) {
    push(def);
  }
  for (const group of KEYWORD_TOPIC_FACETS) {
    if (!group.test.test(blob)) continue;
    for (const def of group.facets) push(def);
  }

  return {
    topicFacet: ctx.topicFacet,
    topicRaw: ctx.topicRaw,
    brand: ctx.brand,
    region: ctx.region,
    facets,
    facetCount: facets.length,
    meetsMinimum: facets.length >= MIN_INFORMATION_UNITS,
  };
}

/**
 * @param {Record<string, unknown>} input
 */
export function runKnowledgeExpansionPipeline(input = {}) {
  const writeCtx = deriveTopicWritingContext(input);
  const knowledgeCoverage = input.knowledgeCoverage || buildKnowledgeCoverageMap(input);
  const topicFacets = input.topicFacets || buildTopicKnowledgeFacets(input);
  const enriched = {
    ...input,
    ...writeCtx,
    knowledgeCoverage,
    topicFacets,
  };
  const informationUnits = decomposeTopicToInformationUnits(enriched);
  const searchExpansion = buildSearchExpansionPlan(enriched);

  const state = {
    stages: KNOWLEDGE_EXPANSION_STAGES,
    knowledgeCoverage,
    topicFacets,
    informationUnits,
    searchExpansion,
    brand: writeCtx.brand,
    region: writeCtx.region,
    topicFacet: writeCtx.topicFacet,
    topicRaw: writeCtx.topicRaw,
    unitCount: informationUnits.unitCount,
    coverageCount: knowledgeCoverage.coverageCount,
    searchQueryCount: searchExpansion.searchQueries?.length || 0,
  };

  const ready = assertKnowledgeExpansionReady(state, input);
  return {
    ...state,
    ready,
    expansionBrief: formatKnowledgeExpansionBrief(state),
    informationUnitBrief: formatInformationUnitsForPrompt(informationUnits, enriched),
    topicDecompositionBrief: TOPIC_DECOMPOSITION_BRIEF,
    editorReconstructionBrief: EDITOR_RECONSTRUCTION_BRIEF,
    editorColumnBrief: KNOWLEDGE_EXPANSION_EDITOR_BRIEF,
  };
}

export function assertKnowledgeExpansionReady(state = {}, input = {}) {
  const reasons = [];
  const brand = String(state.brand || input.brandName || "").trim();
  const region = String(state.region || input.region || "").trim();
  const topic =
    String(state.topicRaw || input.topic || input.mainKeyword || "").trim();

  if (!brand) reasons.push("missing_brand");
  if (!region) reasons.push("missing_region");
  if (!topic) reasons.push("missing_topic");

  const unitCount = state.unitCount ?? state.informationUnits?.unitCount ?? 0;
  const coverageCount = state.coverageCount ?? state.knowledgeCoverage?.coverageCount ?? 0;
  const searchCount = state.searchQueryCount ?? state.searchExpansion?.searchQueries?.length ?? 0;
  const floor = resolveInformationUnitFloor(input, state);

  if (unitCount < floor.minUnits) reasons.push("insufficient_information_units");
  if (coverageCount < floor.minCoverage) reasons.push("insufficient_coverage_areas");
  const searchFloor =
    unitCount >= floor.minUnits && coverageCount >= floor.minCoverage
      ? Math.min(3, floor.minSearchQueries)
      : floor.minSearchQueries;
  if (searchCount < searchFloor) reasons.push("insufficient_search_expansion");

  return {
    ok: reasons.length === 0,
    reasons,
    unitCount,
    coverageCount,
    searchQueryCount: searchCount,
    minUnits: floor.minUnits,
    readinessMode: floor.mode,
    thinContext: floor.thin,
    targetUnits: TARGET_INFORMATION_UNITS,
    maxUnits: MAX_INFORMATION_UNITS,
    userMessage:
      reasons.length === 0
        ? null
        : formatCustomerResearchBlockMessage(input, reasons, state),
  };
}

export function formatKnowledgeExpansionBrief(state = {}) {
  const lines = [
    "【KNOWLEDGE EXPANSION · 파이프라인 — 출력 금지】",
    KNOWLEDGE_EXPANSION_EDITOR_BRIEF,
    `단계: ${KNOWLEDGE_EXPANSION_STAGES.join(" → ")}`,
    `정보 단위 ${state.unitCount ?? 0}개 (목표 ${TARGET_INFORMATION_UNITS}, 최소 ${MIN_INFORMATION_UNITS}, 최대 ${MAX_INFORMATION_UNITS})`,
    `커버리지 영역 ${state.coverageCount ?? 0}개 · 검색 확장 ${state.searchQueryCount ?? 0}건`,
    "주제 문장 반복·글자수 채우기·소제목 복제 금지",
  ];
  const facets = state.topicFacets?.facets || [];
  if (facets.length) {
    lines.push(`주제 분해 예 (${state.topicFacet || "주제"}):`);
    facets.slice(0, 24).forEach((f, i) => {
      lines.push(`  ${i + 1}. ${f.label} — ${f.headingSuffix}`);
    });
    if (facets.length > 24) lines.push(`  … 외 ${facets.length - 24}개`);
  }
  return lines.join("\n");
}

/**
 * 정보량 부족 시 — 미커버 영역·깊이 확장(브랜드·지역·커버리지)으로 분량 보강 가능 여부
 */
export function assessInformationExpansionCapacity(pack, input = {}, minChars = 1800) {
  const coverage = input.knowledgeCoverage || buildKnowledgeCoverageMap(input);
  const current = countBlogBodyCharsWithSpaces(pack);
  if (current >= minChars) {
    return { ok: true, canExpand: true, uncoveredCount: 0, reason: null };
  }

  const brand = String(input.brandName || coverage.brand || "").trim();
  const region = String(input.region || coverage.region || "").trim();
  const topic = String(
    input.topic || input.mainKeyword || coverage.topic || ""
  ).trim();
  const hasAxes = Boolean(brand && region && topic);
  const areaCount = coverage.areas?.length || 0;

  const uncovered = getUncoveredCoverageAreas(coverage, pack);
  if (uncovered.length > 0) {
    return {
      ok: true,
      canExpand: true,
      uncoveredCount: uncovered.length,
      strategy: "coverage_sections",
      reason: null,
    };
  }

  // 브랜드·지역·주제가 있으면 '새 정보 없음'으로 막지 않고 깊이·커버리지 확장
  if (hasAxes) {
    return {
      ok: true,
      canExpand: true,
      uncoveredCount: 0,
      strategy: areaCount >= 6 ? "depth_expand" : "coverage_sections",
      reason: null,
    };
  }

  return {
    ok: false,
    canExpand: false,
    uncoveredCount: 0,
    reason: "no_new_information",
    userMessage:
      "이번에는 분량·조사 깊이가 부족해요. 브랜드·지역·주제를 조금 더 구체적으로 입력하거나 「짧은 글」로 바꾼 뒤 「다시 받기」를 눌러 주세요.",
  };
}

/**
 * 주제 반복 패딩 탐지
 */
export function detectTopicPaddingViolations(pack, input = {}) {
  const verbatim = detectVerbatimTopicUsage(pack, input);
  const failures = [];
  if (!verbatim.ok) {
    failures.push({
      type: "verbatim_topic_repeat",
      count: verbatim.count,
      maxAllowed: verbatim.maxAllowed,
      message: "주제 문장 반복 — 글자수 채우기",
    });
  }
  const meta = pack?._meta?.knowledgeExpansionBlocked;
  const tier = input.blogLengthTier || "medium";
  const { min } = resolveBlogLengthTier(tier);
  const chars = countBlogBodyCharsWithSpaces(pack);
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const hasAxes = Boolean(brand && region && topic);

  if (
    !hasAxes &&
    meta?.reason === "no_new_information" &&
    (pack?._meta?.blocked || chars < min)
  ) {
    failures.push({
      type: "no_new_information",
      message: meta.userMessage || "새 정보 없음 — 생성 금지",
    });
  }
  return { ok: failures.length === 0, failures };
}

export function stampKnowledgeExpansionMeta(pack, expansionState = {}) {
  if (!pack) return pack;
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      knowledgeExpansion: {
        stages: KNOWLEDGE_EXPANSION_STAGES,
        unitCount: expansionState.unitCount,
        coverageCount: expansionState.coverageCount,
        searchQueryCount: expansionState.searchQueryCount,
        topicFacet: expansionState.topicFacet,
        ready: expansionState.ready?.ok ?? true,
      },
    },
  };
}
