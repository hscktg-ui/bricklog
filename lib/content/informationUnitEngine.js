/**
 * BRICLOG Information Unit Engine
 * 사용자 주제를 그대로 쓰지 않고 20~50개 세부 정보 단위로 분해 → 조사 → 칼럼 재구성
 * 특정 브랜드·업종·지역·주제 하드코딩 없음
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import { buildKnowledgeCoverageMap, MIN_COVERAGE_AREAS } from "@/lib/content/knowledgeCoverageEngine";
import {
  topicRaw,
  topicWritingFacet,
  topicReaderPhrase,
  deriveTopicWritingContext,
} from "@/lib/content/topicFacetEngine";

export {
  topicRaw,
  topicWritingFacet,
  topicReaderPhrase,
  deriveTopicWritingContext,
} from "@/lib/content/topicFacetEngine";

export const MIN_INFORMATION_UNITS = MIN_COVERAGE_AREAS;
export const TARGET_INFORMATION_UNITS = 40;
export const MAX_INFORMATION_UNITS = 50;

export const INFORMATION_UNIT_STAGE_LABEL = "주제 정보 단위 분해 중…";

const UNIVERSAL_READER_FACETS = [
  { id: "u_search_why", label: "검색 계기", headingSuffix: "찾게 된 상황", keywords: ["검색", "상황", "계기", "궁금"], group: "intent" },
  { id: "u_decision", label: "선택 기준", headingSuffix: "고를 때 기준", keywords: ["기준", "선택", "판단"], group: "decision" },
  { id: "u_compare", label: "비교 항목", headingSuffix: "비교·차이", keywords: ["비교", "차이", "대안"], group: "compare" },
  { id: "u_cost", label: "비용·조건", headingSuffix: "비용·적용 조건", keywords: ["비용", "조건", "견적"], group: "purchase" },
  { id: "u_benefit", label: "혜택·행사", headingSuffix: "혜택·행사 변수", keywords: ["혜택", "행사", "할인"], group: "purchase" },
  { id: "u_process", label: "이용 절차", headingSuffix: "이용·진행 순서", keywords: ["절차", "순서", "진행"], group: "ops" },
  { id: "u_visit", label: "방문·예약", headingSuffix: "방문·예약", keywords: ["방문", "예약", "상담"], group: "visit" },
  { id: "u_experience", label: "체험·확인", headingSuffix: "직접 확인할 것", keywords: ["체험", "확인", "테스트"], group: "visit" },
  { id: "u_prep", label: "사전 준비", headingSuffix: "미리 준비할 것", keywords: ["준비", "사전", "체크"], group: "ops" },
  { id: "u_timing", label: "시기·일정", headingSuffix: "시기·일정 변수", keywords: ["시기", "일정", "기간"], group: "ops" },
  { id: "u_region_ctx", label: "지역 맥락", headingSuffix: "지역·생활권", keywords: ["지역", "생활권", "동선"], group: "region" },
  { id: "u_brand_ctx", label: "브랜드 맥락", headingSuffix: "브랜드·신뢰", keywords: ["브랜드", "공식", "매장"], group: "brand" },
  { id: "u_risk", label: "주의·오해", headingSuffix: "주의·흔한 오해", keywords: ["주의", "오해", "실수"], group: "caution" },
  { id: "u_support", label: "사후·지원", headingSuffix: "사후·지원", keywords: ["지원", "A/S", "사후"], group: "ops" },
  { id: "u_faq", label: "FAQ", headingSuffix: "자주 묻는 질문", keywords: ["FAQ", "질문", "문의"], group: "faq" },
  { id: "u_channel", label: "확인 채널", headingSuffix: "공식·확인 경로", keywords: ["공식", "확인", "안내"], group: "ops" },
  { id: "u_checklist", label: "결정 체크", headingSuffix: "결정 전 체크", keywords: ["체크", "확인", "목록"], group: "decision" },
];

function unitKey(area) {
  return `${area.id}|${area.label}|${area.headingSuffix || ""}`;
}

function buildUnitHeading(def, ctx, index) {
  const { region, brand } = ctx;
  const suffix = def.headingSuffix || def.label;
  if (index % 5 === 0 && region) return `${region}, ${suffix}`;
  if (index % 5 === 1 && brand) return `${brand}, ${suffix}`;
  return suffix;
}

export function decomposeTopicToInformationUnits(input = {}) {
  const writeCtx = deriveTopicWritingContext(input);
  const coverage = input.knowledgeCoverage || buildKnowledgeCoverageMap(input);
  const seen = new Set();
  const units = [];

  const pushUnit = (def, source, index) => {
    const key = unitKey(def);
    if (seen.has(key)) return;
    seen.add(key);
    units.push({
      id: def.id || `unit_${units.length}`,
      label: def.label,
      headingSuffix: def.headingSuffix || def.label,
      heading: buildUnitHeading(def, writeCtx, index),
      keywords: def.keywords || [def.label],
      group: def.group || "general",
      source,
      searchQuery: [writeCtx.brand, writeCtx.region, def.label, writeCtx.topicFacet]
        .filter(Boolean)
        .join(" ")
        .trim(),
    });
  };

  const topicFacets = input.topicFacets?.facets || [];
  topicFacets.forEach((facet, i) => {
    pushUnit(facet, "topic_facet", i);
  });

  coverage.areas.forEach((area, i) => {
    pushUnit(area, "coverage", i);
    for (const kw of (area.keywords || []).slice(0, 2)) {
      pushUnit(
        {
          id: `${area.id}_${kw}`,
          label: kw,
          headingSuffix: `${area.label} · ${kw}`,
          keywords: [kw, area.label],
          group: area.group,
        },
        "coverage_detail",
        i + units.length
      );
    }
  });

  let uIdx = 0;
  while (units.length < MIN_INFORMATION_UNITS && uIdx < UNIVERSAL_READER_FACETS.length * 3) {
    pushUnit(UNIVERSAL_READER_FACETS[uIdx % UNIVERSAL_READER_FACETS.length], "reader_facet", uIdx);
    uIdx += 1;
  }

  while (units.length < MIN_INFORMATION_UNITS) {
    const slot = units.length;
    pushUnit(
      {
        id: `facet_expand_${slot}`,
        label: `확인 포인트 ${slot + 1}`,
        headingSuffix: `추가 확인 ${slot + 1}`,
        keywords: ["확인", "포인트", writeCtx.topicFacet],
        group: "decision",
      },
      "expand",
      slot
    );
  }

  const trimmed = units.slice(0, MAX_INFORMATION_UNITS);

  return {
    topicRaw: writeCtx.topicRaw,
    topicFacet: writeCtx.topicFacet,
    readerPhrase: writeCtx.readerPhrase,
    brand: writeCtx.brand,
    region: writeCtx.region,
    categoryKey: coverage.categoryKey,
    units: trimmed,
    unitCount: trimmed.length,
    minUnits: MIN_INFORMATION_UNITS,
    targetUnits: TARGET_INFORMATION_UNITS,
    maxUnits: MAX_INFORMATION_UNITS,
    meetsMinimum: trimmed.length >= MIN_INFORMATION_UNITS,
    coverageAreaCount: coverage.coverageCount,
  };
}

export const TOPIC_DECOMPOSITION_BRIEF = `【BRICLOG · 주제 분해 · 칼럼 재구성】
- 사용자가 입력한 주제 문장을 그대로 본문·제목에 붙여넣지 않는다.
- 먼저 주제를 20~50개 세부 정보 단위로 분해하고, 각 단위를 조사·정리한 뒤 전문 에디터가 칼럼처럼 재구성한다.
- 정보 단위는 서로 달라야 하며, 키워드 나열·주제 문장 반복·동일 FAQ 복제 금지.
- 주제는 「독자의 선택·고민·확인 항목」으로 재해석해 쓴다.`;

export const EDITOR_RECONSTRUCTION_BRIEF = `【전문 에디터 · 칼럼 작성】
- 조사된 정보 단위를 순서대로 나열하지 말고, 기(상황)→승(정보)→전(기준)→결(정리) 흐름으로 엮는다.
- 각 문단은 하나의 정보 단위를 독자 언어로 풀어쓴다. 내부 검수·엔진·PLAN 용어 출력 금지.
- 확인되지 않은 가격·스펙·효과는 단정하지 않는다.`;

export function formatInformationUnitsForPrompt(decomposition, input = {}) {
  if (!decomposition?.units?.length) return "";
  const lines = [
    "【INFORMATION UNITS · 주제 분해 — 출력 금지】",
    TOPIC_DECOMPOSITION_BRIEF,
    EDITOR_RECONSTRUCTION_BRIEF,
    `원문 주제(그대로 출력 금지): 「${decomposition.topicRaw || "-"}」`,
    `재해석 축(본문 표현): ${decomposition.readerPhrase} · ${decomposition.topicFacet}`,
    `정보 단위 ${decomposition.unitCount}개 (목표 ${TARGET_INFORMATION_UNITS}, 최소 ${MIN_INFORMATION_UNITS})`,
    "각 단위마다 서로 다른 사실·기준·절차·FAQ — 복사·반복 금지",
  ];
  decomposition.units.forEach((u, i) => {
    lines.push(
      `${i + 1}. [${u.label}] ${u.headingSuffix} — ${u.keywords.slice(0, 4).join(", ")}`
    );
  });
  return lines.join("\n");
}

export function scoreInformationUnitsInPack(decomposition, pack) {
  const text = getChannelFullText(pack, "blog");
  const covered = [];
  const missing = [];
  for (const unit of decomposition.units || []) {
    const hit =
      unit.keywords.some((k) => k.length >= 2 && text.includes(k)) ||
      (unit.label && text.includes(unit.label));
    if (hit) covered.push(unit);
    else missing.push(unit);
  }
  const ratio = decomposition.units.length
    ? covered.length / decomposition.units.length
    : 0;
  return {
    covered,
    missing,
    ratio,
    ok: covered.length >= Math.min(12, Math.floor(decomposition.units.length * 0.35)),
  };
}

export function detectVerbatimTopicUsage(pack, input = {}) {
  const raw = topicRaw(input);
  if (!raw || raw.replace(/\s/g, "").length < 4) {
    return { ok: true, count: 0, maxAllowed: 0 };
  }
  const facet = topicWritingFacet(input);
  const full = getChannelFullText(pack, "blog");
  const charLen = full.replace(/\s/g, "").length;
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const count = (full.match(new RegExp(escaped, "g")) || []).length;
  const sectionCount = pack?.sections?.length || 0;
  const promoStripped = raw.replace(/특별\s*할인|할인\s*행사|프로모션|이벤트|행사/gi, "").trim();
  const isProductNounTopic =
    sectionCount >= 4 &&
    (facet === promoStripped || facet === raw || raw.startsWith(facet));
  const maxAllowed = isProductNounTopic
    ? Math.min(sectionCount + 4, Math.max(6, Math.ceil(charLen / 280)))
    : Math.max(2, Math.min(6, Math.ceil(charLen / 900)));
  const sectionOpens = (pack?.sections || []).map((s) => String(s.body || "").slice(0, 120));
  const openHits = sectionOpens.filter((o) => o.includes(raw) || o.includes(facet)).length;
  const maxOpenHits = isProductNounTopic ? Math.min(3, Math.ceil(sectionCount / 4)) : 1;
  const ok = count <= maxAllowed && openHits <= maxOpenHits;
  return { ok, count, maxAllowed, openHits, maxOpenHits, raw, facet, isProductNounTopic };
}

function topicScrubReplacement(input = {}) {
  const raw = topicRaw(input);
  const facet = topicWritingFacet(input);
  if (facet && facet !== raw && facet.replace(/\s/g, "").length >= 2) {
    return facet;
  }
  if (!raw || raw.replace(/\s/g, "").length < 4) return facet || "이용 안내";

  for (let slot = 0; slot < 6; slot++) {
    const candidate = topicReaderPhrase(input, slot);
    if (candidate && candidate !== raw && !candidate.includes(raw)) {
      return candidate;
    }
  }

  const tokens = (facet || raw).split(/\s+/).filter(Boolean);
  const tail = tokens.length > 1 ? tokens[tokens.length - 1] : null;
  if (tail && tail !== raw) return tail;

  const brand = String(input.brandName || "매장").trim();
  return `${brand} 안내`;
}

export function sanitizeVerbatimTopicInPack(pack, input = {}, channel = "blog") {
  if (!pack) return pack;
  const raw = topicRaw(input);
  if (!raw || raw.replace(/\s/g, "").length < 4) return pack;
  const replacement = topicScrubReplacement(input);
  if (pack._meta?.missionProseFallback) {
    return pack;
  }

  const scrub = (text) => {
    const s = String(text || "");
    if (!s.includes(raw)) return s;
    return s.split(raw).join(replacement).replace(/\s+/g, " ").trim();
  };

  const next = {
    ...pack,
    title: scrub(pack.title),
    representativeTitle: scrub(pack.representativeTitle),
    sections: (pack.sections || []).map((s) => ({
      ...s,
      heading: scrub(s.heading),
      body: scrub(s.body),
    })),
    conclusion: scrub(pack.conclusion),
  };

  if (channel === "place") {
    next.shortNotice = scrub(pack.shortNotice);
    next.shortBody = scrub(pack.shortBody);
    next.detailBody = scrub(pack.detailBody);
    next.body = scrub(pack.body);
  }
  if (channel === "instagram") {
    next.hook = scrub(pack.hook);
    next.body = scrub(pack.body);
    next.ending = scrub(pack.ending);
    next.lineBreakBody = scrub(pack.lineBreakBody);
    next.legacyBody = scrub(pack.legacyBody);
  }

  return next;
}

export function buildTopicDecompositionPromptBlock(input = {}) {
  const decomposition = decomposeTopicToInformationUnits(input);
  return formatInformationUnitsForPrompt(decomposition, input);
}
