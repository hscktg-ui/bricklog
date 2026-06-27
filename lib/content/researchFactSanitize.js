/**
 * Research fact sanitization SSOT — SEO 치환·붙여쓴 검색어·엔진 스팸이 조사→GPT로 유입되지 않게
 */
import { isPromptOnlyResearchFactText } from "@/lib/content/displayBodyGuards";
import { isMetaOnlyResearchFact } from "@/lib/content/researchFactMetaFilter";
import { hasConcreteFactSignal } from "@/lib/content/researchFactMetaFilter";
import { ENGINE_SPAM_RES } from "@/lib/product/columnistEngineSpam";

export const RESEARCH_FACT_SANITIZE_VERSION = "research-fact-sanitize-v1";

const GLUED_SEARCH_TRAIL_RE =
  /[가-힣]{12,}(?:찾다|다녀|다녀왔|방문|후기|소개|검색)[가-힣]{8,}/;

const GLUED_CROSS_BRAND_RE =
  /(?:국수나무|돈까스|돈가스).{0,12}(?:목마|침대|매트리스|가구)|(?:목마|침대|매트리스).{0,12}(?:국수나무|돈까스|돈가스)/;

const REGION_BRAND_MASH_IN_FACT_RES = [
  /여주\s+여주목마/gi,
  /현장\s+매장\s+현장/gi,
  /근처\s*쇼룸\s*근처/gi,
  /이\s*지역\s*브랜드\s*이\s*지역/gi,
  /(?:근처|이\s*지역|현장)\s+(?:근처|이\s*지역|현장)+\s*[가-힣]{2,}/gi,
];

function isGluedSearchBlob(text = "") {
  const t = String(text || "").trim();
  if (!t) return false;
  if (GLUED_SEARCH_TRAIL_RE.test(t)) return true;
  if (GLUED_CROSS_BRAND_RE.test(t)) return true;
  const compact = t.replace(/\s/g, "");
  const spaces = (t.match(/\s/g) || []).length;
  if (compact.length >= 24 && spaces <= 1) return true;
  if (compact.length >= 40 && spaces / compact.length < 0.04) return true;
  return false;
}

/**
 * @param {string} text
 * @param {object} [input]
 * @param {string} [source]
 */
export function isPollutedResearchFactText(text = "", input = {}, source = "") {
  const t = String(text || "").trim();
  if (!t || t.length < 4) return true;
  if (isPromptOnlyResearchFactText(t, source)) return true;
  if (isMetaOnlyResearchFact(t, input, source)) return true;
  if (ENGINE_SPAM_RES.some((re) => re.test(t))) return true;
  if (REGION_BRAND_MASH_IN_FACT_RES.some((re) => re.test(t))) return true;
  if (isGluedSearchBlob(t)) return true;

  const region = String(input.region || "").trim();
  const brand = String(input.brandName || "").trim();
  if (region.length >= 2 && brand.length >= 3) {
    const escRegion = region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escBrand = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const doubleRegionBrand = new RegExp(`${escRegion}\\s+${escRegion}${escBrand.slice(region.length)}`, "i");
    if (doubleRegionBrand.test(t)) return true;
  }

  return false;
}

function normalizeFactRow(row, input = {}) {
  if (typeof row === "string") {
    const fact = row.trim();
    if (isPollutedResearchFactText(fact, input)) return null;
    return { fact, axis: "mixed", source: "sanitized" };
  }
  const fact = String(row?.fact || row?.text || row?.value || "").trim();
  const source = row?.source || "";
  if (!fact || isPollutedResearchFactText(fact, input, source)) return null;
  return {
    ...row,
    fact,
    source: row.source || "research",
  };
}

/**
 * @param {Array} facts
 * @param {object} [input]
 */
export function sanitizeResearchFactsList(facts = [], input = {}) {
  const seen = new Set();
  const out = [];
  for (const row of facts || []) {
    const norm = normalizeFactRow(row, input);
    if (!norm?.fact) continue;
    const key = norm.fact.slice(0, 96).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
  }
  return out;
}

function splitContextClauses(text = "") {
  return String(text || "")
    .split(/[,，·/\n|]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
}

/** storeFeatures·포함할 내용 → 구체 조사 팩트 (게이트 3건+ SSOT) */
export function injectBrandContextResearchFacts(input = {}) {
  const brand = String(input.brandName || "").trim();
  const base = sanitizeResearchFactsList(input.researchFacts || [], input);
  const seen = new Set(base.map((r) => r.fact.slice(0, 96).toLowerCase()));
  const out = [...base];

  const push = (fact, source, axis = "brand") => {
    const t = String(fact || "").trim();
    if (t.length < 8 || seen.has(t.slice(0, 96).toLowerCase())) return;
    if (isPollutedResearchFactText(t, input, source)) return;
    if (!hasConcreteFactSignal(t)) return;
    out.push({ fact: t, source, axis });
    seen.add(t.slice(0, 96).toLowerCase());
  };

  for (const chunk of splitContextClauses(input.storeFeatures)) {
    if (!brand) push(chunk, "store_features", "brand");
    else push(`${brand} — ${chunk}`, "store_features", "brand");
  }

  for (const chunk of splitContextClauses(input.includePhrases)) {
    if (brand && !chunk.includes(brand)) push(`${brand} — ${chunk}`, "include_phrases", "topic");
    else push(chunk, "include_phrases", "topic");
  }

  const desc = String(input.brandDescription || "").trim();
  if (desc.length >= 12 && desc.length <= 120) {
    push(brand ? `${brand} — ${desc}` : desc, "brand_description", "brand");
  }

  const topic = String(input.topic || input.mainKeyword || "")
    .replace(/,?\s*직접\s*다녀왔.*$/i, "")
    .replace(/\s*직접\s*다녀왔.*$/i, "")
    .trim();
  if (topic.length >= 6 && brand && /수영|승마|체험|오픈|시즌|메뉴|프로그램/.test(topic)) {
    push(`${brand} ${topic}`, "topic_extract", "topic");
  }

  return out;
}

/** 생성 입력 — researchFacts·v2 축 조사 정화 */
export function sanitizeGenerationInputResearch(input = {}) {
  if (!input || typeof input !== "object") return input;
  const next = { ...input };
  let removed = 0;

  if (Array.isArray(next.researchFacts)) {
    const before = next.researchFacts.length;
    next.researchFacts = injectBrandContextResearchFacts(next);
    removed += Math.max(0, before - (next.researchFacts?.length || 0));
  } else {
    next.researchFacts = injectBrandContextResearchFacts(next);
  }
  next.researchFactCount = next.researchFacts?.length || 0;

  if (next.research?.researchFacts) {
    const before = next.research.researchFacts.length;
    next.research = {
      ...next.research,
      researchFacts: sanitizeResearchFactsList(next.research.researchFacts, next),
    };
    removed += before - next.research.researchFacts.length;
  }

  if (next.v2Axis?.researchFacts) {
    const before = next.v2Axis.researchFacts.length;
    next.v2Axis = {
      ...next.v2Axis,
      researchFacts: sanitizeResearchFactsList(next.v2Axis.researchFacts, next),
    };
    removed += before - next.v2Axis.researchFacts.length;
  }

  if (removed > 0) {
    next.researchFactsSanitized = true;
    next.researchFactsRemovedCount = removed;
  }

  return next;
}
