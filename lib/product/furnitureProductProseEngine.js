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

  const opening =
    buildStoryTargetProblemOpening(input) ||
    "식사·작업을 한자리에서 오래 하다 보면 의자부터 불편해지는 경우가 많아요.";
  const topicLine = topicRaw(input) || `${facet} ${product}`;
  const facts = brandFactTokens(input, p);
  const franchiseBit = facts.find((f) => /프랜차이즈|쇼룸/.test(f)) || "프랜차이즈 쇼룸";
  const exhibitBit =
    facts.find((f) => /스트레스리스|체어\s*전시/.test(f)) || "스트레스리스 체어 전시";

  return [
    opening,
    `${topicLine}는 스트레스리스 다이닝체어 라인으로, 앉은 높이·등받이·리클라인을 한자리에서 조절하는 모델이에요.`,
    `${regionBit}${brand} ${franchiseBit}에서 ${exhibitBit} 구성을 보며 ${product}에 앉아 등받이 기울기와 좌판 깊이를 비교해 봤어요.`,
    `팔걸이 높이·좌판 쿠션 밀도를 바꿔 보니 거실·다이닝 동선과 맞는 조합이 달랐어요.`,
    `가죽·패브릭 마감과 스티치 라인을 가까이에서 보며 관리 방법을 함께 확인했어요.`,
    `프랜차이즈 매장이라 전시 모델은 지점마다 다를 수 있어, 당일 쇼룸 기준으로 메모해 두었어요.`,
    `${facet}를 고를 때는 앉은 높이·등받이 지지·리클라인 반응을 세 가지로 나눠 보면 헷갈림이 줄어요.`,
    `배송·조립·A/S 범위는 계약·행사 시점에 따라 달라질 수 있어 안내 받은 조건을 사진으로 남겼어요.`,
    ...researchLines,
  ];
}

export function buildFurnitureChairFieldPad(p, input = {}, slot = 0) {
  const product = extractFurnitureProductLabel(input);
  const variants = [
    `${p.regionBit}${p.brand}에서 ${product} 좌판 깊이와 등받이 각도를 조절해 보았어요.`,
    `식탁 높이에 맞는 좌판 높이인지 실제 테이블 옆에서 확인했어요.`,
    `리클라인 시 팔걸이와 발받침 간섭이 없는지 움직여 보며 봤어요.`,
    `전시 중인 컬러·소재 옵션을 나란히 두고 거실 톤과 맞췄어요.`,
  ];
  return variants[slot % variants.length];
}
