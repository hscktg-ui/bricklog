/**
 * 분량 보강용 — 주제·브랜드·지역 키워드를 포함한 중립 소비자 안내 문단
 */
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { topicWritingFacet } from "@/lib/content/topicFacetEngine";
import { isFurnitureIndustry } from "@/lib/product/industryContextEngine";

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
    `${label}를 비교할 때 ${brand} 기준으로 가격·구성·설치 범위를 함께 적어 두면 선택이 빨라집니다.`,
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

export function buildTopicAwareConsumerPads(input = {}, slot = 0, count = 12) {
  if (isFurnitureIndustry(input)) {
    return buildFurnitureConsumerPads(input, slot, count);
  }

  const brand = String(input.brandName || "브랜드").trim();
  const region = String(input.region || "").trim();
  const kw = String(input.mainKeyword || "").trim();
  const facet = topicWritingFacet(input) || kw || "이용";
  const label = kw || facet;
  const topicObj = koreanObjectParticle(label);
  const regionBit = region ? `${region} ` : "";

  const variants = [
    `${regionBit}${brand} ${label} — 영업 시간·메뉴·예약은 공식·플레이스 안내로 확인하는 편이 정확합니다.`,
    `${label}를 비교할 때 ${brand} 기준으로 가격·구성·이용 방법을 함께 적어 두면 선택이 빨라집니다.`,
    `${regionBit}${brand} ${kw || label} 한정 메뉴는 요일·시간대별로 구성이 달라질 수 있습니다.`,
    `${brand} ${label} 안내는 지점·요일마다 다를 수 있어 방문·문의 전에 최신 정보를 확인하세요.`,
    `${topicObj} 고를 때 ${regionBit}${brand} 메뉴판·안내 문구를 먼저 보면 기준이 분명해집니다.`,
    `${label} 관련 FAQ는 ${brand}${region ? ` ${region}` : ""} 채널에서 확인한 뒤 메모해 두면 상담이 수월합니다.`,
    `${regionBit}생활권에서 ${brand} ${kw || label} 이용 시 주차·대기·픽업 옵션을 함께 보면 동선이 편합니다.`,
    `${brand} ${label} — 확인되지 않은 할인·재고는 단정하지 말고 매장·공식 문의로 확인하세요.`,
    `시즌·한정 ${kw || label}는 요일·시간대에 따라 달라질 수 있어 당일 안내를 기준으로 보면 됩니다.`,
    `${brand} ${label} 포인트는 알레르기·원재료·보관 안내를 함께 확인하는 편이 좋습니다.`,
    `${regionBit}${brand}에서 ${label} 관련 문의는 전화·플레이스·SNS 중 편한 채널로 하면 빠릅니다.`,
    `${kw || label} 비교 시 ${brand} 메뉴 구성·가격·테이크아웃 조건을 나눠 적어 두었습니다.`,
    `${brand} ${label} — 동일 업종이라도 지점·시기에 따라 구성이 달라질 수 있습니다.`,
    `${regionBit}${brand} ${label} 이용 전 혼잡 시간·좌석·주문 대기를 미리 보면 편합니다.`,
    `${label} 관련 ${brand} 공지·이벤트는 공식 채널 기준으로 다시 확인하는 것이 안전합니다.`,
  ];

  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(variants[(slot + i) % variants.length]);
  }
  return out;
}
