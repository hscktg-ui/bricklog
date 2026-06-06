/**
 * 가상 브랜드 예시 — LLM 없이 즉시 발행 가능 샘플 (한 번에 노출)
 */
import { PUBLIC_TEST_SAMPLES } from "@/lib/publicTest/publicTestSamples";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { buildBrandFocusedSectionHeadings } from "@/lib/content/outlinePackGuard";

function norm(s = "") {
  return String(s || "").trim();
}

export function findMatchingPublicTestSample(input = {}) {
  const brandName = norm(input.brandName);
  const region = norm(input.region);
  const topic = norm(input.topic || input.mainKeyword);
  const sampleId = norm(input.sampleId);

  const withTopic = (sample) => {
    if (!sample) return null;
    return { ...sample, topic: topic || sample.topic };
  };

  if (sampleId) {
    const byId = PUBLIC_TEST_SAMPLES.find((s) => s.id === sampleId);
    if (byId && byId.brandName === brandName && byId.region === region) {
      return withTopic(byId);
    }
  }

  const byBrandRegion = PUBLIC_TEST_SAMPLES.find(
    (s) => s.brandName === brandName && s.region === region
  );
  if (byBrandRegion) return withTopic(byBrandRegion);

  return withTopic(
    PUBLIC_TEST_SAMPLES.find(
      (s) =>
        s.brandName === brandName &&
        s.region === region &&
        (s.topic === topic || norm(s.topicLegacy) === topic)
    ) || null
  );
}

function sectionBodies(sample) {
  const { brandName: brand, region, topic } = sample;

  const byId = {
    cafe_brunch: [
      `${brand}는 ${region}에서 ${topic}을 운영하는 카페입니다. 첫 방문 손님도 메뉴 구성을 빠르게 이해할 수 있도록 시즌 메뉴를 보드에 표기합니다.`,
      `브런치 메뉴를 찾는 이유는 계절 재료와 편안한 좌석 때문인 경우가 많습니다. ${brand}는 주말 오전 대기 시간을 줄이기 위해 예약·현장 대기 안내를 분리해 운영합니다.`,
      `추천 대상은 가족 브런치, 소규모 모임, 인근 직장인 점심 모임입니다. ${brand}는 인원 수에 맞춘 테이블 배치를 안내합니다.`,
      `${brand} 운영 방식은 당일 재료 입고 확인 후 메뉴 보드를 갱신하고, 주문은 카운터와 테이블 QR 두 경로로 받습니다.`,
      `${brand} 차별점은 지역 농가 재료 비율을 메뉴 보드에 표기하고, 같은 재료라도 조리법을 주 2회 교체한다는 점입니다.`,
      `${brand} 방문 전 기피 식재료, 단체 예약 인원, 좌석 선호를 메시지로 알려 주시면 준비가 수월합니다. 문의는 영업시간 내 전화가 가장 빠릅니다.`,
    ],
    flower_gift: [
      `${brand}는 ${region}에서 ${topic}을 받는 꽃집입니다. 행사 일정에 맞춰 꽃 상태와 포장 옵션을 미리 안내합니다.`,
      `어버이날·기념일에는 배송 시간대가 빠르게 차는 편이라, ${brand}는 픽업·배송 슬롯을 날짜별로 나눠 예약을 받습니다.`,
      `${brand} 추천 대상은 가족 선물, 직장 동료 감사 꽃, 매장 픽업을 원하는 ${region} 고객입니다.`,
      `${brand} 진행 절차는 예약 확인 후 꽃 종류·색감 상담, 포장 선택, 픽업 또는 배송 안내 순서로 진행됩니다.`,
      `${brand} 차별점은 사진으로 시안을 먼저 보내 드리고, 현장 픽업 시 포장 상태를 함께 확인할 수 있다는 점입니다.`,
      `${brand} 방문·배송 전 수령 시간, 카드 메시지 문구, 예산 범위를 알려 주시면 맞춤 제안이 빨라집니다.`,
    ],
    clinic_visit: [
      `${brand}는 ${region}에서 ${topic}을 돕는 내과입니다. 첫 방문 환자도 접수·검진 흐름을 한 번에 이해할 수 있게 안내합니다.`,
      `건강검진을 처음 받는 분은 준비 서류와 공복 여부를 미리 확인하는 것이 중요합니다. ${brand}는 예약 시 확인 사항을 문자로 보내 드립니다.`,
      `${brand} 추천 대상은 직장인 정기 검진, 가족 단위 기초 검진, 이전 결과 비교가 필요한 분입니다.`,
      `${brand} 운영 방식은 예약 확인 후 접수, 기초 문진, 검진 항목 진행, 결과 상담 예약 안내 순서로 이어집니다.`,
      `${brand} 차별점은 검진 전 문진표를 미리 작성할 수 있고, 결과 상담 일정을 당일 함께 잡을 수 있다는 점입니다.`,
      `${brand} 방문 전 신분증, 이전 검진 기록, 복용 약 목록을 준비해 주세요. 문의는 평일 오전 전화 상담이 가장 빠릅니다.`,
    ],
    pension_weekend: [
      `${brand}는 ${region}에서 ${topic}을 운영하는 펜션입니다. 주말 예약 고객에게 체크인·바베큐 시간을 미리 안내합니다.`,
      `주말 바베큐 패키지는 인원 수에 따라 그릴·좌석 배치가 달라집니다. ${brand}는 예약 확정 후 준비물을 한 번에 정리해 드립니다.`,
      `${brand} 추천 대상은 가족 여행, 소규모 모임, ${region} 인근 차량 이동이 편한 고객입니다.`,
      `${brand} 이용 절차는 예약 확인 후 체크인 안내, 바베큐 시간 확정, 체크아웃 안내 순서로 진행됩니다.`,
      `${brand} 차별점은 바베큐 재료·그릴 사용법을 현장에서 먼저 설명하고, 우천 시 실내 대체 공간을 안내한다는 점입니다.`,
      `${brand} 방문 전 인원 수, 도착 예정 시간, 추가 침구 필요 여부를 알려 주시면 준비가 수월합니다.`,
    ],
    salon_care: [
      `${brand}는 ${region}에서 ${topic}을 제공하는 미용실입니다. 첫 방문 고객도 상담·시술 흐름을 한눈에 이해할 수 있게 안내합니다.`,
      `두피 케어와 염색을 함께 고민하는 분은 사전 상담 시간이 필요합니다. ${brand}는 시술 전 모발 상태를 사진으로 기록해 비교합니다.`,
      `${brand} 추천 대상은 두피 고민이 있는 분, 염색 주기를 관리하고 싶은 분, 직장인 저녁 예약 고객입니다.`,
      `${brand} 진행 방식은 예약 확인 후 두피·모발 상담, 시술 선택, 케어·스타일링 순서로 이어집니다.`,
      `${brand} 차별점은 시술 전후 관리 방법을 카드로 정리해 드리고, 다음 방문 주기를 함께 잡아 드린다는 점입니다.`,
      `${brand} 방문 전 두피 민감 이력, 최근 염색·펌 시기, 원하는 톤 참고 사진을 알려 주시면 상담이 빨라집니다.`,
    ],
    bakery_open: [
      `${brand}는 ${region}에서 ${topic}을 전하는 베이커리입니다. 오픈 일정과 시식·픽업 방법을 매장 앞 안내에 함께 표기합니다.`,
      `수제 빵 오픈 소식을 찾는 분은 당일 생산 품목과 픽업 시간을 먼저 확인하는 것이 좋습니다. ${brand}는 품절 시 대체 메뉴를 안내합니다.`,
      `${brand} 추천 대상은 ${region} 인근 거주자, 아침 픽업 고객, 선물용 세트를 찾는 분입니다.`,
      `${brand} 운영 방식은 당일 생산 목록 공개 후 매장·예약 주문, 픽업 시간 안내 순서로 진행됩니다.`,
      `${brand} 차별점은 생산 시간대별 메뉴를 표기하고, 당일 재고를 공식 채널에 함께 업데이트한다는 점입니다.`,
      `${brand} 방문 전 픽업 시간, 수량, 기피 재료 문의를 남겨 주시면 준비가 수월합니다.`,
    ],
  };

  return (
    byId[sample.id] || [
      `${brand}는 ${region}에서 ${topic}을 안내하는 브랜드입니다.`,
      `${topic}이 필요한 고객을 위해 ${brand}는 이용 절차와 확인 사항을 미리 정리해 드립니다.`,
      `추천 대상, 운영 방식, 차별점을 매장·공식 안내 기준으로 확인할 수 있습니다.`,
      `방문·문의 전 예약 가능 여부와 준비물을 알려 주시면 상담이 빨라집니다.`,
      `${brand} 공식 채널로 문의·예약 가능 시간을 확인해 보세요.`,
    ]
  );
}

const PAD_SUFFIXES = [
  (s) => `${s.brandName} ${s.region} 기준 안내입니다.`,
  (s) => `${s.brandName} 공식 채널에서 최신 정보를 확인할 수 있습니다.`,
  (s) => `방문·예약 전 ${s.brandName} 영업 안내를 함께 확인해 보세요.`,
  (s) => `${s.region} 인근에서 ${s.brandName}을 찾는 분들에게 도움이 됩니다.`,
];

function padProseBody(body, sample, min = 100, slot = 0) {
  let text = String(body || "").trim();
  if (text.length >= min) return text;
  const extra = PAD_SUFFIXES[slot % PAD_SUFFIXES.length](sample);
  return `${text} ${extra}`.trim();
}

/**
 * @param {import("@/lib/publicTest/publicTestSamples").PublicTestSample} sample
 */
export function buildInstantPublicTestPack(sample) {
  const { brandName, region, topic } = sample;
  const bodies = sectionBodies(sample);
  const headings = buildBrandFocusedSectionHeadings(sample, bodies.length);

  let pack = {
    title: `${brandName} ${topic}`,
    representativeTitle: `${brandName} ${topic}`,
    sections: bodies.map((body, i) => ({
      heading: headings[i] || `${brandName} 안내`,
      body: padProseBody(body, sample, 100, i),
    })),
    conclusion: `${region} ${brandName} 관련 문의·예약은 공식 채널로 받습니다. 확인 가능한 정보만 기준으로 방문을 준비해 보세요.`,
    hashtags: [brandName, region.split(" ").pop(), topic.split(" ")[0]]
      .filter(Boolean)
      .slice(0, 4)
      .map((t) => (String(t).startsWith("#") ? t : `#${t}`)),
    _meta: {
      instantSample: true,
      publishReady: true,
      generationMode: "public_test_instant",
    },
  };
  pack._meta.charCount = countBlogBodyCharsWithSpaces(pack);
  return pack;
}
