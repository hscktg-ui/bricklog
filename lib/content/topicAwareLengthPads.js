/**
 * 분량 보강용 — 주제·브랜드·지역·업종 키워드를 포함한 중립 소비자 안내 문단
 */
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { topicWritingFacet, defaultTopicFacet } from "@/lib/content/topicFacetEngine";
import { getIndustryFlavorForInput, isFurnitureIndustry } from "@/lib/product/industryContextEngine";

function buildFurnitureConsumerPads(input = {}, slot = 0, count = 12) {
  const brand = String(input.brandName || "브랜드").trim();
  const region = String(input.region || "").trim();
  const kw = String(input.mainKeyword || "").trim();
  const facet = topicWritingFacet(input) || kw || "전시";
  const label = kw || facet;
  const topicObj = koreanObjectParticle(label);
  const regionBit = region ? `${region} ` : "";

  const variants = [
    `${regionBit}${brand} ${label} — 전시 구성·체험 가능 모델은 매장 안내를 기준으로 확인하세요.`,
    `${label}를 고를 때 ${brand} 기준으로 가격·구성·설치 범위를 함께 적어 두면 선택이 빨라집니다.`,
    `${regionBit}${brand} ${label} 한정 구성은 시기·지점별로 달라질 수 있습니다.`,
    `${brand} ${label} 안내는 지점·요일마다 다를 수 있어 방문·문의 전에 최신 정보를 확인하세요.`,
    `${topicObj} 고를 때 ${regionBit}${brand} 전시대·체험 동선을 먼저 보면 기준이 분명해집니다.`,
    `${label} 관련 FAQ는 ${brand}${region ? ` ${region}` : ""} 공식 채널에서 확인한 뒤 메모해 두면 상담이 수월합니다.`,
    `${regionBit}${brand} ${label} 방문 시 주차·대기·체험 시간을 함께 보면 동선이 편합니다.`,
    `${brand} ${label} — 확인되지 않은 할인·재고는 단정하지 말고 매장·공식 문의로 확인하세요.`,
    `시즌·한정 ${label}는 구성·모델 배치가 달라질 수 있어 당일 안내를 기준으로 보면 됩니다.`,
    `${brand} ${label} 포인트는 원재료·사이즈·설치 조건을 함께 확인하는 편이 좋습니다.`,
    `${regionBit}${brand}에서 ${label} 관련 문의는 전화·플레이스·SNS 중 편한 채널로 하면 빠릅니다.`,
    `${label} 비교 시 ${brand} 라인업·가격·설치 조건을 나눠 적어 두었습니다.`,
    `${brand} ${label} — 동일 브랜드라도 지점·시기에 따라 전시 구성이 달라질 수 있습니다.`,
    `${regionBit}${brand} ${label} 방문 전 혼잡 시간·체험 대기를 미리 보면 편합니다.`,
    `${label} 관련 ${brand} 공지·이벤트는 공식 채널 기준으로 다시 확인하는 것이 안전합니다.`,
  ];

  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(variants[(slot + i) % variants.length]);
  }
  return out;
}

function buildIndustryConsumerPads(input = {}, slot = 0, count = 12) {
  const brand = String(input.brandName || "브랜드").trim();
  const region = String(input.region || "").trim();
  const kw = String(input.mainKeyword || "").trim();
  const facet = topicWritingFacet(input) || kw || defaultTopicFacet(input);
  const label = kw || facet;
  const topicObj = koreanObjectParticle(label);
  const regionBit = region ? `${region} ` : "";
  const { key } = getIndustryFlavorForInput(input);

  const shared = [
    `${regionBit}${brand} ${label} — 영업·예약·문의는 공식·플레이스 안내로 확인하는 편이 정확합니다.`,
    `${label}를 비교할 때 ${brand} 기준으로 일정·구성·비용을 함께 적어 두면 선택이 빨라집니다.`,
    `${brand} ${label} 안내는 지점·시기마다 다를 수 있어 방문·문의 전에 최신 정보를 확인하세요.`,
    `${regionBit}${brand} ${label} — 확인되지 않은 할인·재고는 단정하지 말고 매장·공식 문의로 확인하세요.`,
    `${regionBit}${brand}에서 ${label} 관련 문의는 전화·플레이스·SNS 중 편한 채널로 하면 빠릅니다.`,
  ];

  const byKey = {
    flower: [
      `${topicObj} 고를 때 ${regionBit}${brand} 진열대·포장·픽업 시간을 먼저 보면 기준이 분명해집니다.`,
      `${brand} ${label} 포인트는 색감·보관·선물 목적을 함께 확인하는 편이 좋습니다.`,
      `시즌·한정 ${kw || label}는 재고·픽업 시간에 따라 달라질 수 있어 당일 안내를 기준으로 보면 됩니다.`,
    ],
    pet: [
      `${brand} ${label} 포인트는 성분·알레르기·급여 방법을 함께 확인하는 편이 좋습니다.`,
    ],
    education: [
      `${topicObj} 알아볼 때 ${regionBit}${brand} 대상 학년·특강 일정·등록 방법을 먼저 보면 기준이 분명해집니다.`,
      `${brand} ${label} — 커리큘럼·반 편성·수업 시간은 상담 안내를 기준으로 확인하세요.`,
      `방학 특강·내신 범위는 시기에 따라 달라질 수 있어 상담으로 다시 확인하는 편이 좋습니다.`,
    ],
    craft: [
      `${topicObj} 예약 전 ${regionBit}${brand} 소요 시간·난이도·인원 제한을 먼저 보면 기준이 분명해집니다.`,
      `${brand} ${label} — 준비물·취소 규정·주차는 예약 전에 확인하는 편이 좋습니다.`,
    ],
    pension: [
      `${topicObj} 예약 전 ${regionBit}${brand} 객실 타입·최소 숙박일·할인 기간을 함께 보면 기준이 분명해집니다.`,
      `${brand} ${label} — 체크인·바비큐·주차 안내는 예약 전에 확인하세요.`,
    ],
    restaurant: [
      `${topicObj} 방문 전 ${regionBit}${brand} 메뉴·예약·웨이팅 시간을 함께 보면 기준이 분명해집니다.`,
      `${brand} ${label} — 점심·코스 구성은 요일·시간대에 따라 달라질 수 있습니다.`,
    ],
    construction: [
      `${topicObj} 상담 전 ${regionBit}${brand} 공사 범위·견적·일정을 함께 정리해 두면 비교가 수월합니다.`,
      `${brand} ${label} — 자재·A/S 범위는 계약 전 문서로 확인하는 편이 좋습니다.`,
    ],
    salon: [
      `${topicObj} 상담 전 ${regionBit}${brand} 두피·모발 상태·원하는 톤을 함께 준비해 가면 수월합니다.`,
      `${brand} ${label} — 시술·관리 안내는 당일 상담을 기준으로 확인하세요.`,
    ],
    cafe: [
      `${topicObj} 고를 때 ${regionBit}${brand} 메뉴판·좌석·테이크아웃 안내를 먼저 보면 기준이 분명해집니다.`,
      `${kw || label} 비교 시 ${brand} 메뉴 구성·가격·테이크아웃 조건을 나눠 적어 두었습니다.`,
    ],
    default: [
      `${topicObj} 고를 때 ${regionBit}${brand} 안내·일정·비용을 먼저 보면 기준이 분명해집니다.`,
      `${kw || label} 비교 시 ${brand} 구성·가격·이용 조건을 나눠 적어 두었습니다.`,
    ],
  };

  const variants = [...shared, ...(byKey[key] || byKey.default)];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(variants[(slot + i) % variants.length]);
  }
  return out;
}

export function buildTopicAwareConsumerPads(input = {}, slot = 0, count = 12) {
  if (isFurnitureIndustry(input)) {
    return buildFurnitureConsumerPads(input, slot, count);
  }
  return buildIndustryConsumerPads(input, slot, count);
}
