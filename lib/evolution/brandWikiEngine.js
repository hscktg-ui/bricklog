/**
 * 브랜드 위키 — 브랜드·조사·주제를 설명 가능한 구조로 정리
 * v2: 섹션(profile/topic/facts/voice/gaps) · 축 · 검증 · 주제 설명 가능 여부
 */
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { classifyFactVerification } from "@/lib/product/brandJournalistDirective";
import { isPromptOnlyResearchFactText } from "@/lib/content/displayBodyGuards";
import { buildTopicMap } from "@/lib/product/topicMapEngine";
import {
  BRAND_WIKI_SCHEMA_VERSION,
  WIKI_PROFILE_FIELDS,
  WIKI_SECTIONS,
  MIN_WIKI_ENTRIES,
  MIN_WIKI_VERIFIED_FACTS,
  MIN_TOPIC_EXPLAIN_ITEMS,
} from "@/lib/evolution/brandWikiSchema";

export const BRAND_WIKI_VERSION = BRAND_WIKI_SCHEMA_VERSION;
export { MIN_WIKI_ENTRIES, WIKI_SECTIONS };

function wikiEntry({ id, section, axis, label, value, source, verified = false, usableForBody = true }) {
  const text = String(value || "").trim();
  if (!text || text.length < 2) return null;
  if (usableForBody && isPromptOnlyResearchFactText(text, source)) return null;
  return {
    id,
    section,
    axis: axis || "mixed",
    label,
    value: text.slice(0, 400),
    source,
    verified: Boolean(verified),
    usableForBody: Boolean(usableForBody),
  };
}

function topicTokens(input = {}) {
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (!topic) return [];
  const parts = topic.split(/[\s·,，/]+/).filter((p) => p.length >= 2);
  return [topic, ...parts].filter(Boolean);
}

function factMatchesTopic(factText = "", tokens = []) {
  if (!tokens.length) return true;
  const t = String(factText || "");
  return tokens.some((tok) => tok.length >= 2 && t.includes(tok));
}

function buildTopicSection(input = {}) {
  const rows = [];
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const industry = String(input.industry || input.industryText || "").trim();

  if (brand) rows.push(wikiEntry({ id: "topic_brand", section: "topic", axis: "brand", label: "브랜드", value: brand, source: "write_request" }));
  if (region) rows.push(wikiEntry({ id: "topic_region", section: "topic", axis: "region", label: "지역", value: region, source: "write_request" }));
  if (topic) rows.push(wikiEntry({ id: "topic_subject", section: "topic", axis: "topic", label: "주제", value: topic, source: "write_request" }));
  if (industry) rows.push(wikiEntry({ id: "topic_industry", section: "topic", axis: "brand", label: "업종", value: industry, source: "write_request" }));
  if (input.includePhrases) {
    rows.push(
      wikiEntry({
        id: "topic_include",
        section: "topic",
        axis: "topic",
        label: "포함할 내용",
        value: String(input.includePhrases).trim(),
        source: "write_request",
      })
    );
  }
  return rows.filter(Boolean);
}

function buildProfileSection(input = {}) {
  const mem = input.brandMemory || {};
  const rows = [];
  for (const field of WIKI_PROFILE_FIELDS) {
    const row = wikiEntry({
      id: field.id,
      section: "profile",
      axis: field.axis,
      label: field.label,
      value: field.pick(mem),
      source: "brand_memory",
    });
    if (row) rows.push(row);
  }
  if (mem.preferredPhrases) {
    rows.push(
      wikiEntry({
        id: "preferred",
        section: "voice",
        axis: "brand",
        label: "선호 표현",
        value: mem.preferredPhrases,
        source: "brand_memory",
        usableForBody: false,
      })
    );
  }
  if (mem.avoidedExpressions) {
    rows.push(
      wikiEntry({
        id: "avoided",
        section: "voice",
        axis: "brand",
        label: "지양 표현",
        value: Array.isArray(mem.avoidedExpressions)
          ? mem.avoidedExpressions.join(" · ")
          : mem.avoidedExpressions,
        source: "brand_memory",
        usableForBody: false,
      })
    );
  }
  return rows.filter(Boolean);
}

function buildFactsSection(input = {}) {
  const tokens = topicTokens(input);
  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  const rows = [];
  for (const [i, row] of facts.entries()) {
    const fact = String(row?.fact || row || "").trim();
    if (fact.length < 6) continue;
    const verification = classifyFactVerification(row, input);
    const axis = String(row?.axis || "mixed");
    const topicRelated = factMatchesTopic(fact, tokens) || ["brand", "region"].includes(axis);
    rows.push(
      wikiEntry({
        id: `fact_${i}`,
        section: "facts",
        axis,
        label: topicRelated ? "주제 관련 사실" : "조사 사실",
        value: fact,
        source: row?.source || "research",
        verified: verification.verified,
        usableForBody: !isPromptOnlyResearchFactText(fact, row?.source),
      })
    );
  }
  return rows.filter(Boolean);
}

function dedupeEntries(entries = []) {
  const seen = new Set();
  return entries.filter((e) => {
    const key = `${e.section}:${e.label}:${e.value.slice(0, 48)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function groupBySection(entries = []) {
  /** @type {Record<string, typeof entries>} */
  const sections = {};
  for (const key of Object.keys(WIKI_SECTIONS)) {
    sections[key] = [];
  }
  for (const e of entries) {
    const sec = sections[e.section] ? e.section : "facts";
    sections[sec].push(e);
  }
  return sections;
}

function assessTopicExplainability(input = {}, entries = []) {
  const topicMap = input.topicMap || buildTopicMap(input);
  const blob = entries
    .filter((e) => e.usableForBody !== false)
    .map((e) => e.value)
    .join("\n");
  const required = topicMap?.requiredExplanationItems || [];
  const secured = [];
  const missing = [];

  for (const item of required) {
    const hit =
      item.keywords?.some((kw) => kw && blob.includes(kw)) ||
      item.patterns?.some((re) => re.test(blob));
    if (hit) secured.push(item.id);
    else missing.push(item.label);
  }

  const topicFacts = entries.filter(
    (e) => e.section === "facts" && e.label === "주제 관련 사실" && e.usableForBody !== false
  );

  return {
    ok: secured.length >= MIN_TOPIC_EXPLAIN_ITEMS || topicFacts.length >= MIN_WIKI_VERIFIED_FACTS,
    securedCount: secured.length,
    requiredCount: required.length,
    missingLabels: missing.slice(0, 8),
    topicFactCount: topicFacts.length,
    topicMap,
  };
}

/**
 * @param {Record<string, unknown>} input
 * @returns {import("@/lib/evolution/brandWikiSchema").BrandWikiDocument}
 */
export function buildBrandWiki(input = {}) {
  const entries = dedupeEntries([
    ...buildProfileSection(input),
    ...buildTopicSection(input),
    ...buildFactsSection(input),
  ]);

  const sections = groupBySection(entries);
  const verifiedFactCount = entries.filter((e) => e.section === "facts" && e.verified).length;
  const bodyUsableCount = entries.filter((e) => e.usableForBody !== false && e.section !== "voice").length;
  const explain = assessTopicExplainability(input, entries);

  const gapEntries = explain.missingLabels.map((label, i) =>
    wikiEntry({
      id: `gap_${i}`,
      section: "gaps",
      axis: "topic",
      label: "설명 부족",
      value: label,
      source: "topic_map",
      usableForBody: false,
    })
  ).filter(Boolean);

  const allEntries = [...entries, ...gapEntries];
  const allSections = groupBySection(allEntries);

  const count = bodyUsableCount;
  const ok =
    count >= MIN_WIKI_ENTRIES &&
    verifiedFactCount >= MIN_WIKI_VERIFIED_FACTS &&
    explain.ok;

  return {
    version: BRAND_WIKI_VERSION,
    entries: allEntries,
    sections: allSections,
    count,
    entryCount: count,
    verifiedFactCount,
    topicExplainable: explain.ok,
    explainGaps: explain.missingLabels,
    topicFactCount: explain.topicFactCount,
    ok,
  };
}

export function formatBrandWikiBrief(wiki = {}) {
  if (!wiki.entries?.length) return "";

  const lines = [`【브랜드 위키 · ${wiki.version || BRAND_WIKI_VERSION}】`];

  const pushSection = (sectionId, title, filterFn) => {
    const items = (wiki.sections?.[sectionId] || wiki.entries.filter(filterFn)).slice(0, 12);
    if (!items.length) return;
    lines.push(`\n■ ${title}`);
    for (const e of items) {
      const mark = e.verified ? "✓" : e.section === "gaps" ? "!" : "·";
      lines.push(`${mark} ${e.label}: ${e.value}`);
    }
  };

  pushSection("topic", WIKI_SECTIONS.topic.label, (e) => e.section === "topic");
  pushSection("profile", WIKI_SECTIONS.profile.label, (e) => e.section === "profile");
  pushSection(
    "facts",
    WIKI_SECTIONS.facts.label,
    (e) => e.section === "facts" && e.usableForBody !== false
  );

  if (wiki.explainGaps?.length) {
    lines.push(`\n■ ${WIKI_SECTIONS.gaps.label}`);
    for (const g of wiki.explainGaps.slice(0, 6)) {
      lines.push(`! ${g}`);
    }
    lines.push("위 항목은 조사·본문에서 반드시 설명. 범용 안내·패딩으로 대체 금지.");
  }

  return lines.join("\n").slice(0, 2800);
}

/**
 * 조사·위키가 주제를 설명할 수 있는지 (생성 전 검증)
 */
export function assessBrandWikiReadiness(input = {}) {
  const wiki = buildBrandWiki(input);
  const blob = wiki.entries
    .filter((e) => e.usableForBody !== false && e.section !== "gaps")
    .map((e) => e.value)
    .join("\n");
  const brand = String(input.brandName || input.brandMemory?.brandName || "").trim();
  const hasBrand = !brand || blob.includes(brand);

  return {
    ok: wiki.ok && hasBrand,
    wiki,
    entryCount: wiki.entryCount,
    count: wiki.count,
    verifiedFactCount: wiki.verifiedFactCount,
    topicExplainable: wiki.topicExplainable,
    explainGaps: wiki.explainGaps,
    hasBrandAnchor: hasBrand,
    minEntries: MIN_WIKI_ENTRIES,
    minVerifiedFacts: MIN_WIKI_VERIFIED_FACTS,
    reasons: [
      ...(wiki.count >= MIN_WIKI_ENTRIES ? [] : ["wiki_entries_low"]),
      ...(wiki.verifiedFactCount >= MIN_WIKI_VERIFIED_FACTS ? [] : ["verified_facts_low"]),
      ...(wiki.topicExplainable ? [] : ["topic_not_explainable"]),
      ...(hasBrand ? [] : ["brand_anchor_missing"]),
    ],
  };
}

/** @deprecated v1 alias */
export const WIKI_FIELDS = WIKI_PROFILE_FIELDS;
