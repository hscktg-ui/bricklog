/**
 * 주제맵 — 생성 전 브랜드·업종·주제·검색의도·독자·발행목적·필수 설명 항목
 */
import { detectContentIntent } from "@/lib/pipeline/v2/intentDetection";
import { inferPublishPurpose } from "@/lib/content/publishPurposeEngine";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { isStructuredSubjectTopic } from "@/lib/product/coreContentEngine";

function topicLabel(input = {}) {
  return (
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim() ||
    "주제"
  );
}

function buildRequiredExplanationItems(input = {}) {
  const brand = String(input.brandName || "").trim();
  const topic = topicLabel(input);
  const region = String(input.region || "").trim();

  const base = [
    {
      id: "what",
      label: `${topic}이란`,
      patterns: [/무엇|이란|정의|개요|소개|종류|의미/],
      keywords: [topic, "이란", "무엇"],
    },
    {
      id: "why",
      label: "왜 필요한가",
      patterns: [/왜|이유|필요|효과|고민|찾/],
      keywords: ["왜", "필요", "이유"],
    },
    {
      id: "who",
      label: "누가 필요한가",
      patterns: [/누구|대상|추천|고객|사장|운영/],
      keywords: ["누구", "대상", "추천"],
    },
    {
      id: "brand_role",
      label: brand ? `${brand}은 무엇을 하는가` : "브랜드 역할",
      patterns: [/브랜드|운영|제공|전문|서비스|매장/],
      keywords: [brand, "운영", "제공"].filter(Boolean),
    },
    {
      id: "how_operate",
      label: "어떤 방식으로 운영하는가",
      patterns: [/방식|절차|과정|진행|예약|상담|문의/],
      keywords: ["방식", "절차", "진행"],
    },
    {
      id: "differentiation",
      label: "차별점은 무엇인가",
      patterns: [/차별|다른|특징|강점|포인트|비교/],
      keywords: ["차별", "특징", "다른"],
    },
    {
      id: "effect",
      label: "어떤 효과·가치가 있는가",
      patterns: [/효과|가치|도움|이점|기대/],
      keywords: ["효과", "가치"],
    },
    {
      id: "region_context",
      label: region ? `${region} 맥락` : "지역 맥락",
      patterns: [/지역|동네|근처|방문|위치|영업/],
      keywords: [region, "지역", "방문"].filter(Boolean),
    },
    {
      id: "before_inquiry",
      label: "문의·방문 전 확인사항",
      patterns: [/확인|문의|예약|주의|준비|체크|FAQ/],
      keywords: ["확인", "문의", "예약"],
    },
    {
      id: "action",
      label: "다음 행동(문의·방문·예약)",
      patterns: [/문의|연락|방문|예약|신청|상담/],
      keywords: ["문의", "방문", "예약"],
    },
  ];

  if (!isStructuredSubjectTopic(input)) {
    return base.slice(0, 7);
  }
  return base;
}

/**
 * @param {Record<string, unknown>} input
 */
export function buildTopicMap(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = topicLabel(input);
  const industryKey = resolveBriclogIndustryKey(input);
  const industry =
    String(input.industry || input.industryLabel || "").trim() ||
    industryKey ||
    "기타";

  const purpose = inferPublishPurpose(input);
  const intent = detectContentIntent(
    {
      topic,
      mainKeyword: input.mainKeyword,
      includeList: String(input.includePhrases || "").split(/[,，]/),
      purposeType: input.purposeType || purpose?.purpose,
      brandName: brand,
    },
    input
  );

  const reader =
    purpose?.purpose === "정보 제공"
      ? "주제를 처음 알아보는 독자"
      : purpose?.purpose === "방문 유도" || purpose?.purpose === "예약 유도"
        ? "방문·예약을 고민하는 지역 고객"
        : "브랜드·주제를 검색하는 잠재 고객";

  const requiredExplanationItems = buildRequiredExplanationItems(input);

  return {
    version: "topic-map-v1",
    brand,
    region,
    topic,
    industry,
    industryKey,
    searchIntent: intent.userIntent || intent.label || "정보 탐색",
    reader,
    publishPurpose: purpose?.purpose || "정보 제공",
    publishStructure: purpose?.structure || null,
    requiredExplanationItems,
    requiredItemCount: requiredExplanationItems.length,
    principle:
      "먼저 주제를 설명할 수 있는지 증명한다. 증명하지 못하면 작성하지 않는다.",
  };
}

export function formatTopicMapBrief(map = {}) {
  if (!map?.topic) return "";
  const lines = [
    "【주제맵 — 생성 전 필수】",
    `브랜드: ${map.brand || "(미입력)"}`,
    `업종: ${map.industry}`,
    `주제: ${map.topic}`,
    `검색의도: ${map.searchIntent}`,
    `독자: ${map.reader}`,
    `발행목적: ${map.publishPurpose}`,
    "필수 설명 항목:",
    ...(map.requiredExplanationItems || []).map((i) => `- ${i.label}`),
    map.principle,
  ];
  return lines.join("\n");
}
