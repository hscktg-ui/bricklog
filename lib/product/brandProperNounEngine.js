/**
 * 브랜드·제품 고유명(스트레스리스·모델코드 등) 본문 반영 점수
 * — 일반 topic_dominance/verbatim 규칙과 분리해 조사형·프랜차이즈 제품 글값 축 보강
 */
import { topicRaw, isResearchHeavyTopicInput } from "@/lib/content/topicFacetEngine";
import {
  extractFurnitureProductLabel,
  isFurnitureChairProductTopic,
} from "@/lib/product/furnitureProductProseEngine";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";

const MODEL_CODE_RE =
  /\bSTRESSLESS(?:\s+[A-Z0-9]{2,}){1,4}\b|\b[A-Z]{2,}(?:\s+[A-Z0-9]{2,}){1,3}\b/gi;
const SPEC_PHRASE_RE =
  /제로지|리클라이|좌판|등받이|쿠션|모션|팔걸이|체어|다이닝/gi;

function clampScore(n, min = 38, max = 96) {
  if (typeof n !== "number" || Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function normalizeMatchText(text = "") {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {Record<string, unknown>} input
 */
export function isBrandSpecificTopicInput(input = {}) {
  if (isResearchHeavyTopicInput(input)) return true;
  if (isFurnitureChairProductTopic(input)) return true;
  const raw = topicRaw(input) || "";
  return MODEL_CODE_RE.test(raw) || /[A-Z]{2,}\s*[A-Z0-9]{2,}/.test(raw);
}

/**
 * @param {Record<string, unknown>} input
 */
export function collectBrandProperNounTokens(input = {}) {
  const tokens = [];
  const seen = new Set();
  const add = (text, kind = "generic", weight = 1) => {
    const t = String(text || "").trim();
    const key = normalizeMatchText(t);
    if (t.length < 2 || t.length > 48 || !key || seen.has(key)) return;
    seen.add(key);
    tokens.push({ text: t, kind, weight });
  };

  add(input.brandName, "brand", 2);
  add(input.region, "region", 1);

  const raw = topicRaw(input) || String(input.topic || input.mainKeyword || "").trim();
  add(extractFurnitureProductLabel(input), "product", 3);

  for (const m of raw.match(MODEL_CODE_RE) || []) {
    add(m, "model", 3);
  }

  for (const part of raw.split(/[,，·|/\n]+/)) {
    const t = part.trim();
    if (t.length >= 4 && t.length <= 36) add(t, "topicPhrase", 2);
  }

  for (const row of collectMergedResearchFacts(
    input,
    input.v2AxisParsed,
    input.research
  )) {
    const f = String(row?.fact || row || "").trim();
    if (f.length < 5) continue;
    add(f.slice(0, Math.min(28, f.length)), "research", +2);
    for (const m of f.match(MODEL_CODE_RE) || []) add(m, "model", 3);
    for (const m of f.match(SPEC_PHRASE_RE) || []) add(m, "spec", 1);
  }

  for (const part of String(input.storeFeatures || "").split(/[,，·|/\n]+/)) {
    const t = part.trim();
    if (/스트레스리스|stressless|체어|쇼룸|프랜차이즈/i.test(t)) {
      add(t, "store", 1);
    }
  }

  if (isFurnitureChairProductTopic(input) || /stressless|스트레스리스/i.test(raw)) {
    add("스트레스리스", "alias", 2);
    add("STRESSLESS", "alias", 2);
    add("다이닝체어", "category", 1);
  }

  return tokens;
}

function tokenMatchesFull(token, fullNorm) {
  const t = normalizeMatchText(token.text);
  if (!t) return false;
  if (fullNorm.includes(t)) return true;

  if (token.kind === "alias") {
    if (/stressless/.test(t)) return /stressless|스트레스리스/.test(fullNorm);
    if (/스트레스리스/.test(t)) return /stressless|스트레스리스/.test(fullNorm);
  }

  if (token.kind === "model" || token.kind === "product") {
    const parts = t.split(/\s+/).filter((p) => p.length >= 2);
    if (parts.length >= 2 && parts.every((p) => fullNorm.includes(p))) return true;
    if (parts.length >= 1 && parts[0].length >= 4 && fullNorm.includes(parts[0])) {
      return parts.length === 1;
    }
  }

  if ((token.kind === "research" || token.kind === "store") && t.length >= 8) {
    const anchor = t.slice(0, 8);
    return fullNorm.includes(anchor);
  }

  return false;
}

/**
 * @param {string} fullText
 * @param {Record<string, unknown>} input
 */
export function scoreBrandProperNounAnchoring(fullText = "", input = {}) {
  const tokens = collectBrandProperNounTokens(input);
  if (!tokens.length) {
    return {
      score: 52,
      hits: [],
      misses: [],
      productRatio: 0,
      researchRatio: 0,
      tokenCount: 0,
      brandSpecific: false,
    };
  }

  const fullNorm = normalizeMatchText(fullText);
  const hits = tokens.filter((t) => tokenMatchesFull(t, fullNorm));
  const misses = tokens.filter((t) => !tokenMatchesFull(t, fullNorm));

  const productPool = tokens.filter((t) =>
    ["product", "model", "topicPhrase", "alias", "category"].includes(t.kind)
  );
  const productHitCount = hits.filter((t) =>
    ["product", "model", "topicPhrase", "alias", "category"].includes(t.kind)
  ).length;
  const productRatio = productPool.length
    ? productHitCount / productPool.length
    : 0;

  const researchPool = tokens.filter((t) =>
    ["research", "spec", "store"].includes(t.kind)
  );
  const researchHitCount = hits.filter((t) =>
    ["research", "spec", "store"].includes(t.kind)
  ).length;
  const researchRatio = researchPool.length
    ? researchHitCount / researchPool.length
    : 0;

  const weightedTotal = tokens.reduce((sum, t) => sum + (t.weight || 1), 0);
  const weightedHits = hits.reduce((sum, t) => sum + (t.weight || 1), 0);
  const weightedRatio = weightedTotal ? weightedHits / weightedTotal : 0;

  let score = 42 + weightedRatio * 46;
  if (hits.some((t) => t.kind === "brand")) score += 8;
  if (productRatio >= 0.45) score += 10;
  if (productRatio >= 0.7) score += 6;
  if (researchRatio >= 0.35) score += 8;
  if (/mint\s*lb|d200|제로지|리클라/i.test(fullNorm)) score += 6;

  return {
    score: clampScore(score),
    hits: hits.map((t) => t.text),
    misses: misses.slice(0, 6).map((t) => t.text),
    productRatio,
    researchRatio,
    weightedRatio,
    tokenCount: tokens.length,
    brandSpecific: isBrandSpecificTopicInput(input),
  };
}

/**
 * 조사 팩트 — 고유명·모델코드 alias 매칭
 */
export function scoreResearchFactAnchoringForInput(fullText = "", input = {}) {
  const facts = collectMergedResearchFacts(
    input,
    input.v2AxisParsed,
    input.research
  );
  if (!facts.length) {
    return { score: 52, anchored: 0, total: 0, ratio: 0 };
  }

  const fullNorm = normalizeMatchText(fullText);
  let anchored = 0;
  let total = 0;

  for (const row of facts) {
    const f = String(row?.fact || row || "").trim();
    if (f.length < 4) continue;
    total += 1;

    const tokens = [
      f,
      f.slice(0, Math.min(16, f.length)),
      ...(f.match(MODEL_CODE_RE) || []),
      ...(f.match(SPEC_PHRASE_RE) || []),
    ].filter(Boolean);

    const matched = tokens.some((t) => {
      const n = normalizeMatchText(t);
      if (n.length < 4) return false;
      if (fullNorm.includes(n)) return true;
      if (/stressless|스트레스리스/.test(n)) {
        return /stressless|스트레스리스/.test(fullNorm);
      }
      return n.length >= 6 && fullNorm.includes(n.slice(0, 6));
    });

    if (matched) anchored += 1;
  }

  if (!total) return { score: 52, anchored: 0, total: 0, ratio: 0 };

  const ratio = anchored / total;
  let score = 44 + ratio * 52;
  if (ratio >= 0.55) score += 6;
  if (ratio >= 0.75) score += 4;

  return { score: clampScore(score), anchored, total, ratio };
}
