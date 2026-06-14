/**
 * 전 업종 사람 칼럼형 서사 — 꽃집 flowerNarrativeProse 패턴 SSOT
 */
import { deriveTopicWritingContext, topicWritingFacet, topicRaw } from "@/lib/content/topicFacetEngine";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyChars, countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { applyHumanColumnProsePass } from "@/lib/product/humanColumnProseEngine";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import { applyNarrativeArcShape } from "@/lib/product/narrativeArcShapeEngine";
import {
  isFieldReviewSpeaker,
  buildSpeakerAlignedTitle,
} from "@/lib/persona/speakerVoiceLock";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { isFlowerRecommendationTopic } from "@/lib/product/flowerRecommendationProseEngine";
import { buildFlowerRecommendationEditorialPack } from "@/lib/product/flowerNarrativeProse";
import {
  detectSeason,
  seasonLabel,
  pickIndustryBody,
  buildEditorialTitle,
  pickIndustryExtendedParagraphs,
} from "@/lib/product/editorialQualityStandard";
import { weaveTopicDominanceIntoPack } from "@/lib/content/v13ContentGate";

function koreanBatchim(char) {
  const code = String(char || "").charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function topicJosaWa(word = "") {
  const w = String(word || "").trim();
  if (!w) return "";
  const last = w[w.length - 1];
  return `${w}${koreanBatchim(last) ? "과" : "와"}`;
}

function topicJosaEul(word = "") {
  const w = String(word || "").trim();
  if (!w) return "";
  const last = w[w.length - 1];
  return `${w}${koreanBatchim(last) ? "을" : "를"}`;
}

export const INDUSTRY_HUMAN_COLUMN_VERSION = "industry-human-column-v3";

const SECTION_HEADINGS = {
  cafe: [
    "이 카페는 어떤 분위기일까?",
    "시즌 메뉴와 추천 조합",
    "방문 시간대와 좌석",
    "이용 팁",
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
  hospital: [
    "처음 방문할 때",
    "상담·진료 흐름",
    "준비하면 좋은 것",
    "마무리",
  ],
  education: [
    "수업 구성은 어떻게 될까?",
    "상담 전에 확인할 점",
    "등록·일정 안내",
    "마무리",
  ],
  marketing: [
    "무엇부터 정리할까?",
    "콘텐츠·채널 기준",
    "운영 팁",
    "마무리",
  ],
  pension: [
    "객실과 분위기",
    "예약·이용 안내",
    "여행 준비 팁",
    "마무리",
  ],
  retail: [
    "이번 시즌에 많이 찾는 스타일",
    "사이즈·핏 고를 때",
    "매장 이용 팁",
    "마무리",
  ],
  fitness: [
    "처음 시작할 때",
    "프로그램·운동 강도",
    "이용 전 확인할 점",
    "마무리",
  ],
  default: [
    "먼저 알아두면 좋은 점",
    "선택할 때 보는 기준",
    "방문·이용 팁",
    "마무리",
  ],
};

/** 업종별 구체 명칭·장면 (꽃집 수국·해바라기 패턴) */
const INDUSTRY_ITEMS = {
  cafe: ["시그니처 라떼", "플랫화이트", "브런치 플레이트", "크루아상", "시즌 에이드"],
  restaurant: ["대표 코스", "시그니처 메뉴", "룸 좌석", "오픈 키친"],
  salon: ["컷", "염색", "펌", "두피 클리닉"],
  hospital: ["초진 상담", "검진", "예약 접수"],
  education: ["레벨 테스트", "체험 수업", "회화 반"],
  marketing: ["주제 캘린더", "지역 키워드", "전환 CTA"],
  pension: ["디럭스 객실", "바베큐 세트", "조식"],
  retail: ["시즌 자켓", "데일리 셔츠", "ACC"],
  fitness: ["PT", "필라테스", "그룹 클래스"],
  default: ["시그니처", "대표", "추천", "안내"],
};

function resolveNarrativeKey(input = {}) {
  const id = String(input.industryId || "").trim();
  const map = {
    medical: "hospital",
    beauty: "salon",
    academy: "education",
    professional: "marketing",
    lodging: "pension",
    retail: "retail",
    fitness: "fitness",
  };
  if (map[id]) return map[id];
  const key = resolveBriclogIndustryKey(input);
  if (key === "hospital") return "hospital";
  if (/패션|리테일|의류|잡화/.test(`${input.industry || ""} ${input.topic || ""}`)) return "retail";
  if (/피트니스|헬스|요가|필라|운동|gym/i.test(`${input.industry || ""} ${input.topic || ""}`)) {
    return "fitness";
  }
  return key in SECTION_HEADINGS ? key : "default";
}

function paragraphKey(text) {
  return String(text || "").replace(/\s/g, "").slice(0, 48);
}

function dedupeBlocks(blocks = []) {
  const seen = new Set();
  return blocks.filter((b) => {
    const key = paragraphKey(b);
    if (!key || key.length < 16 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildIndustryDeepParagraphs(key, p, input, brandEditor) {
  const brand = p.brand || String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const regionBit = p.regionBit || "";
  const season = seasonLabel(detectSeason(input));
  const facet = topicWritingFacet(input) || "이용";
  const items = INDUSTRY_ITEMS[key] || INDUSTRY_ITEMS.default;

  const deep = {
    cafe: brandEditor
      ? [
          `${season}에는 시그니처 라떼·플랫화이트·시즌 에이드처럼 메뉴 구성이 바뀌는 경우가 많습니다. 원두 산지와 로스팅 톤에 따라 같은 메뉴도 매장마다 맛이 달라, 처음 방문이라면 바리스타 추천 한 잔부터 시작하는 편이 부담 없습니다.`,
          `브런치 플레이트·크루아상·치즈케이크 등 디저트는 음료와의 조합에 따라 만족도가 달라집니다. ${region ? `${region} ` : ""}근처에서 작업·대화·브런치 중 무엇이 우선인지 정해 두면 좌석과 메뉴 선택이 빨라집니다.`,
          `작업용이라면 콘센트·와이파이·좌석 간격을, 대화용이라면 테이블 크기와 소음 정도를 먼저 확인하는 편이 좋습니다. 주말 오전에는 웨이팅이 길어질 수 있어, 여유가 없다면 평일 오전이나 늦은 오후를 검토해 볼 만합니다.`,
          `${regionBit}${brand}에서는 ${facet} 관련 ${season} 안내를 준비하고 있습니다. 테이크아웃·픽업·예약 가능 여부는 매장 안내를 참고해 주세요.`,
        ]
      : [
          `${regionBit}${brand}에 들어서면 원두 향과 좌석 배치가 먼저 느껴졌습니다. 시그니처 라떼와 브런치 메뉴를 함께 주문해 보니 ${season} 시즌 구성이 기대와 잘 맞았습니다.`,
          `창가 자리는 햇빛이 강한 시간대엔 눈부심이 있어, 작업용이라면 안쪽 좌석이 더 편했습니다. 플랫화이트는 농도가 부드러워 대화하기 좋은 선택이었습니다.`,
        ],
    restaurant: brandEditor
      ? [
          `대표 메뉴는 식재료·양·매운맛 정도를 함께 보면 선택이 빨라집니다. ${region ? `${region} ` : ""}에서 모임·기념일·회식 목적에 맞는 코스와 좌석 타입을 미리 정리해 두면 상담이 수월합니다.`,
          `룸·홀·바 좌석은 분위기와 대화 편의성이 다릅니다. 주차·대기·포장 가능 여부는 방문 전에 확인해 두면 동선이 편합니다.`,
        ]
      : [
          `${regionBit}${brand} 메뉴판에서 대표 코스와 단품 구성을 비교해 보니 선택 기준이 분명해졌습니다.`,
        ],
    salon: brandEditor
      ? [
          `컷·펌·염색·클리닉은 살롱마다 강점이 다릅니다. 두피·모발 상태와 최근 시술 이력을 미리 알려 주시면 ${season} 시즌 컬러 추천이 수월합니다.`,
        ]
      : [`${regionBit}${brand} 상담에서 원하는 톤 사진을 보여 주니 방향이 빠르게 정리됐습니다.`],
    hospital: brandEditor
      ? [
          `증상·목적·예약 방식에 따라 진료 흐름이 달라집니다. 확인 가능한 범위에서만 안내하며, 세부 진단·치료는 반드시 의료진 상담으로 확인하세요.`,
          `초진 상담에서는 증상 기간·복용 약·검사 이력을 정리해 두면 상담이 빨라집니다. ${region ? `${region} ` : ""}에서 ${items[0] || "초진 상담"}·${items[1] || "검진"} 순으로 문의하시는 분들이 많습니다.`,
          `검진·예약 접수는 공식 채널에서 가능한 범위를 확인하세요. ${season} 시즌에는 건강검진·예방 상담 문의가 늘어나는 편입니다.`,
          `${regionBit}${brand}에서는 ${items[2] || "예약 접수"} 안내를 드립니다. 진료·치료 결과는 개인 상태에 따라 달라질 수 있습니다.`,
        ]
      : [`${regionBit}${brand}에 문의해 예약·준비물 안내를 확인했습니다.`],
    education: brandEditor
      ? [
          `수업 목표·현재 실력·가능한 요일을 정리해 두면 레벨 테스트와 반 편성 안내가 빨라집니다. 체험 수업으로 분위기를 먼저 보는 편이 후회가 적습니다.`,
          `레벨 테스트는 실력 확인이 목적입니다. ${region ? `${region} ` : ""}근처에서 ${items[0] || "체험 수업"}·${items[1] || "회화 반"}을 비교할 때는 수업 시간·인원·피드백 방식을 함께 보면 선택이 수월합니다.`,
          `입시·내신·회화 목표에 따라 커리큘럼이 달라집니다. ${season} 시즌에는 특강·집중반 안내가 따로 올라오는 경우가 많아, 목표 시험 일정을 상담 때 알려 두면 추천이 분명해집니다.`,
          `${regionBit}${brand}에서는 ${items[2] || "레벨 테스트"}부터 ${facet} 관련 ${season} 안내를 드립니다. 등록·환불·수업 변경 규정은 학원 안내를 참고해 주세요.`,
        ]
      : [`${regionBit}${brand} 상담에서 목표와 시간을 말하니 추천 반 구성이 구체적으로 정리됐습니다.`],
    marketing: brandEditor
      ? [
          `브랜드 채널은 인지·재방문·전환 중 무엇을 우선할지 정하면 글 주제와 CTA가 분명해집니다. ${region ? `${region} ` : ""}지역 키워드와 업종 특징을 함께 넣으면 검색 의도에 맞는 콘텐츠가 됩니다.`,
        ]
      : [`${regionBit}${brand}와 이야기를 나눠 보니 채널별 준비 자료가 달라진다는 점이 분명해졌습니다.`],
    pension: brandEditor
      ? [
          `객실 타입·바베큐·체크인 시간·추가 인원 요금을 비교하면 선택이 수월합니다. ${region ? `${region} ` : ""}여행 일정이 확정되면 조기 예약 문의를 검토해 보세요.`,
        ]
      : [`${regionBit}${brand} 객실과 바베큐 공간을 비교해 보니 인원 구성에 맞는 타입이 보였습니다.`],
    retail: brandEditor
      ? [
          `시즌 컬러·실루엣·소재는 매장마다 진열 방식이 다릅니다. ${region ? `${region} ` : ""}에서 착용 목적을 먼저 정하면 코디 범위가 좁혀집니다.`,
        ]
      : [`${regionBit}${brand}에서 시즌 신상과 베이직 라인을 나란히 볼 수 있었습니다.`],
    fitness: brandEditor
      ? [
          `헬스·필라테스·요가·PT 등 프로그램마다 강도와 목적이 다릅니다. 처음 시작이라면 체험 수업으로 분위기를 먼저 보는 편이 좋습니다.`,
        ]
      : [`${regionBit}${brand} 체험 수업에서 강도와 코치 피드백 방식을 확인했습니다.`],
    default: brandEditor
      ? [`${facet}를 알아볼 때는 운영 방식·예약·상담을 함께 보면 비교가 수월합니다.`]
      : [`${regionBit}${brand}에서 ${facet} 관련 안내를 확인했습니다.`],
  };

  return deep[key] || deep.default;
}

function regionTopicLead(p, input, facet) {
  const region = String(input.region || "").trim();
  const brand = p.brand || String(input.brandName || "").trim();
  if (region && facet) {
    return `${region}에서 ${facet}를 찾는 분들`;
  }
  if (region) return `${region}에서`;
  return brand ? `${brand}를 알아보는 분들` : "처음 알아보는 분들";
}

/**
 * @param {object} p
 * @param {object} input
 * @returns {string[]}
 */
export function buildIndustryNarrativeParagraphs(p, input = {}) {
  const key = resolveNarrativeKey(input);
  const brandEditor = !isFieldReviewSpeaker(input);
  const brand = p.brand || String(input.brandName || "").trim();
  const regionBit = p.regionBit || "";
  const { label: season } = seasonFromInput(input);
  const facet = topicWritingFacet(input) || topicRaw(input) || p.topicFacet || "이용";
  const bodyTpl = pickIndustryBody(input);
  const items = INDUSTRY_ITEMS[key] || INDUSTRY_ITEMS.default;
  const lead = regionTopicLead(p, input, facet);
  const blocks = [];

  const topicLine = String(input.topic || topicRaw(input) || "").trim();
  const topicLead =
    topicLine && topicLine.length >= 4
      ? `${topicJosaEul(topicLine)} 알아보는 분들`
      : lead;

  if (brandEditor) {
    blocks.push(
      `${season} ${facet} 관련 문의가 늘어나는 시기입니다. ${topicLine ? `${topicJosaWa(topicLine)} 관련해 ` : ""}${topicLead}에게 저희 ${brand ? `${brand} ` : ""}이야기를 정리해 봤습니다.`,
      bodyTpl.opener,
      `${regionBit}${brand ? `${brand} ` : ""}에서는 ${season} 기준으로 ${items[0] || facet}부터 많이 찾으시는 편입니다. ${items[1] ? `${items[1]}와 ${items[2] || items[0]}를 함께 보면 선택이 수월합니다.` : bodyTpl.items}`
    );
    if (items[2]) {
      blocks.push(
        `${items[2]}는 ${key === "cafe" ? "브런치·대화" : key === "restaurant" ? "모임·기념일" : "방문 목적"}에 따라 체감이 달라집니다. ${items[3] ? `${items[3]}도 함께 비교해 보시면 좋습니다.` : ""}`.trim()
      );
    }
    blocks.push(bodyTpl.purpose, bodyTpl.care);
    for (const extra of pickIndustryExtendedParagraphs(input).slice(0, 3)) {
      blocks.push(extra);
    }
    blocks.push(...buildIndustryDeepParagraphs(key, p, input, brandEditor));
    const features = String(input.storeFeatures || input.brandDescription || "").trim();
    if (features && brand) {
      blocks.push(
        `${regionBit}${brand}는 ${features.split(/[·,，]/).slice(0, 3).join(", ")} 등을 ${season} 기준으로 준비하고 있습니다.`
      );
    }
    if (key === "salon" && topicLine) {
      blocks.push(
        `${topicJosaEul(topicLine)} 고려하시면 ${items[0] || "컷"}·${items[1] || "염색"}·${items[2] || "펌"} 중에서 우선순위를 정해 상담하시면 좋습니다. ${regionBit}${brand}에서는 ${topicLine} 기준으로 스타일·관리 주기를 함께 안내합니다.`
      );
    }
    if (brand) {
      blocks.push(
        `${regionBit}${brand}에서 ${facet}를 준비하실 때는 영업 시간·예약·주차를 매장 안내로 확인해 주세요. 저희 이야기가 ${regionBit ? `${String(input.region || "").trim()} ` : ""}선택에 작은 도움이 되길 바랍니다.`
      );
    }
  } else {
    blocks.push(
      `${topicLine ? `${topicLine} 때문에 ` : `${lead} `}${regionBit}${brand}를 알아보게 됐습니다.`,
      `${topicLine ? `${topicJosaWa(topicLine)} 관련해 ` : ""}${regionBit}${brand}에 들어서니 ${items[0] || facet}부터 눈에 들어왔습니다. ${season} 분위기와 잘 어울리는 구성이었습니다.`,
      `${items[1] || "메뉴"}와 ${items[2] || items[0] || "구성"}를 비교해 보니 ${topicLine || facet} 기준으로 ${bodyTpl.purpose.replace(/\.$/, "")}이 조금 분명해졌습니다.`,
      bodyTpl.care,
      `${regionBit}${brand}에서 ${topicLine || facet}를 검토 중이라면, 운영 시간과 예약 가능 여부를 먼저 확인해 보시면 좋습니다.`
    );
    for (const extra of pickIndustryExtendedParagraphs(input).slice(0, 2)) {
      blocks.push(extra);
    }
    blocks.push(...buildIndustryDeepParagraphs(key, p, input, brandEditor));
  }

  return dedupeBlocks(blocks.filter(Boolean));
}

function resolveEditorialPackTitle(input = {}, p = {}, facet = "이용") {
  const profile = resolvePersonaEngineProfile(input);
  const topicLine = String(input.topic || topicRaw(input) || "").trim();
  if (isFieldReviewSpeaker(input)) {
    const label = topicLine || facet;
    return `${p.regionBit || ""}${p.brand || String(input.brandName || "").trim()}, ${label} 직접 보고 정리해봤습니다`
      .replace(/\s+/g, " ")
      .trim();
  }
  if (topicLine && profile.archetype === "brand_editor") {
    return (
      buildSpeakerAlignedTitle(input, profile.archetype) ||
      buildEditorialTitle(input, p)
    );
  }
  return (
    buildSpeakerAlignedTitle(input, profile.archetype) ||
    buildEditorialTitle(input, p)
  );
}

function seasonFromInput(input = {}) {
  const season = detectSeason(input);
  const topicBlob = `${input.topic || ""} ${input.mainKeyword || ""}`;
  if (/봄|spring|3월|4월|5월/i.test(topicBlob)) return { key: "spring", label: seasonLabel("spring") };
  if (/여름|summer|6월|7월|8월/i.test(topicBlob)) return { key: "summer", label: seasonLabel("summer") };
  if (/가을|fall|9월|10월|11월/i.test(topicBlob)) return { key: "autumn", label: seasonLabel("autumn") };
  if (/겨울|winter|12월|1월|2월/i.test(topicBlob)) return { key: "winter", label: seasonLabel("winter") };
  return { key: season, label: seasonLabel(season) };
}

export function buildIndustrySectionHeadings(input = {}, count = 4) {
  const key = resolveNarrativeKey(input);
  const pool = [...(SECTION_HEADINGS[key] || SECTION_HEADINGS.default)];
  const topicLine = String(input.topic || topicRaw(input) || "").trim();
  if (topicLine.length >= 5 && topicLine.length <= 32) {
    pool[0] = `${topicLine} — 알아두면 좋은 점`;
  }
  return pool.slice(0, Math.max(1, count));
}

function distributeParagraphsToSections(paragraphs, headings) {
  const sections = headings.map((heading) => ({ heading, body: "" }));
  paragraphs.forEach((para, i) => {
    const idx = i % sections.length;
    sections[idx].body = sections[idx].body
      ? `${sections[idx].body}\n\n${para}`.trim()
      : para;
  });
  return sections.filter((s) => s.body.replace(/\s/g, "").length >= 40);
}

function buildTierFillLines(key, p, input, startIndex = 0) {
  const brand = p.brand || String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const regionBit = p.regionBit || "";
  const { label: season } = seasonFromInput(input);
  const topicLine = String(input.topic || topicRaw(input) || "").trim();
  const facet = topicWritingFacet(input) || topicLine || topicRaw(input) || "이용";
  const items = INDUSTRY_ITEMS[key] || INDUSTRY_ITEMS.default;
  const headings = SECTION_HEADINGS[key] || SECTION_HEADINGS.default;
  const templates = [
    (item, heading) =>
      `${season} ${topicLine || facet} 관련해서 ${item}를 먼저 보는 분들이 많습니다. ${region ? `${region} ` : ""}근처에서 ${heading.replace(/\?$/, "")}를 기준으로 삼으면 비교가 수월합니다.`,
    (item) =>
      `${item}는 준비 방식·가격대·소요 시간이 매장마다 달라, 처음 방문이라면 상담·안내를 함께 확인하는 편이 좋습니다.`,
    (item) =>
      `검색으로 ${item}만 찾다 보면 정보가 흩어지기 쉽습니다. ${brand ? `${brand} ` : ""}안내와 함께 ${season} 기준 구성을 보면 선택 부담이 줄어듭니다.`,
    () =>
      `${regionBit}${brand || "매장"}에서 ${facet}를 준비할 때는 영업 시간·예약·주차를 미리 확인해 두면 방문 동선이 편합니다.`,
    () =>
      `비교할 때는 가격만이 아니라 구성·소요 시간·준비물을 함께 적어 두면 상담이 빨라지고, ${season} 시즌에 맞는 선택도 수월해집니다.`,
    () =>
      `${region ? `${region}에서 ` : ""}${facet}를 처음 알아보는 분들은 사진·후기·메뉴 구성을 나란히 보며 기준을 정리하는 경우가 많습니다.`,
  ];

  return Array.from({ length: templates.length * 2 }, (_, i) => {
    const tpl = templates[(startIndex + i) % templates.length];
    const item = items[(startIndex + i) % items.length];
    const heading = headings[(startIndex + i) % headings.length] || "안내";
    return tpl(item, heading);
  });
}

function expandPackToTierMin(pack, input = {}, paragraphs = []) {
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const key = resolveNarrativeKey(input);
  const p = deriveTopicWritingContext(input);
  const target = Math.max(Math.round(tier.min * 0.58), 1050);
  let next = { ...pack, sections: [...(pack.sections || [])] };
  let guard = 0;
  const extras = pickIndustryExtendedParagraphs(input);
  const deepPool = buildIndustryDeepParagraphs(key, p, input, !isFieldReviewSpeaker(input));
  const fillPool = buildTierFillLines(key, p, input);
  const pool = [...deepPool, ...extras, ...fillPool, ...paragraphs];
  const headings = buildIndustrySectionHeadings(input, Math.max(next.sections.length + 4, 6));

  while (countBlogBodyChars(next) < target && guard < 24) {
    const extra = pool[guard % pool.length];
    if (!extra) break;
    const bodyKey = extra.replace(/\s/g, "").slice(0, 32);
    const fullText = getPackBodyText(next);
    if (fullText.includes(bodyKey)) {
      guard += 1;
      continue;
    }
    const sectionIdx = guard % next.sections.length;
    const section = next.sections[sectionIdx];
    if (section) {
      next.sections[sectionIdx] = {
        ...section,
        body: `${section.body}\n\n${extra}`.trim(),
      };
    } else {
      next.sections.push({
        heading: headings[next.sections.length] || "추가 안내",
        body: extra,
      });
    }
    guard += 1;
  }
  return next;
}

function getPackBodyText(pack) {
  return (pack.sections || []).map((s) => s.body || "").join("\n").replace(/\s/g, "");
}

/**
 * 전 업종 — 사람 칼럼형 editorial pack
 */
export function buildIndustryHumanColumnEditorialPack(input = {}) {
  const industryKey = resolveBriclogIndustryKey(input);
  if (
    industryKey === "flower" ||
    industryKey === "unmanned_flower" ||
    isFlowerRecommendationTopic(input)
  ) {
    return buildFlowerRecommendationEditorialPack(input);
  }

  const p = deriveTopicWritingContext(input);
  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  const sectionCount = tier.key === "short" ? 4 : tier.key === "long" ? 6 : 5;
  const headings = buildIndustrySectionHeadings(input, sectionCount);
  const paras = buildIndustryNarrativeParagraphs(p, input);
  const brandEditor = !isFieldReviewSpeaker(input);
  const facet = topicWritingFacet(input) || p.topicFacet || "이용";
  const bodyTpl = pickIndustryBody(input);

  let sections = distributeParagraphsToSections(paras, headings);
  if (sections.length < 3) {
    sections = headings.map((heading, i) => ({
      heading,
      body: paras[i] || paras[0] || bodyTpl.opener,
    }));
  }

  const brandLabel = p.brand || String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const closeLine = brandEditor
    ? `${bodyTpl.close}\n\n${region ? `${region} ` : ""}${brandLabel}`.trim()
    : `${p.regionBit}${brandLabel}에서 ${facet}를 고를 때 참고해 보시면 좋습니다.`;

  const title = resolveEditorialPackTitle(input, p, facet);

  let pack = {
    title,
    representativeTitle: title,
    sections,
    conclusion: closeLine,
    hashtags: [],
    _meta: {
      industryHumanColumnEditorial: true,
      editorialQualityStandard: true,
      missionProseFallback: true,
    },
  };

  pack = applyHumanColumnProsePass(pack, input, { force: true });
  pack = applyDuplicateKiller(pack, input);
  if (isFieldReviewSpeaker(input)) {
    pack = applyNarrativeArcShape(pack, input, { force: true });
  }
  pack = applyDuplicateKiller(pack, input);
  pack = expandPackToTierMin(pack, input, paras);
  pack = applyHumanColumnProsePass(pack, input, { force: true });
  pack = weaveTopicDominanceIntoPack(pack, input);

  const chars = countBlogBodyCharsWithSpaces(pack);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      industryHumanColumnEditorial: true,
      editorialQualityStandard: true,
      missionProseFallback: true,
      humanColumnProsePass: true,
      industryHumanColumnVersion: INDUSTRY_HUMAN_COLUMN_VERSION,
      v4Speaker: input.v4Speaker || resolvePersonaEngineProfile(input).v4Speaker,
      personaArchetype: resolvePersonaEngineProfile(input).archetype,
      editorialSeason: seasonFromInput(input).label,
      editorialTopic: String(input.topic || topicRaw(input) || "").trim() || undefined,
      lengthTierMet: chars >= tier.min * 0.45,
      editorialQualityChars: chars,
    },
  };
}

export function isIndustryHumanColumnEditorialPack(pack) {
  return Boolean(
    pack?._meta?.industryHumanColumnEditorial ||
      pack?._meta?.flowerRecommendationEditorial
  );
}
