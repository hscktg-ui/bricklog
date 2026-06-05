/**
 * BRICLOG KNOWLEDGE MAP — 검색 결과를 주제·연관·FAQ·비교·구매·활용 축으로 재구성
 */
import { formatExpansionForPrompt } from "@/lib/research/searchExpansionEngine";

function uniqStrings(list = [], max = 12) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const s = String(raw || "").trim();
    if (s.length < 2) continue;
    const k = s.slice(0, 80).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function pullArray(obj, ...keys) {
  const bag = [];
  for (const key of keys) {
    const v = obj?.[key];
    if (Array.isArray(v)) bag.push(...v.map(String));
    else if (typeof v === "string" && v.trim()) bag.push(v.trim());
  }
  return bag;
}

/**
 * @param {{ expansion?: object; research?: object; brandContext?: object }} ctx
 */
export function buildKnowledgeMap(ctx = {}) {
  const expansion = ctx.expansion || {};
  const research = ctx.research || {};
  const v2 = research.v2Axis || {};
  const entities = expansion.entities || {};
  const buckets = expansion.buckets || {};

  const brandBlock = v2.brandAnalysis || {};
  const regionBlock = v2.regionAnalysis || {};
  const topicBlock = v2.topicAnalysis || {};
  const facts = [
    ...(research.researchFacts || []),
    ...(v2.researchFacts || []),
  ];

  const factsByAxis = {
    brand: facts.filter((f) => f.axis === "brand").map((f) => f.fact),
    region: facts.filter((f) => f.axis === "region").map((f) => f.fact),
    topic: facts.filter((f) => f.axis === "topic").map((f) => f.fact),
  };

  const map = {
    topic: entities.topic || ctx.brandContext?.topic || "",
    brand: entities.brand || ctx.brandContext?.brandName || "",
    region: entities.region || ctx.brandContext?.region || "",
    categoryKey: expansion.categoryKey || "default",
    relatedTopics: uniqStrings([
      ...pullArray(topicBlock, "features", "specs", "differentiators"),
      ...(buckets.product || []),
      ...(buckets.feature || []),
      entities.productCore,
      ...entities.productHints,
    ]),
    faq: uniqStrings([
      ...(buckets.faq || []),
      ...factsByAxis.topic.filter((f) => /Q\.|질문|문의|비용|예약/.test(f)),
    ]),
    comparisonPoints: uniqStrings([
      ...(buckets.compare || []),
      ...pullArray(topicBlock, "differentiators"),
      "가격·구성·일정·사후 지원·체험 가능 여부",
    ]),
    purchasePoints: uniqStrings([
      ...(buckets.purchase || []),
      entities.promoTerms?.length ? `프로모션: ${entities.promoTerms.join(" · ")}` : null,
      ...factsByAxis.topic.filter((f) => /가격|할인|행사|혜택|카드/.test(f)),
    ]),
    operationalPoints: uniqStrings([
      ...(buckets.ops || []),
      ...factsByAxis.topic.filter((f) => /설치|배송|AS|보증|교환/.test(f)),
    ]),
    visitPoints: uniqStrings([
      ...(buckets.visit || []),
      ...pullArray(regionBlock, "lifeArea", "searchIntents"),
      ...factsByAxis.region,
    ]),
    utilizationPoints: uniqStrings([
      ...(buckets.feature || []),
      ...pullArray(brandBlock, "features", "lineup", "strengths"),
      ...factsByAxis.brand,
    ]),
    verifiedFacts: uniqStrings(facts.map((f) => f.fact), 24),
    gaps: uniqStrings([
      ...(v2.gaps || []),
      ...(v2.factVerification?.gaps || []),
    ], 8),
    searchQueryCount: expansion.searchQueries?.length || 0,
    webResultCount: research.webSearch?.resultCount || 0,
  };

  map.summary = String(research.summary || "").trim().slice(0, 1200);
  return map;
}

/**
 * Writer·GPT용 — 스니펫 나열이 아닌 지식 맵
 */
export function formatKnowledgeMapForPrompt(map) {
  if (!map) return "";
  const lines = [
    "【KNOWLEDGE MAP · 조사 재구성 — 스니펫 복사 금지】",
    `주제: ${map.topic || "-"} · 브랜드: ${map.brand || "-"} · 지역: ${map.region || "-"}`,
  ];

  const section = (title, items) => {
    if (!items?.length) return;
    lines.push(`\n■ ${title}`);
    items.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  };

  section("연관 정보", map.relatedTopics);
  section("FAQ·독자 질문", map.faq);
  section("비교 요소", map.comparisonPoints);
  section("구매 포인트", map.purchasePoints);
  section("운영·설치·A/S", map.operationalPoints);
  section("방문·체험", map.visitPoints);
  section("활용·기능", map.utilizationPoints);

  if (map.verifiedFacts?.length) {
    lines.push("\n■ 확인된 실마리 (단정 가능 범위만)");
    map.verifiedFacts.slice(0, 14).forEach((t, i) => lines.push(`  ${i + 1}. ${t}`));
  }
  if (map.gaps?.length) {
    lines.push(`\n■ 미확인·단정 금지: ${map.gaps.join(" · ")}`);
  }
  if (map.summary) {
    lines.push(`\n■ 조사 요약\n${map.summary}`);
  }
  lines.push(
    "\n글은 소제목 나열이 아니라 위 축마다 서로 다른 정보 문장으로 전개."
  );
  return lines.join("\n");
}

/**
 * @param {object} research
 * @param {object} ctx
 */
export function attachKnowledgeMapToResearch(research, ctx = {}) {
  if (!research) return research;
  const map = buildKnowledgeMap(ctx);
  const expansionPrompt = ctx.expansion
    ? formatExpansionForPrompt(ctx.expansion)
    : "";
  const mapPrompt = formatKnowledgeMapForPrompt(map);
  const combined = [expansionPrompt, mapPrompt].filter(Boolean).join("\n\n");

  return {
    ...research,
    knowledgeMap: map,
    knowledgeMapPrompt: combined,
    searchExpansion: ctx.expansion || null,
  };
}
