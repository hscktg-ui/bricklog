/**
 * 꽃집 · 꽃 추천 주제 — 방문 후기 템플릿 대신 구체 꽃명·브랜드 팩트 SSOT
 */
import {
  deriveTopicWritingContext,
  topicRaw,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import { buildHumanStoryProblemOpening } from "@/lib/product/humanStoryEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";

const SUMMER_FLOWERS = ["수국", "해바라기", "거베라", "라넌큘러스", "안개꽃"];
const SPRING_FLOWERS = ["튤립", "프리지아", "철쭉", "장미"];
const DEFAULT_FLOWERS = ["장미", "카네이션", "수국"];

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

function pickFlowerNames(input = {}) {
  const topic = `${input.topic || ""} ${input.mainKeyword || ""}`;
  if (/여름|summer/i.test(topic)) return SUMMER_FLOWERS;
  if (/봄|spring/i.test(topic)) return SPRING_FLOWERS;
  return DEFAULT_FLOWERS;
}

function brandFactTokens(input = {}, p) {
  const lines = [];
  const region = String(input.region || "").trim();
  const features = String(input.storeFeatures || "").trim();
  if (region && region !== "전국") lines.push(region);
  if (/24\s*시간|무인/.test(features)) lines.push("24시간 무인");
  if (/만원/.test(features)) lines.push("만원 꽃다발");
  if (/픽업|무인\s*픽업/.test(features)) lines.push("무인 픽업");
  if (p.brand) lines.push(p.brand);
  return lines;
}

/**
 * @returns {string[]}
 */
export function buildFlowerRecommendationMissionParagraphs(p, input = {}, researchLines = []) {
  const flowers = pickFlowerNames(input);
  const named = flowers.slice(0, 4).join("·");
  const unmanned = isUnmannedFlowerShop(input);
  const facts = brandFactTokens(input, p);
  const facet = topicWritingFacet(input) || topicRaw(input) || "여름 꽃";
  const regionBit = p.regionBit || "";

  return [
    buildHumanStoryProblemOpening(input),
    `${facet.startsWith("여름") ? facet : `여름철 ${facet}`}을 찾다 보면 이름부터 헷갈리는 경우가 많아요.`,
    `${named}처럼 시원한 톤이 선물·집들이에 자주 쓰입니다.`,
    unmanned
      ? `${regionBit}${p.brand}는 ${facts.includes("24시간 무인") ? "24시간 무인" : "무인"}으로 ${facts[0] || regionBit.trim() || "근처"}에서 바로 고를 수 있어요.`
      : `${regionBit}${p.brand} 진열대에서 ${flowers[0]}·${flowers[1]} 톤을 나란히 비교해 봤어요.`,
    facts.includes("만원 꽃다발")
      ? `만원대 꽃다발도 라인업에 있어 부담 없이 맞출 수 있었어요.`
      : `가격대별로 줄기 길이·포장 톤이 달라 목적에 맞게 고를 수 있었어요.`,
    `리본·메시지 카드는 포장 샘플을 보며 톤만 맞췄어요.`,
    unmanned
      ? `키오스크에서 주문하고 픽업함에서 받는 흐름이라 대기 없이 빠르게 마쳤어요.`
      : `당일 픽업·배송 가능 시간은 안내판에서 확인했어요.`,
    `${flowers[2]}는 실내에 두었을 때 색이 오래 가는 편이었고, ${flowers[3] || flowers[0]}는 선물용으로 무난했어요.`,
    ...researchLines,
  ];
}

export function buildFlowerRecommendationFieldPad(p, input = {}, slot = 0) {
  const flowers = pickFlowerNames(input);
  const unmanned = isUnmannedFlowerShop(input);
  const variants = unmanned
    ? [
        `${p.regionBit}${p.brand}에서 ${flowers[0]}·${flowers[1]}·${flowers[2]} 톤을 키오스크 화면으로 먼저 골랐어요.`,
        `24시간 무인이라 늦은 시간에도 ${flowers[1]} 포장을 맞출 수 있었어요.`,
        `만원 꽃다발 라인에서 ${flowers[2]}·${flowers[3] || flowers[0]} 조합을 바로 확인했어요.`,
        `픽업함에서 받을 때 리본·카드 문구만 톤에 맞게 바꿨어요.`,
      ]
    : [
        `진열대에서 ${flowers[0]}·${flowers[1]}·${flowers[2]} 색감을 나란히 비교해 봤어요.`,
        `여름철에는 ${flowers[0]}와 ${flowers[1]} 조합이 선물용으로 무난했어요.`,
        `포장 톤은 ${flowers[2]} 색에 맞춰 리본만 조정했어요.`,
        `당일 픽업 시간은 안내판에서 확인하고 일정에 맞췄어요.`,
      ];
  return variants[slot % variants.length];
}

/** 직원·상담·수월 템플릿 — 무인·꽃 추천 주제에서 제거 */
export function isFlowerStaffVisitTemplate(text = "", input = {}) {
  if (!isUnmannedFlowerShop(input) && !isFlowerRecommendationTopic(input)) return false;
  const t = String(text || "");
  return (
    /직원분|상담\s*초반|보여\s*주셔서|짚어\s*주셔서/.test(t) ||
    /수월했|비교가\s*수월|맞추기\s*수월/.test(t) ||
    /안내\s*구성|구성\s*구성/.test(t) ||
    /확인해\s*확인해/.test(t)
  );
}
