/**
 * 브랜드·제품 고유명 본문 반영 — researchProperNounProfile 래퍼 (하위 호환)
 */
export {
  isBrandSpecificTopicInput,
  isResearchProperNounTopic,
  resolveResearchProperNounProfile,
  extractResearchProductLabel,
  collectResearchProperNounTokens,
  scoreResearchProperNounAnchoring as scoreBrandProperNounAnchoring,
  scoreResearchFactAnchoringForInput,
  normalizeProperNounMatchText,
  properNounTokenMatchesFull,
} from "@/lib/product/researchProperNounProfile";
