/**
 * 꽃집 · 꽃 추천 — V3 Explain Engine (키워드→문장 금지)
 */
import {
  topicRaw,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import {
  buildFlowerExplainParagraphs,
  isKeywordToSentenceLeak,
  isHollowInfoSentence,
} from "@/lib/product/briclogExplainEngine";

const RECOMMENDATION_TOPIC_RE =
  /(?:꽃\s*추천|어떤\s*꽃|꽃\s*이름|여름\s*꽃|봄\s*꽃|가을\s*꽃|겨울\s*꽃|시즌\s*꽃|꽃다발\s*추천)/;

export function isFlowerRecommendationTopic(input = {}) {
  const blob = `${input.topic || ""} ${input.mainKeyword || ""} ${input.writingSubject || ""}`;
  const key = resolveBriclogIndustryKey(input);
  const isFlower = key === "flower" || key === "unmanned_flower" || /꽃|플라워|flower/i.test(`${input.industry || ""}`);
  return isFlower && RECOMMENDATION_TOPIC_RE.test(blob);
}

export function isUnmannedFlowerShop(input = {}) {
  const blob = `${input.storeFeatures || ""} ${input.brandDescription || ""} ${input.brandName || ""}`;
  return /무인|24\s*시간|셀프|키오스크|무인꽃|그랩앤고|grab/i.test(blob);
}

/**
 * @returns {string[]}
 */
export function buildFlowerRecommendationMissionParagraphs(p, input = {}, researchLines = []) {
  return [
    ...buildFlowerExplainParagraphs(p, input),
    ...researchLines,
  ];
}

export function buildFlowerRecommendationFieldPad(p, input = {}, slot = 0) {
  const lines = buildFlowerExplainParagraphs(p, input);
  return lines[slot % lines.length] || lines[0] || "";
}

/** 직원·상담·키워드→문장·공허 문장 제거 */
export function isFlowerStaffVisitTemplate(text = "", input = {}) {
  if (!isUnmannedFlowerShop(input) && !isFlowerRecommendationTopic(input)) return false;
  const t = String(text || "");
  return (
    /직원분|상담\s*초반|보여\s*주셔서|짚어\s*주셔서/.test(t) ||
    /수월했|비교가\s*수월|맞추기\s*수월/.test(t) ||
    /안내\s*구성|구성\s*구성/.test(t) ||
    /확인해\s*확인해/.test(t) ||
    isKeywordToSentenceLeak(t) ||
    isHollowInfoSentence(t)
  );
}
