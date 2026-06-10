/**
 * 가구·프랜차이즈 매장 — 제품형 주제 (스트레스리스 체어 등)
 * 침대 전시·매트리스 템플릿과 분리
 */
import {
  topicRaw,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { buildStoryTargetProblemOpening } from "@/lib/product/storyTargetEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import {
  buildChairExplainedParagraphs,
  isHollowInfoSentence,
  isKeywordToSentenceLeak,
} from "@/lib/product/briclogExplainEngine";

const CHAIR_PRODUCT_RE =
  /스트레스리스|stressless|다이닝체어|dining\s*chair|리클라이너\s*체어|체어\s*mint|mint\s*lb/i;

const MODEL_CODE_RE = /\b[A-Z]{2,}\s*[A-Z0-9]{2,}(?:\s+[A-Z]\d+)?\b/;

export function isFurnitureChairProductTopic(input = {}) {
  const blob = `${input.topic || ""} ${input.mainKeyword || ""} ${input.brandName || ""}`;
  const key = resolveBriclogIndustryKey(input);
  const furniture =
    key === "furniture" ||
    /가구|침대|에이스|쇼룸|furniture|침구/i.test(`${input.industry || ""} ${blob}`);
  return furniture && CHAIR_PRODUCT_RE.test(blob);
}

export function extractFurnitureProductLabel(input = {}) {
  const raw = topicRaw(input) || String(input.topic || input.mainKeyword || "").trim();
  const fullStressless = raw.match(/STRESSLESS\s+MINT\s+LB\s+D\d+/i);
  if (fullStressless) return fullStressless[0].trim();
  const model = raw.match(MODEL_CODE_RE)?.[0];
  if (model) return model.trim();
  if (/stressless/i.test(raw)) {
    const m = raw.match(/STRESSLESS[^\n,，.]{0,40}/i);
    return m ? m[0].trim() : "STRESSLESS";
  }
  return topicWritingFacet(input) || "다이닝체어";
}

function brandFactTokens(input = {}, p = {}) {
  const lines = [];
  const features = String(input.storeFeatures || "").trim();
  if (p.brand) lines.push(p.brand);
  const region = String(input.region || "").trim();
  if (region.length >= 2 && region !== "전국") lines.push(region);
  for (const part of features.split(/[,，·|/|\n]+/)) {
    const t = part.trim();
    if (t.length >= 2 && t.length <= 24) lines.push(t);
  }
  return lines;
}

/** 침대 전시 전용 — 체어 주제에서는 사용 금지 */
export function isFurnitureMattressExhibitionPad(text = "", input = {}) {
  if (!isFurnitureChairProductTopic(input)) return false;
  const t = String(text || "");
  const chairScene = /체어|다이닝|stressless|스트레스리스|좌판|등받이|리클라인|앉아/.test(t);
  if (chairScene) {
    return /누워|매트리스|헤드보드|침실\s*통로|프레임·침실\s*연출|10분\s*넘게\s*누워|지지감과\s*뒤척임/.test(t);
  }
  return (
    /누워|매트리스|헤드보드|침실\s*통로|프레임·침실\s*연출|전시\s*구성\s*안내|오피모/.test(t) ||
    /10분\s*넘게\s*누워|지지감과\s*뒤척임/.test(t)
  );
}

export function isFurnitureEngineDefect(text = "", input = {}) {
  const t = String(text || "");
  if (!t.trim()) return true;
  if (/\([^)]*기준\)/.test(t)) return true;
  if (/✔/.test(t)) return true;
  if (/이번\s*전시\s*을|전시\s*구성\s*안내|메뉴\s*기준/.test(t)) return true;
  if (/선택이\s*수월|비교가\s*수월|착와감|전시\s*소식/.test(t)) return true;
  if (/에이스침대\s*안내\s*[A-Z0-9]/.test(t)) return true;
  if (/동선와\s*재질을/.test(t)) return true;
  if (isFurnitureMattressExhibitionPad(t, input)) return true;
  if (isHollowInfoSentence(t) || isKeywordToSentenceLeak(t)) return true;
  return false;
}

/**
 * @returns {string[]}
 */
export function buildFurnitureChairProductParagraphs(p, input = {}, researchLines = []) {
  const product = extractFurnitureProductLabel(input);
  const brand = p.brand || String(input.brandName || "").trim();
  const regionBit = p.regionBit || "";
  const facet = topicWritingFacet(input) || product;

  const explained = buildChairExplainedParagraphs(p, input, product);
  const storyOpening = buildStoryTargetProblemOpening(input);
  if (storyOpening && !explained.some((line) => line.slice(0, 20) === storyOpening.slice(0, 20))) {
    return [storyOpening, ...explained, ...researchLines];
  }
  return [...explained, ...researchLines];
}

export function buildFurnitureChairFieldPad(p, input = {}, slot = 0) {
  const product = extractFurnitureProductLabel(input);
  const variants = buildChairExplainedParagraphs(p, input, product);
  return variants[slot % variants.length];
}
