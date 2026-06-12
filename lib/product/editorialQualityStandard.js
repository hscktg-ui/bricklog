/**
 * EDITORIAL QUALITY STANDARD (EQS) — 전 카테고리 송출 품질 SSOT
 * 목표: 시즌 도입 → 구체 명칭·사례 → 선택 기준 → 관리·브랜드 → 여운 마무리
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { resolveBlogLengthTier } from "@/lib/constants";
import {
  deriveTopicWritingContext,
  isInformationalTopicInput,
  isVisitReviewTopicInput,
  topicRaw,
  topicWritingFacet,
} from "@/lib/content/topicFacetEngine";
import {
  getIndustryFlavorForInput,
  isExhibitionTopic,
  resolveBriclogIndustryKey,
} from "@/lib/product/industryContextEngine";
import { buildResearchFactLines, hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import { assessContentGate } from "@/lib/product/contentGateSystem";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { INDUSTRY_CONTENT_DNA } from "@/lib/golden/haeshinContentDnaSeed";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";
import { shouldForceMissionProseOnlyPath } from "@/lib/product/missionProseRouteFlags";
import { assessHaeshinQualityScore } from "@/lib/golden/haeshinQualityScorer";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";
import { isSubstantiveSectionBody } from "@/lib/content/sectionWriterBodies";

export const EDITORIAL_QUALITY_VERSION = "v1";

function detectSeason(input = {}) {
  const blob = `${input.topic || ""} ${input.mainKeyword || ""} ${input.includePhrases || ""}`;
  if (/여름|summer|6월|7월|8월/i.test(blob)) return "summer";
  if (/겨울|winter|12월|1월|2월/i.test(blob)) return "winter";
  if (/봄|spring|3월|4월|5월/i.test(blob)) return "spring";
  if (/가을|fall|9월|10월|11월/i.test(blob)) return "autumn";
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

function seasonLabel(season) {
  if (season === "summer") return "여름철";
  if (season === "spring") return "봄철";
  if (season === "autumn") return "가을";
  if (season === "winter") return "겨울";
  return "이번 시즌";
}

function brandOpsLine(input = {}, p = {}) {
  const brand = p.brand || String(input.brandName || "").trim();
  const blob = `${brand} ${input.brandDescription || ""} ${(input.researchFacts || []).map((f) => f.fact || f).join(" ")}`;
  if (/24\s*시간|무인|셀프/i.test(blob)) {
    return `${brand}는 24시간 운영되는 무인 꽃집으로, 늦은 밤이나 이른 아침에도 부담 없이 꽃을 구매할 수 있습니다. 특별한 기념일이 아니어도 집에 꽃 한 다발을 두는 것만으로 분위기가 달라지는 경험을 할 수 있습니다.`;
  }
  if (/예약|픽업|배송/i.test(blob)) {
    return `${brand}는 예약·픽업·배송 안내를 매장 기준으로 받을 수 있어, 일정에 맞춰 준비하기 수월합니다.`;
  }
  return `${brand}${p.regionBit ? ` ${String(input.region || "").trim()}` : ""}에서 확인한 안내를 바탕으로, 방문·문의 전에 운영 시간과 준비물을 짚어 두면 편합니다.`;
}

const FLOWER_SUMMER = {
  opener:
    "6월이 시작되면 꽃도 조금씩 달라집니다.\n\n봄철의 부드러운 파스텔톤에서 조금 더 선명하고 시원한 색감의 꽃들이 매장에 들어오기 시작합니다. 특히 여름에는 집 안에서도 오래 볼 수 있고 선물하기 좋은 꽃을 찾는 분들이 많습니다.",
  items:
    "여름철에는 리시안셔스, 해바라기, 거베라, 수국과 같이 색감이 선명하고 존재감이 있는 꽃들이 많은 사랑을 받습니다. 특히 수국은 풍성한 볼륨감 덕분에 집들이 선물이나 개업 선물로 찾는 분들이 많고, 해바라기는 밝고 긍정적인 의미를 담고 있어 축하용 꽃다발로 자주 선택됩니다.",
  purpose:
    "꽃을 고를 때는 예쁜 색감도 중요하지만 어디에 놓을지 먼저 생각해 보는 것이 좋습니다. 집 식탁 위에 둘 꽃인지, 생일 선물인지, 감사의 마음을 전할 꽃인지에 따라 어울리는 꽃과 포장 방식이 달라질 수 있기 때문입니다.",
  care: "여름에는 직사광선을 피하고 물을 자주 갈아주는 것만으로도 꽃을 조금 더 오래 감상할 수 있습니다. 에어컨 바람이 직접 닿는 곳 역시 피하는 것이 좋습니다.",
  close: "계절은 바뀌고 꽃도 바뀝니다.\n\n올여름에는 일상 속에 작은 꽃 한 다발을 더해보시는 건 어떨까요?\n\n언제나 꽃과 함께하도록.",
};

const INDUSTRY_BODIES = {
  flower: {
    summer: FLOWER_SUMMER,
    spring: {
      opener:
        "봄이 되면 꽃집 선반도 색이 바뀝니다.\n\n튤립·프리지아·스위트피처럼 가벼운 톤의 꽃이 많아지고, 선물·집들이 수요도 함께 올라갑니다.",
      items:
        "봄철에는 튤립, 프리지아, 스위트피, 라넌큘러스처럼 부드러운 색감의 꽃이 인기입니다. 생일·축하·감사 선물로 무난하면서도 계절감을 살리기 좋습니다.",
      purpose:
        "꽃을 고를 때는 받는 분의 취향과 보관 환경을 먼저 떠올리면 실패가 줄어듭니다. 밝은 톤을 좋아하는지, 향을 중시하는지에 따라 추천 종류가 달라집니다.",
      care: "봄철에는 일교차가 커서 실내 보관 시 물 보충 주기를 조금 더 자주 확인하는 편이 좋습니다.",
      close: "계절마다 꽃도 분위기도 달라집니다.\n\n작은 한 다발이 하루를 바꾸기도 합니다.",
    },
    default: {
      opener: "꽃은 계절과 목적에 따라 고르는 재미가 있습니다.",
      items: "생일·축하·집들이·감사 등 목적별로 추천 꽃 종류와 포장 스타일이 달라집니다.",
      purpose: "색감·향·포장 톤을 먼저 정하면 선택이 빨라집니다.",
      care: "직사광선과 에어컨 바람을 피하고 물을 자주 갈아주면 보관 일수가 늘어납니다.",
      close: "오늘 하루, 꽃 한 다발로 분위기를 바꿔 보세요.",
    },
  },
  tea_cafe: {
    autumn: {
      opener: "가을이 되면 티 메뉴판도 조금씩 달라집니다.\n\n따뜻한 보이차·우롱차·허브티·밀크티가 앞쪽에 올라오고, 스콘·마들렌 같은 다과도 계절감 있게 바뀝니다.",
      items: "밤차·사과차·시그니처 티·티 세트처럼 메뉴 구성은 매장마다 다르고, 찻잔·티포트·다실 좌석 분위기도 함께 달라집니다.",
      purpose: "조용히 책을 읽을 시간이라면 창가 단독석, 대화 위주라면 2~4인 테이블 간격과 소음 정도를 먼저 확인하는 편이 좋습니다.",
      care: "차는 우려내는 시간이 필요합니다. 카페인이 부담된다면 허브티·루이보스를 고르는 것도 방법입니다.",
      close: "차 한 잔의 여유, 그 기준을 메뉴와 공간에서 함께 보면 실패가 줄어듭니다.",
    },
    default: {
      opener: "티카페에 들어서면 커피 냄새보다 찻잎 향이 먼저 느껴질 때가 있습니다.",
      items: "시그니처 티·밀크티·허브티·티 세트 구성은 매장마다 다르고, 다실 좌석·창가석·바 테이블도 함께 달라집니다.",
      purpose: "처음 방문이라면 시그니처 한 잔과 스콘 세트가 무난하고, 계절 메뉴가 궁금하다면 당일 추천 차를 물어보는 편이 좋습니다.",
      care: "주말 오후는 웨이팅이 길어질 수 있어, 여유가 없다면 평일 오전이나 늦은 오후를 고려해 보세요.",
      close: "차는 빠르게 마시기보다 천천히 우려내는 공간입니다.",
    },
  },
  cafe: {
    default: {
      opener: "카페는 메뉴보다 분위기와 동선을 함께 보게 되는 공간입니다.",
      items: "시즌 음료·디저트·브런치 구성은 매장마다 다르고, 테이크아웃·좌석 이용 방식도 달라집니다.",
      purpose: "혼자 작업·대화·브런치 등 목적에 따라 좌석·메뉴·시간대를 고르면 만족도가 올라갑니다.",
      care: "인기 시간대에는 대기가 길 수 있어, 피크 전후 방문이나 예약 여부를 확인하는 편이 좋습니다.",
      close: "잠깐의 휴식도 공간 선택에 따라 달라집니다.",
    },
  },
  salon: {
    default: {
      opener: "헤어·네일·피부 관리는 사진만으로는 분위기와 손맛을 알기 어렵습니다.",
      items: "컷·펌·염색·클리닉·케어 구성은 살롱마다 다르고, 담당 디자이너·시술 시간도 달라집니다.",
      purpose: "변화 폭·관리 난이도·일정에 맞춰 스타일을 고르면 만족도가 올라갑니다.",
      care: "시술 전 모발·두피 상태, 알레르기 이력을 미리 알려 두면 상담이 수월합니다.",
      close: "작은 변화도 기분을 바꿉니다.",
    },
  },
  hospital: {
    default: {
      opener: "증상이나 검진 목적에 따라 병원 선택 기준이 달라집니다.",
      items: "진료과·검사·접수·예약 방식은 의료기관마다 다르고, 준비물 안내도 다릅니다.",
      purpose: "증상·목적·시간대를 먼저 정하면 대기·상담 흐름을 짚기 쉽습니다.",
      care: "확인 가능한 범위에서만 안내하며, 세부 진단·치료는 반드시 의료진 상담으로 확인하세요.",
      close: "몸 상태에 맞는 선택이 편안한 방문으로 이어집니다.",
    },
  },
  restaurant: {
    default: {
      opener: "식당은 메뉴보다 분위기·동선·예약 방식까지 함께 보게 됩니다.",
      items: "대표 메뉴·코스·좌석·주차·영업 시간은 매장마다 다릅니다.",
      purpose: "모임 규모·목적·시간대에 맞춰 메뉴와 좌석을 고르면 만족도가 올라갑니다.",
      care: "인기 시간대에는 예약·웨이팅이 길 수 있어, 피크 전후 방문을 검토해 보세요.",
      close: "한 끼의 분위기도 공간 선택에서 시작됩니다.",
    },
  },
  marketing: {
    default: {
      opener: "마케팅·홍보는 채널마다 기대하는 결과와 준비물이 다릅니다.",
      items: "캠페인·콘텐츠·매체·리포트 방식은 팀·대행사마다 다릅니다.",
      purpose: "목표(인지·전환·재방문)를 먼저 정하면 비교가 수월해집니다.",
      care: "일정·예산·브랜드 가이드를 미리 정리해 두면 첫 미팅이 빨라집니다.",
      close: "작은 정리가 큰 실행으로 이어집니다.",
    },
  },
  pet: {
    default: {
      opener: "반려동물 관련 선택은 종류·크기·성향에 따라 달라집니다.",
      items: "용품·식품·미용·케어 구성은 매장·브랜드마다 다릅니다.",
      purpose: "나이·체형·알레르기·활동량을 먼저 짚으면 선택이 수월해집니다.",
      care: "급여·사용 전 성분·사이즈 표기를 확인하는 편이 좋습니다.",
      close: "작은 배려가 일상의 편안함으로 이어집니다.",
    },
  },
  pet_cafe: {
    default: {
      opener: "펫카페는 반려견 동반 규정과 공간 분위기를 함께 봐야 합니다. 대형견 동반 여부는 입장·이용 안내를 먼저 확인하는 편입니다.",
      items: "입장 규칙·메뉴·놀이 공간·체중 제한은 매장마다 다릅니다.",
      purpose: "견종·성격·동반 인원에 맞춰 시간대를 고르면 스트레스가 줄어듭니다.",
      care: "리드줄·배변 봉투·예방접종 등 이용 안내를 방문 전 확인하세요.",
      close: "함께 쉬는 시간도 규칙을 알면 더 편합니다.",
    },
  },
  furniture: {
    default: {
      opener: "가구는 사진보다 현장에서 보는 체감 차이가 큽니다.",
      items: "프레임·매트리스·수납·조명 연출은 쇼룸마다 구성이 다르고, 체험 가능한 모델도 달라집니다.",
      purpose: "침실 동선·문 개폭·높이를 먼저 재면 후회가 줄어듭니다.",
      care: "배송·설치·A/S 범위는 브랜드·매장마다 다르니 견적서에 항목별로 받아 두세요.",
      close: "하루의 시작과 끝이 닿는 공간, 직접 보고 고르는 편이 낫습니다.",
    },
  },
  default: {
    default: {
      opener: "처음 찾을 때는 정보가 많아도 기준이 없으면 더 막히기 쉽습니다.",
      items: "운영 방식·예약·상담·시즌 안내는 매장·브랜드마다 다릅니다.",
      purpose: "목적과 일정을 먼저 정하면 비교가 수월해집니다.",
      care: "확인 가능한 범위에서만 안내하며, 세부 조건은 매장 문의로 맞추는 편이 좋습니다.",
      close: "작은 선택이 하루를 바꾸기도 합니다.",
    },
  },
};

function buildBodyFromIndustryDna(input = {}) {
  const goldenKey = resolveGoldenIndustryKey(input);
  const briclogKey = resolveBriclogIndustryKey(input);
  const dna = INDUSTRY_CONTENT_DNA[goldenKey] || INDUSTRY_CONTENT_DNA[briclogKey];
  if (!dna) return null;

  const season = seasonLabel(detectSeason(input));
  const intents = (dna.searchIntents || []).slice(0, 3).join("·");
  const must = (dna.mustInclude || []).slice(0, 4).join("·");
  const preferred = dna.preferredLines?.[0] || "";

  return {
    opener: preferred
      ? `${preferred}.`
      : `${season} ${dna.label || "업종"} 관련 정보를 찾을 때 자주 보는 항목이 있습니다.`,
    items: intents
      ? `${intents} 관련 안내는 매장마다 다르고, ${must}를 함께 보면 선택 기준이 분명해집니다.`
      : `${must}를 중심으로 매장마다 운영 방식이 다릅니다.`,
    purpose: dna.direction || "목적과 일정을 먼저 정하면 방문이 수월합니다.",
    care: "운영 시간·예약·주차·인기 시간대는 방문 전 확인하는 편이 좋습니다.",
    close: "작은 정리가 방문의 만족도를 높입니다.",
  };
}

function pickIndustryBody(input = {}) {
  const key = resolveBriclogIndustryKey(input);
  const goldenKey = resolveGoldenIndustryKey(input);
  const season = detectSeason(input);
  const topicBlob = `${topicRaw(input)} ${input.mainKeyword || ""} ${input.topic || ""}`;
  const brand = String(input.brandName || "").trim();
  const bp = brand ? `${brand} ` : "";

  if (
    (key === "cafe" || key === "tea_cafe" || goldenKey === "cafe") &&
    /신메뉴|출시|시즌\s*메뉴/.test(topicBlob)
  ) {
    return {
      opener: `${seasonLabel(season)} 카페는 시즌 음료·디저트로 분위기를 바꾸는 경우가 많습니다. 브런치를 찾는 분들은 신메뉴가 나온 주말 오전에 방문하는 편입니다.`,
      items: `${bp}신메뉴는 원두·시럽·토핑 조합과 가격대를 함께 보면 선택이 수월합니다. 아이스 음료는 여름철에 주문이 많아, 시원한 톤의 디저트와 맞추면 만족도가 높은 편입니다.`,
      purpose: "혼자 휴식·대화·브런치 등 방문 목적에 따라 추천 메뉴와 시간대가 달라집니다. 테라스 좌석을 원하면 햇빛이 강한 시간대를 피하는 편이 편합니다.",
      care: "인기 시간대에는 대기가 길 수 있어, 피크 전후 방문이나 예약·픽업 가능 여부를 확인하는 편이 좋습니다.",
      close: "잠깐의 휴식도 메뉴와 공간 선택에 따라 달라집니다.",
    };
  }

  if (/브랜드\s*블로그|콘텐츠\s*운영|블로그\s*운영/.test(topicBlob)) {
    return {
      opener: "브랜드 블로그는 광고 문구가 아니라 검색 의도에 맞는 정보를 꾸준히 쌓는 채널입니다. 처음 운영을 맡는 분들은 주제가 넓어서 어디서부터 쓸지 막히는 경우가 많습니다.",
      items: `${bp}운영에서는 주제 기획·업종 톤·지역 키워드·고객 질문을 한 묶음으로 정리하는 편이 효율적입니다. 실제로 월 4~8편만 꾸준히 올려도 문의 전환에 도움이 되는 편입니다.`,
      purpose: "신규 방문·재방문·전환 중 무엇을 우선할지 정하면 글 구조와 CTA가 분명해집니다. 지역 키워드와 업종 특징을 함께 넣으면 검색 의도에 맞는 글이 됩니다.",
      care: "월별 주제 캘린더와 성과 지표(조회·문의)를 짧게라도 기록해 두면 다음 기획이 빨라집니다.",
      close: "작은 기획이 브랜드 신뢰로 이어집니다.",
    };
  }

  if (key === "salon" && /염색|두피|펌|컷|네일|헤어/.test(topicBlob)) {
    return {
      opener: "염색·펌을 앞두면 원하는 색보다 두피·모발 상태를 먼저 보게 됩니다. 처음 방문하는 분들은 상담과 시술 시간이 길어질 수 있다는 점을 미리 알아 두면 일정 잡기가 수월합니다.",
      items: `${bp}에서는 두피 진단 후 저자극 염색·케어 라인을 추천하는 경우가 많습니다. 겨울철에는 건조해진 두피에 맞춰 암모니아 함량이 낮은 제품을 문의하는 분이 늘어나는 편입니다.`,
      purpose: "직장인 저녁 예약·주말 방문 등 일정에 따라 대기 시간이 달라집니다. 원하는 톤 사진과 최근 시술 이력을 미리 정리해 두면 상담이 빨라집니다.",
      care: "시술 전 알레르기·두피 손상 이력을 알려 주시고, 염색 후 홈케어 제품 사용법을 함께 확인하는 편이 좋습니다.",
      close: "작은 상담 준비가 시술 만족도를 높입니다.",
    };
  }

  if (key === "hospital" && /한방|면역|진료|검진|처방|통증|피부|치료/.test(topicBlob)) {
    return {
      opener: "계절이 바뀔 때 몸 컨디션 관리를 검색하는 분들이 많습니다. 처음 한의·진료 기관을 찾을 때는 증상·목적·예약 방식을 함께 비교하는 편이 편합니다.",
      items: `${bp}에서는 체질·생활 습관 상담 후 맞춤 관리 방향을 안내하는 경우가 많습니다. 겨울철에는 면역·순환 관련 문의가 늘어나, 평소 컨디션과 복용 약 여부를 함께 말씀해 주시면 상담이 수월합니다.`,
      purpose: "통증 완화·면역 관리·피로 회복 등 목적에 따라 상담 항목이 달라집니다. 증상 기간과 악화 요인을 정리해 두면 첫 방문이 빨라집니다.",
      care: "확인 가능한 범위에서만 안내하며, 세부 진단·치료는 반드시 의료진 상담으로 확인하세요.",
      close: "몸 상태에 맞는 선택이 편안한 방문으로 이어집니다.",
    };
  }

  if ((key === "pet" || key === "snack") && /간식|급여|영양|반려|강아지|고양이/.test(topicBlob)) {
    return {
      opener: "반려동물 간식은 맛보다 원재료·급여량·알레르기 반응을 먼저 보게 됩니다. 처음 수제 간식을 고르는 보호자는 견종·나이·활동량을 함께 고려하는 편입니다.",
      items: `${bp}수제 간식은 국내산 원료·무첨가 여부와 포장 단위를 비교하면 선택이 수월합니다. 실제로 소량 패키지로 시작해 반응을 본 뒤 정기 구매로 넘어가는 분이 많습니다.`,
      purpose: "훈련 보상·생일·환영 선물 등 목적에 따라 크기·질감·향이 달라집니다. 알레르기 이력이 있으면 성분표를 먼저 확인하는 편이 좋습니다.",
      care: "급여량은 체중·나이 기준 권장량을 참고하고, 개봉 후 보관 방법을 지키면 신선도 유지에 도움이 됩니다.",
      close: "작은 성분 확인이 반려견 건강으로 이어집니다.",
    };
  }

  if (key === "restaurant" && /메뉴|모임|추천|코스|해물|고기|브런치/.test(topicBlob)) {
    return {
      opener: "가족·지인 모임 장소를 고를 때는 대표 메뉴보다 좌석·예약·주차를 함께 보게 됩니다. 처음 방문하는 분들은 인원·시간대·예산을 미리 정리해 두면 추천이 수월합니다.",
      items: `${bp}대표 메뉴는 식재료 구성·양·매운맛 정도를 함께 보면 선택이 빨라집니다. 주말 점심·저녁 피크 시간대에는 예약 여부를 먼저 확인하는 편이 좋습니다.`,
      purpose: "아이 동반·회식·기념일 등 목적에 따라 추천 코스와 좌석 타입이 달라집니다. 알레르기·채식 여부를 미리 알려 주시면 메뉴 상담이 수월합니다.",
      care: "주차·대기·포장 가능 여부는 방문 전에 확인해 두면 동선이 편합니다.",
      close: "한 끼의 만족도는 준비에서 시작됩니다.",
    };
  }

  if (key === "pension" && /펜션|숙박|바베큐|여행|가족/.test(topicBlob)) {
    return {
      opener: "가족 여행 숙소를 고를 때는 사진보다 방 구성·바베큐·체크인 시간을 함께 보게 됩니다. 처음 예약하는 분들은 인원·차량·취사 여부를 먼저 정리하는 편입니다.",
      items: `${bp}패키지는 객실 타입·바베큐 시간·추가 인원 요금을 비교하면 선택이 수월합니다. 성수기 주말에는 조기 예약 문의가 많아, 일정이 확정되면 먼저 확인하는 편이 좋습니다.`,
      purpose: "아이 동반·커플·단체 모임 등 인원 구성에 따라 추천 객실과 바베큐 세트가 달라집니다.",
      care: "체크인·체크아웃·취사 도구·주차 위치는 예약 전에 확인해 두면 현장 혼선이 줄어듭니다.",
      close: "작은 일정 정리가 여행 만족도를 높입니다.",
    };
  }

  if (key === "education" && /학원|수업|회화|입시|과외|클래스/.test(topicBlob)) {
    return {
      opener: "성인·학생 수업을 고를 때는 커리큘럼보다 시간대·소규모 여부·체험 수업을 먼저 보게 됩니다. 처음 상담하는 분들은 목표·현재 실력·가능한 요일을 정리해 두면 추천이 빨라집니다.",
      items: `${bp}는 레벨 테스트 후 반 편성·수업 횟수를 안내하는 경우가 많습니다. 직장인 반은 저녁 시간대 수요가 높아, 대기가 생길 수 있습니다.`,
      purpose: "회화·시험·취업 등 목표에 따라 수업 강도와 기간이 달라집니다. 체험 수업으로 분위기를 먼저 보는 편이 후회가 적습니다.",
      care: "환불·결석·보강 규정은 등록 전에 확인해 두면 일정 조율이 수월합니다.",
      close: "목표가 분명할수록 수업 선택이 쉬워집니다.",
    };
  }

  if (key === "craft" && /공방|원데이|클래스|체험|도자기|핸드메이드/.test(topicBlob)) {
    return {
      opener: "원데이 클래스를 예약할 때는 완성품 사진보다 소요 시간·난이도·인원 제한을 먼저 보게 됩니다. 처음 방문하는 분들은 옷·액세서리 착용 가능 여부를 확인하는 편입니다.",
      items: `${bp}체험은 재료 준비·건조·포장까지 포함되는지 비교하면 선택이 수월합니다. 주말 오후 슬롯은 예약이 빨리 차는 편입니다.`,
      purpose: "커플·가족·친구 모임 등 동행 구성에 따라 추천 코스가 달라집니다.",
      care: "예약금·취소 규정·주차 위치는 방문 전에 확인해 두면 편합니다.",
      close: "작은 준비가 체험 만족도를 높입니다.",
    };
  }

  if (key === "construction" && /인테리어|리모델|시공|견적|원룸/.test(topicBlob)) {
    return {
      opener: "인테리어 견적을 받을 때는 스타일 사진보다 공사 범위·기간·A/S를 먼저 보게 됩니다. 처음 상담하는 분들은 평수·예산·입주 일정을 정리해 두면 비교가 수월합니다.",
      items: `${bp}상담에서는 도면·자재 등급·공사 항목별 견적을 나눠 안내하는 경우가 많습니다. 원룸·오피스텔은 구조 변경 가능 여부를 먼저 확인하는 편이 좋습니다.`,
      purpose: "전체 시공·부분 리모델·가구 배치만 등 범위에 따라 일정과 비용이 달라집니다.",
      care: "계약서에 포함·제외 항목과 하자 보수 기간을 문서로 받아 두면 분쟁 예방에 도움이 됩니다.",
      close: "범위가 분명할수록 견적 비교가 쉬워집니다.",
    };
  }

  if (key === "tea_cafe" && /차|티|티코스|다실|보이차/.test(topicBlob)) {
    return {
      opener: "차 전문 공간을 찾을 때는 메뉴명보다 티코스 구성·좌석·조용함 정도를 함께 보게 됩니다. 처음 방문하는 분들은 카페인 민감도와 선호 향을 미리 정리하는 편입니다.",
      items: `${bp}시즌 차는 발효도·향·온도별 우림 횟수를 설명해 주는 경우가 많습니다. 여름에는 아이스 티·과일 블렌딩 문의가 늘어나는 편입니다.`,
      purpose: "혼자 휴식·대화·선물용 티백 구매 등 목적에 따라 추천 메뉴가 달라집니다.",
      care: "예약 좌석·대기·주차는 방문 전에 확인해 두면 편합니다.",
      close: "차 한 잔의 여유도 공간 선택에서 시작됩니다.",
    };
  }

  if (key === "furniture" && /매트리스|침대|수면|프로애드|템퍼/.test(topicBlob) && !/다이닝체어|체어|STRESSLESS\s*MINT/i.test(topicBlob)) {
    return {
      opener: "매트리스를 고를 때는 브랜드보다 수면 자세·체압 분산·둘 중 누가 쓰는지를 먼저 보게 됩니다. 처음 쇼룸을 방문하는 분들은 체험 시간과 비교할 모델 수를 정해 두면 상담이 수월합니다.",
      items: `${bp}쇼룸에서는 누웠을 때 허리·어깨 지지감과 전환감(소프트·미디엄·단단함)을 나란히 비교하는 경우가 많습니다. 부부가 함께 쓴다면 폭과 높이·배송·설치 일정도 함께 확인하는 편이 좋습니다.`,
      purpose: "허리 통증·옆으로 자는 습관·더위 많은 체질 등에 따라 추천 라인이 달라집니다.",
      care: "체험 시 실제 사용하는 베개 높이와 패드 조합을 맞춰 보는 편이 후회가 적습니다.",
      close: "수면은 하루의 시작과 끝을 좌우합니다.",
    };
  }

  if (/세차|코팅|디테일링|카워시/.test(topicBlob)) {
    return {
      opener: "겨울철 세차는 물만이 아니라 결빙·소금·코팅 유지 기간을 함께 보게 됩니다. 처음 셀프세차를 찾는 분들은 실내 건조·진공 가능 여부를 확인하는 편입니다.",
      items: `${bp}코팅 패키지는 단계 수·유지 기간·세정 주기를 비교하면 선택이 수월합니다. 주말 오전에는 대기가 길어질 수 있어, 평일 방문을 고려하는 분도 많습니다.`,
      purpose: "출퇴근용·주말 나들이용 등 사용 빈도에 따라 추천 코스가 달라집니다.",
      care: "코팅 직후 세정제 종류와 세차 주기 안내를 받아 두면 유지에 도움이 됩니다.",
      close: "작은 관리 습관이 차량 상태를 오래 유지합니다.",
    };
  }

  if (key === "pet_cafe" && /애견|반려견|펫\s*카페|도그/.test(topicBlob)) {
    return {
      opener: "애견 동반 카페를 고를 때는 메뉴보다 입장 규정·견종 제한·놀이 공간을 먼저 보게 됩니다. 대형견 동반 여부는 입장·이용 안내를 먼저 확인하는 편입니다.",
      items: `${bp}는 소형·대형견 구역·체중 제한·시간대별 혼잡도를 이용 안내로 확인하는 경우가 많습니다. 주말 오후에는 대기가 길어질 수 있습니다.`,
      purpose: "첫 사회화·가족 나들이·친구 견과 만남 등 목적에 따라 추천 시간대가 달라집니다.",
      care: "리드줄·배변 봉투·예방접종 증명 등 이용 안내는 입장 전에 숙지하는 편이 좋습니다.",
      close: "규칙을 알면 반려견과 함께하는 시간이 편해집니다.",
    };
  }

  const bucket =
    INDUSTRY_BODIES[goldenKey] || INDUSTRY_BODIES[key] || INDUSTRY_BODIES.default;
  const hardcoded = bucket[season] || bucket.default;
  if (hardcoded && bucket !== INDUSTRY_BODIES.default) return hardcoded;
  return buildBodyFromIndustryDna(input) || hardcoded || INDUSTRY_BODIES.default.default;
}

function buildEditorialTitle(input = {}, p = {}) {
  const region = String(input.region || "").trim();
  const brand = p.brand || String(input.brandName || "").trim();
  const topic = topicRaw(input) || topicWritingFacet(input);
  const season = seasonLabel(detectSeason(input));
  const key = resolveBriclogIndustryKey(input);

  if (key === "flower" && /꽃|플라워|bouquet/i.test(`${topic} ${input.industry || ""}`)) {
    return `${region ? `${region}에서 ` : ""}${season} 꽃을 찾는다면? ${brand} ${season.includes("여름") ? "여름" : season.replace(/철$/, "")} 추천 꽃 이야기`;
  }
  if (region && brand && topic) {
    return `${region}에서 ${topic} — ${brand} 이야기`;
  }
  return `${brand} ${topic}`.trim();
}

function weaveResearchIntoParagraphs(paragraphs, input) {
  if (!hasUsableResearchFacts(input)) return paragraphs;
  const lines = buildResearchFactLines(input, 4);
  if (!lines.length) return paragraphs;
  const out = [...paragraphs];
  const insertAt = Math.min(2, out.length);
  out.splice(insertAt, 0, lines.slice(0, 2).join("\n\n"));
  return out;
}

function regionAnchor(input = {}) {
  const region = String(input.region || "").trim();
  if (!region) return "";
  const blob = `${(input.researchFacts || []).map((f) => f.fact || f).join(" ")} ${input.brandDescription || ""}`;
  if (/운정/.test(blob) && !region.includes("운정")) return `${region} 운정`;
  return region;
}

function buildLocalContextLine(input = {}, p = {}) {
  const region = regionAnchor(input);
  const brand = p.brand || String(input.brandName || "").trim();
  if (!region || !brand) return "";
  const key = resolveBriclogIndustryKey(input);
  const topic = topicRaw(input) || topicWritingFacet(input);
  const season = seasonLabel(detectSeason(input));

  if (key === "flower") {
    const tail =
      detectSeason(input) === "summer"
        ? "최근 여름 시즌에 어울리는 꽃들을 중심으로 꽃다발을 준비하고 있습니다."
        : `${season}에 맞는 꽃 구성을 준비하고 있습니다.`;
    return `${region}에 위치한 ${brand}에서도 ${tail}`;
  }
  if (key === "furniture" && isExhibitionTopic(input)) {
    return `${region} ${brand}에서 ${topic || "전시"} 관련 안내를 확인할 수 있습니다.`;
  }
  if (topic) {
    return `${region}에 위치한 ${brand}에서 ${topic} 관련 ${season} 안내를 준비하고 있습니다.`;
  }
  return `${region}에 위치한 ${brand}에서 ${season} 안내를 준비하고 있습니다.`;
}

function pickIndustryExtendedParagraphs(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const key = resolveBriclogIndustryKey(input);
  const common = [
    region && brand
      ? `${region}에서 ${brand}를 처음 찾는 분들은 영업 시간·주차·예약 방법을 함께 확인하는 편입니다.`
      : "",
    "비교할 때는 가격만이 아니라 구성·소요 시간·준비물을 함께 적어 두면 상담이 빨라집니다.",
    "검색으로 막막했던 질문이 구체적인 선택 기준으로 바뀌면, 방문·문의 부담이 훨씬 줄어듭니다.",
  ].filter(Boolean);

  const byKey = {
    salon: [
      "염색 전에는 최근 펌·탈색 이력과 두피 민감도를 말씀해 주시면 컬러 추천이 수월합니다.",
      "원하는 톤 사진을 2~3장 준비해 두면 시술 결과 만족도가 높아지는 편입니다.",
    ],
    hospital: [
      "증상이 언제부터인지, 악화 요인이 있는지 짧게 정리해 두면 첫 상담이 수월합니다.",
    ],
    pet: [
      "새 간식은 소량으로 시작해 소화·피부 반응을 2~3일 관찰하는 편이 안전합니다.",
    ],
    restaurant: [
      "인원·시간·예산을 메시지로 미리 남기면 추천 메뉴 상담이 빨라집니다.",
    ],
    pension: [
      "바베큐 시간대와 추가 침구 요청 가능 여부는 예약 시 함께 확인하세요.",
    ],
    education: [
      "목표 시험·출국 일정이 있으면 상담 때 알려 주시면 커리큘럼 추천이 분명해집니다.",
    ],
    craft: [
      "완성품 수령 방법(당일/건조 후 택배)을 예약 전에 확인하는 편이 좋습니다.",
    ],
    construction: [
      "희망 스타일 사진과 반드시 필요한 공사 항목을 나눠 적어 두면 견적 비교가 쉬워집니다.",
    ],
    tea_cafe: [
      "카페인에 민감하면 디카페인·허브 라인을 먼저 문의하는 편이 좋습니다.",
    ],
    pet_cafe: [
      "첫 방문이라면 비혼잡 시간대를 선택하면 반려견이 더 편안한 경우가 많습니다.",
    ],
  };

  return [...(byKey[key] || []), ...common].filter(Boolean);
}

const EDITORIAL_SECTION_HEADINGS = {
  flower: [
    "여름에는 어떤 꽃을 많이 고를까?",
    "꽃을 처음 산다면 거베라도 괜찮습니다",
    "기념일이라면 라넌큘러스",
    "여름철 꽃은 보관도 중요합니다",
    "마무리",
  ],
  cafe: [
    "이 카페는 어떤 분위기일까?",
    "시즌 메뉴와 추천 조합",
    "방문 시간대와 좌석",
    "이용 팁",
    "마무리",
  ],
  tea_cafe: [
    "티 메뉴는 어떻게 고를까?",
    "시그니처 티와 다과",
    "좌석과 분위기",
    "마무리",
  ],
  restaurant: [
    "대표 메뉴는 무엇일까?",
    "예약과 방문 시간",
    "함께 보면 좋은 포인트",
    "마무리",
  ],
  salon: [
    "시술 전에 알아두면 좋은 점",
    "스타일과 관리 팁",
    "예약·상담 안내",
    "마무리",
  ],
  education: [
    "수업 구성은 어떻게 될까?",
    "상담 전에 확인할 점",
    "등록·일정 안내",
    "마무리",
  ],
  default: [
    "먼저 알아두면 좋은 점",
    "선택할 때 보는 기준",
    "방문·이용 팁",
    "마무리",
  ],
};

function mergeParagraphsIntoEditorialSections(paragraphs = []) {
  const blocks = paragraphs.filter(Boolean);
  const merged = [];
  let buf = [];

  const flush = () => {
    const body = buf.join("\n\n").trim();
    buf = [];
    if (body.replace(/\s/g, "").length >= 80) merged.push(body);
  };

  for (const p of blocks) {
    buf.push(p);
    const body = buf.join("\n\n");
    if (isSubstantiveSectionBody(body, 3, 100)) {
      flush();
    } else if (buf.length >= 3 || body.replace(/\s/g, "").length >= 180) {
      flush();
    }
  }
  if (buf.length) flush();

  if (!merged.length && blocks.length) {
    merged.push(blocks.join("\n\n"));
  }
  return merged.filter((body) => body.replace(/\s/g, "").length >= 60);
}

function buildEditorialSectionHeadings(input = {}, count = 3) {
  const key = resolveBriclogIndustryKey(input);
  const pool = EDITORIAL_SECTION_HEADINGS[key] || EDITORIAL_SECTION_HEADINGS.default;
  const brand = String(input.brandName || "").trim();
  const facet = topicWritingFacet(input) || String(input.topic || "").trim() || "이용";
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    if (pool[i]) return pool[i];
    if (i === count - 1) return "마무리";
    return brand ? `${brand} ${facet}` : `안내 ${i + 1}`;
  });
}

function expandEditorialPackForTier(pack, input = {}) {
  const tierKey = input.blogLengthTier || "short";
  if (tierKey === "short") return pack;
  const tier = resolveBlogLengthTier(tierKey);
  let chars = countBlogBodyCharsWithSpaces(pack);
  if (chars >= tier.min * 0.32) return pack;

  const extra = pickIndustryExtendedParagraphs(input);
  if (!extra.length) return pack;

  const sections = [...(pack.sections || [])];
  const tail = sections[sections.length - 1];
  if (tail) {
    sections[sections.length - 1] = {
      ...tail,
      body: `${tail.body}\n\n${extra.slice(0, 2).join("\n\n")}`.trim(),
    };
  }
  const headingPool = buildEditorialSectionHeadings(input, Math.max(sections.length + 2, 5));
  if (extra.length > 2) {
    sections.push({
      heading: headingPool[sections.length] || "추가 안내",
      body: extra.slice(2).join("\n\n"),
    });
  }
  if (sections.length < 4 && extra.length >= 3) {
    sections.push({
      heading: headingPool[sections.length] || "문의·안내",
      body: `${String(input.brandName || "").trim()}에서 궁금한 점은 방문·전화로 확인하시면 일정에 맞춰 안내드릴 수 있습니다.`,
    });
  }

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      editorialTierExpanded: true,
      editorialExpandedChars: countBlogBodyCharsWithSpaces({ ...pack, sections }),
    },
  };
}

/**
 * EQS 기준 신규 팩 — 패드 스택 대신 칼럼형 본문
 */
export function buildEditorialQualityPack(input = {}) {
  const p = deriveTopicWritingContext(input);
  const bodyTpl = pickIndustryBody(input);

  let paragraphs = [
    bodyTpl.opener,
    buildLocalContextLine(input, p),
    bodyTpl.items,
    bodyTpl.purpose,
    bodyTpl.care,
    brandOpsLine(input, p),
  ].filter(Boolean);

  if (!hasUsableResearchFacts(input) || resolveBriclogIndustryKey(input) !== "flower") {
    paragraphs = weaveResearchIntoParagraphs(paragraphs, input);
  }

  const title = buildEditorialTitle(input, p);
  const close = `${bodyTpl.close}\n\n${p.brand}`;

  const mergedBodies = mergeParagraphsIntoEditorialSections(paragraphs);
  const headings = buildEditorialSectionHeadings(input, mergedBodies.length);
  const sections = mergedBodies.map((body, i) => ({
    heading: headings[i] || `안내 ${i + 1}`,
    body,
  }));

  const pack = {
    title,
    representativeTitle: title,
    sections,
    conclusion: close,
    hashtags: [],
    _meta: {
      editorialQualityStandard: true,
      editorialQualityVersion: EDITORIAL_QUALITY_VERSION,
      missionProseFallback: false,
      isBriefOnly: false,
    },
  };

  let expanded = expandEditorialPackForTier(pack, input);
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const chars = countBlogBodyCharsWithSpaces(expanded);
  return {
    ...expanded,
    _meta: {
      ...expanded._meta,
      editorialQualityChars: chars,
      lengthTierMet: chars >= tier.min * 0.7,
    },
  };
}

function salvageGoodSentences(pack, freshBody = "") {
  const good = [];
  for (const sec of pack?.sections || []) {
    for (const s of splitKoreanSentences(sec.body || "")) {
      const t = s.trim();
      if (t.length < 20) continue;
      if (/이용|관련해서\s*를|를\s*보면\s*에서|중립적으로\s*정리|계절·목적별로\s*달라지/.test(t)) {
        continue;
      }
      if (/리시안|해바라기|거베라|수국|튤립|메뉴|매트리스|쇼룸/.test(t)) {
        if (!freshBody.includes(t.slice(0, Math.min(24, t.length)))) good.push(t);
      }
    }
  }
  return [...new Set(good)].slice(0, 2);
}

/**
 * 기존 팩이 EQS 미달이면 칼럼형으로 재구성
 */
export function applyEditorialQualityStandard(pack, input = {}) {
  if (isGpt55WriterDominant()) return pack;
  const gate = assessContentGate(pack, input);
  if (gate.ok && pack?._meta?.editorialQualityStandard) return pack;

  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const inboundChars = countBlogBodyCharsWithSpaces(pack);
  const llmKept =
    pack?._meta?.llmGenerated === true &&
    getBlogFullText(pack).replace(/\s/g, "").length >= 450;
  if (llmKept) {
    const haeshin = assessHaeshinQualityScore(pack, input);
    if (haeshin.score >= 78 && !haeshin.checks?.failure?.criticalFail) {
      return pack;
    }
  }

  const fresh = buildEditorialQualityPack(input);
  const freshBody = getBlogFullText(fresh);
  const salvaged = salvageGoodSentences(pack, freshBody);
  if (salvaged.length >= 1 && fresh.sections?.[1]) {
    fresh.sections[1] = {
      ...fresh.sections[1],
      body: `${fresh.sections[1].body}\n\n${salvaged.join("\n\n")}`.trim(),
    };
  }

  return {
    ...fresh,
    _meta: {
      ...(pack?._meta || {}),
      ...(fresh._meta || {}),
      editorialQualityReshape: true,
      editorialQualityFromGate: gate.reasons?.slice(0, 6),
      priorGateScore: gate.score,
    },
  };
}

export function buildEditorialQualityPromptBlock(input = {}) {
  const { flavor } = getIndustryFlavorForInput(input);
  const season = seasonLabel(detectSeason(input));
  return [
    "【EDITORIAL QUALITY STANDARD — 필수】",
    "글 구조: ①시즌·상황 도입 ②지역·브랜드 맥락 ③구체 명칭·품목·사례(최소 3개) ④목적별 선택 기준 ⑤관리·실용 팁 ⑥브랜드 운영 특성 ⑦짧은 여운 마무리+브랜드명",
    "금지: 「이용」placeholder, FAQ/체크리스트 톤, 같은 문장 3회 반복, 주제 문자열 그대로 반복, 업종 무관 단어(꽃집 글에 전시·매트리스 등)",
    `업종: ${flavor?.label || input.industry || "일반"} · 시즌: ${season}`,
    "문체: 잡지 칼럼·에디터 해설. ~합니다/~해요 혼용보다 한 톤으로. 문단은 2~4문장, 공백으로 호흡.",
    "예시(꽃집): 리시안셔스·해바라기·수국 등 실명 + 선물 목적 + 보관 팁 + 24시간 무인 등 브랜드 fact",
  ].join("\n");
}

export function shouldUseEditorialQualityPath(input = {}) {
  if (isGpt55WriterDominant() && !isBriclogMaxQualityEnabled()) return false;
  if (shouldForceMissionProseOnlyPath(input)) return false;
  if (isVisitReviewTopicInput(input)) return false;
  if (isExhibitionTopic(input)) return false;

  const key = resolveBriclogIndustryKey(input);
  const topicBlob = `${topicRaw(input)} ${input.mainKeyword || ""} ${input.topic || ""}`;

  if (
    key === "furniture" &&
    hasUsableResearchFacts(input) &&
    /전시|루체|매트리스|침대|쇼룸|가구|오피모|프로모/.test(topicBlob)
  ) {
    return false;
  }

  if (isInformationalTopicInput(input)) return true;

  if (/신메뉴|출시|시즌\s*메뉴|여름\s*메뉴|겨울\s*메뉴/.test(topicBlob)) return true;
  if (/브랜드\s*블로그|콘텐츠\s*운영|블로그\s*운영/.test(topicBlob)) return true;
  if (key === "salon" && /염색|두피|펌|컷|네일|상담/.test(topicBlob)) return true;
  if (key === "hospital" && /한방|면역|진료|검진|처방|통증|관리/.test(topicBlob)) return true;
  if ((key === "pet" || key === "snack") && /간식|급여|영양|반려/.test(topicBlob)) return true;
  if (key === "restaurant" && /메뉴|모임|추천|코스/.test(topicBlob)) return true;
  if (key === "pension" && /펜션|숙박|바베큐|여행/.test(topicBlob)) return true;
  if (key === "education" && /학원|수업|회화|클래스/.test(topicBlob)) return true;
  if (key === "craft" && /공방|원데이|체험|클래스/.test(topicBlob)) return true;
  if (key === "construction" && /인테리어|리모델|시공|견적/.test(topicBlob)) return true;
  if (key === "tea_cafe" && /차|티|티코스/.test(topicBlob)) return true;
  if (key === "pet_cafe") return true;
  if (key === "furniture" && /매트리스|침대|수면|고르는\s*법/.test(topicBlob)) return true;
  if (/세차|코팅|디테일링/.test(topicBlob)) return true;

  const speaker = String(input.v4Speaker || "").trim();
  if (["brand_intro", "expert_info", "magazine", "local_blogger"].includes(speaker)) {
    return true;
  }
  return false;
}
