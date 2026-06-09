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
import { assessHaeshinQualityScore } from "@/lib/golden/haeshinQualityScorer";

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
      opener: "펫카페는 반려견 동반 규정과 공간 분위기를 함께 봐야 합니다.",
      items: "입장 규칙·메뉴·놀이 공간·체중 제한은 매장마다 다릅니다.",
      purpose: "견종·성격·동반 인원에 맞춰 시간대를 고르면 스트레스가 줄어듭니다.",
      care: "리드줄·배변 봉투·예방접종 등 매장 안내를 방문 전 확인하세요.",
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

  const sections = [
    { heading: "", body: paragraphs.slice(0, 2).join("\n\n") },
    { heading: "", body: paragraphs.slice(2, 4).join("\n\n") },
    { heading: "", body: paragraphs.slice(4, 6).join("\n\n") },
  ].filter((s) => s.body.replace(/\s/g, "").length >= 40);

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

  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const chars = countBlogBodyCharsWithSpaces(pack);
  return {
    ...pack,
    _meta: {
      ...pack._meta,
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

  const speaker = String(input.v4Speaker || "").trim();
  if (["brand_intro", "expert_info", "magazine", "local_blogger"].includes(speaker)) {
    return true;
  }
  return false;
}
