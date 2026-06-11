import { resolveBlogLengthTier } from "@/lib/constants";
import {
  countBlogBodyCharsWithSpaces,
  countCharsWithSpaces,
  koreanObjectParticle,
} from "@/lib/prompts/engine/textUtils";
import { stripMetaLayerTerms } from "@/lib/content/metaLayerSeparation";
import { buildBrandFocusedSectionHeadings } from "@/lib/content/outlinePackGuard";
import {
  expandToMinByInformation,
  expandPackByInformation,
} from "@/lib/content/informationExpansionEngine";
import {
  buildSectionPlan,
} from "@/lib/content/sectionPlannerEngine";
import {
  resolvePublishHeading,
  sanitizeBlogPackPlannerLeak,
} from "@/lib/content/sectionPlannerSanitize";
import { applyKnowledgeCoverageGate } from "@/lib/content/knowledgeCoverageGate";
import {
  buildKnowledgeCoverageMap,
  buildCoverageAreaBody,
} from "@/lib/content/knowledgeCoverageEngine";
import { isSubstantiveSectionBody } from "@/lib/content/sectionWriterBodies";
import { applyDuplicateKiller } from "@/lib/content/duplicateKillerEngine";
import { stripEditorAuditSentences } from "@/lib/content/editorQualityEngine";
import { FILLER_PADDING_PATTERNS } from "@/lib/content/humanDeliveryRules";
import { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";
import { isLengthPaddingForbidden, isCoverageExpansionForbidden } from "@/lib/product/briclogMission";
import { topicRaw, topicWritingFacet } from "@/lib/content/topicFacetEngine";
import { deepenMissionProseToMin } from "@/lib/llm/missionProseFallback";
import { shouldPreserveGpt55LlmPackBody } from "@/lib/product/gpt55LlmPackGuard";

export { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";

/** V13 — 콘텐츠 운영·검수·AI 메타 문장 (비-BRICLOG 본문 금지) */
const OPERATOR_META_RE =
  /(콘텐츠는\s*문장|콘텐츠\s*운영|발행\s*직전|브랜드\s*맥락|콘텐츠\s*축|기존\s*AI\s*글|운영\s*관점|검수\s*기준|검수\s*항목|실무에서는\s*작성|길이\s*옵션|콘텐츠\s*축적|일관성을\s*유지해\s*발행|기능\s*설명:\s*실제\s*운영|활용\s*방식:\s*팀\s*단위)/i;

const BANNED_EMOTIONAL_RE =
  /(봄날의 따뜻한 햇살|주말 아침|커피 한 잔|퇴근길에 문득|비 오는 날|테이블 위가 비어 보이는 날|기념일을 깜빡했다|갑자기 잡힌 약속|꽃 한 다발|설레는 마음|따뜻한 기운|피곤한 몸|따뜻한 분위기|새로운 시작|특별한 순간|여러분의 이야기를|소중한 경험|새로운 세계|즐거운 경험)/g;
const FICTIONAL_RE =
  /(서울에 거주하는 한 사용자|부산의 한 요리 블로거|제주도의 한 작가|한 고객은 이렇게 말했다|방문자가 두 배로 늘었다|수면의 질이 개선되었다|사용 후 만족도가 높았다)/g;

function sanitizeForbidden(text) {
  let out = String(text || "")
    .replace(BANNED_EMOTIONAL_RE, "")
    .replace(FICTIONAL_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (OPERATOR_META_RE.test(out)) {
    out = out
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line && !OPERATOR_META_RE.test(line))
      .join("\n\n");
  }
  return stripEditorAuditSentences(stripMetaLayerTerms(out));
}

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 8);
}

function sentenceWeakScore(sentence) {
  let score = 10;
  for (const re of FILLER_PADDING_PATTERNS) {
    if (re.test(sentence)) score -= 3;
  }
  if (/^(요약|정리|결론|마무리|종합)/.test(sentence)) score -= 2;
  if (sentence.length < 18) score -= 2;
  if (sentence.length > 200) score -= 1;
  return score;
}

function normalizeForSimilarity(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function overlapRatio(a, b) {
  const ta = new Set(normalizeForSimilarity(a).split(" ").filter((w) => w.length > 1));
  const tb = new Set(normalizeForSimilarity(b).split(" ").filter((w) => w.length > 1));
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  for (const w of ta) if (tb.has(w)) common += 1;
  return common / Math.max(ta.size, tb.size);
}

function dedupeSectionsByMeaning(pack) {
  const sections = [];
  const seenExact = new Set();
  for (const sec of pack.sections || []) {
    const body = String(sec.body || "").trim();
    if (!body) continue;
    const normalized = normalizeForSimilarity(body);
    if (seenExact.has(normalized)) continue;
    const duplicated = sections.some((s) => overlapRatio(s.body, body) >= 0.72);
    if (duplicated) continue;
    sections.push({ ...sec, body });
    seenExact.add(normalized);
  }
  return { ...pack, sections };
}

const LONG_FORM_BLUEPRINT = [
  "문제 제기: 지금 콘텐츠 운영에서 막히는 지점",
  "원인 분석: 왜 기존 작성 방식이 반복 실패하는가",
  "브랜드 철학: 브랜드 기억과 방향성의 역할",
  "운영 흐름: 옵션값에서 실행 단계까지",
  "기능 설명: 실제 운영에 필요한 제어 장치",
  "활용 방식: 팀 단위 적용과 검수 루틴",
  "정리: 브랜드 자산으로 남기는 실행 제안",
];

const BRICLOG_BLUEPRINT = [
  "문제 제기: 기존 AI 콘텐츠가 왜 브랜드를 약화시키는가",
  "한계 분석: 생성 속도 중심 글쓰기의 구조적 문제",
  "브릭로그 철학: 브랜드 기억과 방향성 고정",
  "브랜드 메모리: 누적 맥락을 운영에 연결하는 방식",
  "실행 흐름: 옵션값에서 생성·검수까지",
  "콘텐츠 축적: 반복 발행에서 일관성을 만드는 방법",
  "결론: SEO는 결과이며 운영이 본질이라는 이유",
];

const TIER_STRUCTURE_RULES = {
  short: { minSections: 4, minParagraphs: 6, maxParagraphs: 8 },
  medium: { minSections: 6, minParagraphs: 9, maxParagraphs: 12 },
  long: { minSections: 8, minParagraphs: 12, maxParagraphs: 15 },
};

const TIER_MAX_SECTIONS = { short: 9, medium: 12, long: 14 };

const COMMON_EXPANSION_HEADINGS = [
  "실행 흐름: 준비부터 적용까지",
  "비교 포인트: 선택 전에 확인할 기준",
  "FAQ: 실무에서 자주 묻는 질문",
  "검수 체크리스트: 발행 전 점검 항목",
];

function isBriclogContext(ctx = {}, input = {}) {
  const text = `${ctx.brandName || ""} ${input.brandName || ""} ${ctx.topic || ""} ${
    input.topic || ""
  } ${input.mainKeyword || ""}`;
  return /브릭로그/i.test(String(text));
}

function briclogIdentityBlock(ctx = {}) {
  const brand = String(ctx.brandName || "브랜드").trim();
  return `${brand}는 단순한 AI 글쓰기 도구가 아니라 브랜드 기억 엔진에 가깝습니다. 과거 콘텐츠 맥락, 반복되는 브랜드 말투, 운영자가 남긴 피드백을 함께 참고해 메시지의 일관성을 유지합니다. 검색 결과를 그대로 옮기기보다 브랜드 관점으로 다시 해석해 전달하고, 콘텐츠가 쌓일수록 브랜드 철학이 더 선명해지도록 설계합니다. SEO는 목표가 아니라 이런 일관성이 쌓였을 때 따라오는 결과로 봅니다.`;
}

export function isFurnitureBedContext(ctx = {}, input = {}) {
  const industry = String(input.industry || ctx.industryLabel || "").toLowerCase();
  const topic = String(input.topic || input.mainKeyword || ctx.topic || "").toLowerCase();
  return (
    /가구|침대|매트리스|furniture|bed|mattress|모션베드/.test(industry) ||
    /침대|매트리스|모션베드|템퍼/.test(topic)
  );
}

function resolveSectionHeadings(ctx = {}, input = {}, count = 6) {
  if (isBriclogContext(ctx, input)) {
    return BRICLOG_BLUEPRINT.slice(0, count);
  }
  return buildBrandFocusedSectionHeadings(input, count);
}

function isExhibitionTopic(text = "") {
  return /전시|오픈|런칭|쇼케이스|신제품\s*소개|팝업|popup|소식/i.test(String(text || ""));
}

function genericConsumerTopicPad(ctx = {}, input = {}, slot = 0) {
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  const region = String(ctx.region || input.region || "").trim();
  const merged = { ...input, ...ctx };
  const topic =
    topicWritingFacet(merged) ||
    topicRaw(merged) ||
    String(input.topic || input.mainKeyword || ctx.topic || "매장 안내").trim();
  const topicObj = koreanObjectParticle(topic);
  const variants = [
    `${region ? `${region} ` : ""}${brand}에서 ${topic} 관련 비용·일정·예약은 공식·매장 안내로 확인하는 것이 가장 정확합니다.`,
    `${topic}를 비교할 때는 가격·조건·예약 절차·사후 지원을 함께 정리해 두면 상담이 빨라집니다.`,
    `${region ? `${region} ` : ""}방문 전 영업 시간·주차·대기·예약 가능 여부를 확인하면 당일 동선이 편합니다.`,
    `행사·혜택이 있다면 당일 들은 기간·대상·적용 조건을 메모해 두고 집에서 다시 비교했어요.`,
    `${brand} ${topic} — 확인되지 않은 할인·재고·구성은 단정하지 말고 직접 문의하세요.`,
    `${topicObj} 결정할 때 예산·일정·방문 목적을 함께 적어 두면 선택이 수월합니다.`,
    `동일 브랜드·업종이라도 지점·시기에 따라 조건이 달라질 수 있으니 최신 정보를 확인하세요.`,
    `${region ? `${region} 생활권에서 ` : ""}${brand} 방문 전 필요한 준비·주의 사항을 미리 보면 좋습니다.`,
  ];
  return sanitizeForbidden(variants[slot % variants.length]);
}

function consumerTopicPad(ctx = {}, input = {}, slot = 0) {
  if (!isFurnitureBedContext(ctx, input)) {
    return genericConsumerTopicPad(ctx, input, slot);
  }
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  const region = String(ctx.region || input.region || "").trim();
  const merged = { ...input, ...ctx };
  const topicRawVal = topicRaw(merged) || String(input.topic || input.mainKeyword || ctx.topic || "이야기").trim();
  const topic = topicWritingFacet(merged) || topicRawVal.split(/[,，]/)[0]?.trim() || topicRawVal;
  const topicObj = koreanObjectParticle(topic);
  const exhibition = isExhibitionTopic(topicRawVal) || isExhibitionTopic(topic);

  const exhibitionVariants = [
    `${region ? `${region} ` : ""}${brand} ${topic} 전시·체험 구성을 쇼룸에서 직접 확인해 보세요. 전시 기간·대상 라인업은 매장 안내 기준으로 짚어 봤습니다.`,
    `${topic} 일정과 함께 프로모션·카드 혜택 적용 조건을 당일 상담 때 정리해 두면 편합니다.`,
    `전시 모델별 체험 포인트·구성 차이를 표로 받아 두면 ${topicObj} 비교하기 편합니다.`,
    `${region ? `${region} ` : ""}${brand} 방문 전 전시 일정·예약 가능 여부를 전화로 확인하고 갔습니다.`,
    `행사·전시 기간에는 인기 모델 대기가 길 수 있어 평일 방문·사전 예약을 추천합니다.`,
    `${brand} ${topic} 관련 안내는 ${region ? `${region} ` : ""}매장 기준으로 최종 확인하세요.`,
  ];

  const variants = exhibition
    ? exhibitionVariants
    : [
    `${region ? `${region} ` : ""}${brand} 매장에서 ${topic} 관련 모델을 직접 누워보고 비교할 수 있습니다. 헤드·각도 조절, 지지감, 파트너 전달감을 함께 확인하는 순서가 좋습니다.`,
    `${topic} 행사가 진행 중이면 대상 모델·할인·증정 조건을 매장에서 들은 대로 메모해 두었어요. ${region ? `${region} ` : ""}예약이 필요한지도 같이 짚어 봤어요.`,
    `매트리스·프레임·모션 기능은 라인업마다 체감이 다릅니다. ${brand} 상담 시 수면 자세, 방 크기, 예산 범위를 알려주면 비교가 빨라집니다.`,
    `${region ? `${region} 생활권에서 ` : ""}${brand} 매장까지 이동 동선, 주차, 영업 시간을 미리 확인하면 당일 체험이 수월합니다.`,
    `구매 전에는 배송·설치 일정, 교환·A/S 범위, 행사 적용 조건을 한 번에 점검하세요. ${topicObj} 최종 결정할 때 도움이 됩니다.`,
    `${brand} ${topic} 체험 시 10~15분 이상 누워보고, 평소 수면 자세와 맞는지 비교해 보세요. 짧은 체험만으로는 장시간 사용감을 가늠하기 어렵습니다.`,
    `프로모션 기간에는 인기 모델 재고가 빠르게 소진될 수 있습니다. ${region ? `${region} ` : ""}매장에 사전 연락해 원하는 모델 체험 가능 여부를 확인하는 편이 좋습니다.`,
    `동일 브랜드라도 매장·행사·구성에 따라 혜택이 다를 수 있습니다. ${topic} 관련 안내는 ${brand}${region ? ` ${region}` : ""} 매장 기준으로 최종 확인하세요.`,
  ];
  return sanitizeForbidden(variants[slot % variants.length]);
}

function brandIdentityBlock(ctx = {}, input = {}) {
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  const region = String(ctx.region || input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "주제").trim();
  if (isFurnitureBedContext(ctx, input)) {
    return `${region ? `${region} ` : ""}${brand}에서 ${topic}를 검토 중이라면, 매장에서 직접 체험·상담 후 행사 조건을 비교해 보세요.`;
  }
  return `${region ? `${region} ` : ""}${brand} ${topic} 안내는 방문·예약·혜택·문의 방법 중심으로 정리했습니다.`;
}

function buildAdaptivePad(ctx = {}, input = {}, slot = 0) {
  if (isBriclogContext(ctx, input)) {
    const brand = String(ctx.brandName || "브랜드").trim();
    const variants = [
      `${brand}는 단순한 AI 글쓰기가 아니라 브랜드 기억과 방향성을 유지하는 운영 도구입니다. 반복 발행 시 말투와 메시지 축이 흔들리지 않도록 설계합니다.`,
      `생성-검수-출고 흐름에서 브랜드 메모리와 승인 콘텐츠를 참고하면 다음 초안의 일관성이 높아집니다.`,
    ];
    return sanitizeForbidden(variants[slot % variants.length]);
  }
  return consumerTopicPad(ctx, input, slot);
}

function industryStrategyBlock(ctx = {}, input = {}) {
  const industry = String(input.industry || ctx.industryLabel || "").toLowerCase();
  const brand = String(ctx.brandName || input.brandName || "브랜드").trim();
  const region = String(ctx.region || input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || ctx.topic || "").trim();
  if (isFurnitureBedContext(ctx, input)) {
    return `${region ? `${region} ` : ""}${brand} 매장에서 ${topic || "침대·매트리스"} 관련 모델을 직접 비교해 보세요. 체험 포인트, 행사·할인 조건, 방문·예약 방법을 함께 확인하면 선택이 수월합니다.`;
  }
  if (industry.includes("꽃집") || industry.includes("꽃") || industry.includes("플라워")) {
    return "꽃집 콘텐츠는 상황별 활용, 시즌성, 공간 분위기, 관리 팁을 균형 있게 담아야 실제 활용도가 높아집니다. 단순 감성 문장보다 언제 어떤 선택이 맞는지 기준을 제시하는 편이 효과적입니다.";
  }
  if (industry.includes("병원") || industry.includes("의원")) {
    return "병원 콘텐츠는 진료 흐름, 안내 정보, 방문 전 체크, 주의사항을 단계별로 정리해야 신뢰가 높아집니다. 확인 가능한 범위만 안내하고 과장·단정 표현은 제거해야 합니다.";
  }
  if (industry.includes("academy") || industry.includes("교육")) {
    return "academy/교육 콘텐츠는 학습 문제를 먼저 짚고, 커리큘럼 구조와 성장 흐름을 연결해 설명해야 신뢰가 생깁니다. 운영자는 학습자가 어디서 막히는지, 어떤 과정을 거치면 성과를 체감하는지를 구체적으로 안내해야 하며, 과장된 후기 대신 실제 활용 단계와 체크포인트를 제시하는 편이 효과적입니다.";
  }
  if (industry.includes("saas") || industry.includes("ai") || industry.includes("마케팅")) {
    return "SaaS/AI/마케팅 콘텐츠는 감성 문장보다 문제-구조-기능-활용 순서가 중요합니다. 실무에서는 도입 전 점검 항목, 협업 흐름, 운영 유지 비용과 같은 기준이 먼저 검토되므로, 기능 나열보다 실제 적용 순서를 보여주는 구성이 브랜드 신뢰를 높입니다.";
  }
  return "서비스 소개 콘텐츠는 문제를 먼저 정의하고, 왜 지금 이 선택이 필요한지와 실제 활용 흐름을 함께 설명해야 설득력이 생깁니다. 운영 관점에서 자주 발생하는 질문을 선제적으로 정리하면 독자가 빠르게 판단할 수 있습니다.";
}

function paragraphCount(text = "") {
  return String(text)
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}

function totalParagraphCount(pack) {
  const sectionN = (pack.sections || []).reduce(
    (n, s) => n + paragraphCount(s.body || ""),
    0
  );
  return sectionN + paragraphCount(pack.conclusion || "");
}

function expansionBodyByIndustry(ctx = {}, input = {}, idx = 0) {
  const industry = String(input.industry || ctx.industryLabel || "").toLowerCase();
  if (isFurnitureBedContext(ctx, input)) {
    const blocks = [
      "체험 설명은 단순한 느낌보다 실제 사용 동선으로 풀어야 합니다. 눕는 자세, 체압 분산, 수면 환경 변화를 단계별로 설명하면 정보 신뢰도가 올라갑니다.",
      "공간 설명에서는 방 크기와 배치 동선을 함께 제시해야 선택이 쉬워집니다. 프레임 높이, 헤드보드 활용, 주변 가구 조합을 함께 비교해 주는 구성이 효과적입니다.",
      "제품군 차이는 스펙 나열보다 사용 목적 기준으로 정리해야 합니다. 단단함 선호, 체온 민감도, 뒤척임 빈도 같은 기준을 먼저 제시하면 구매 판단이 빨라집니다.",
      "방문 포인트와 행사 정보는 분리해 안내해야 혼선이 줄어듭니다. 체험 가능한 모델, 상담 소요 시간, 행사 기간, 재고 확인 루틴을 함께 제시하는 방식이 좋습니다.",
      "구매 체크포인트에서는 예산, 배송 일정, 교환 조건, 사후 관리까지 포함해야 합니다. 결제 전 확인 항목을 명확히 보여주면 실제 전환 품질이 높아집니다.",
      "행사 설명은 대상 모델과 적용 조건을 분리해 안내해야 오해가 줄어듭니다. 할인 범위, 카드 혜택, 증정품, 적용 기간을 각각 구분해 제시하면 구매 판단이 쉬워집니다.",
      "설치 흐름은 계약 이후 일정 안내, 설치 당일 준비 사항, 기존 침대 처리 여부까지 함께 설명해야 체류 시간이 늘어납니다. 방문 전에 예약 가능 시간대와 상담 소요 시간도 안내하는 편이 좋습니다.",
      "실사용 비교는 허리 지지, 뒤척임, 파트너 진동 전달, 방 크기와 동선 같은 실제 고민 항목에서 시작하는 편이 좋습니다. 매장 체험 시 이 항목을 함께 확인해 보세요.",
    ];
    return blocks[idx % blocks.length];
  }
  if (/saas|ai|platform|플랫폼/.test(industry)) {
    const blocks = [
      "기존 문제를 먼저 정의해야 기능 설명이 살아납니다. 도입 전에는 어떤 병목이 있었는지, 왜 기존 방식이 반복 실패했는지 운영 기준으로 분해해 설명해야 합니다.",
      "실제 활용 흐름은 역할 단위로 설명하는 편이 효과적입니다. 기획, 실행, 검수, 리포트 단계에서 누가 어떤 판단을 하는지 보여주면 현업 적용성이 올라갑니다.",
      "브랜드 철학은 문장 삽입이 아니라 운영 기준으로 드러나야 합니다. 어떤 데이터를 우선하고 어떤 표현을 금지하는지 규칙 형태로 제시하면 일관성이 생깁니다.",
      "운영 방식은 자동화와 수동 검수의 경계를 명확히 해야 합니다. 생성-보정-검수-출고의 책임 구간을 분리해 두면 품질 편차를 줄일 수 있습니다.",
      "차별점은 기능 개수보다 결과의 안정성으로 설명해야 합니다. 같은 입력에서 같은 브랜드 톤을 유지하는 재현성이 핵심 기준이 됩니다.",
      "콘텐츠 전략은 단발성 발행이 아니라 누적 자산 관점으로 설계해야 합니다. 축적된 맥락을 다음 발행에 연결할수록 브랜드 해석의 정확도가 높아집니다.",
    ];
    return blocks[idx % blocks.length];
  }
  if (/꽃집|꽃|플라워/.test(industry)) {
    const blocks = [
      "상황별 활용에서는 기념, 방문, 선물 목적을 구분해 제안하는 것이 좋습니다. 같은 꽃이라도 전달 목적에 따라 구성과 메시지가 달라져야 만족도가 올라갑니다.",
      "시즌성은 색감과 유지 기간을 함께 안내할 때 실용성이 생깁니다. 계절별 추천 조합과 관리 난이도를 함께 설명하면 선택이 쉬워집니다.",
      "공간 분위기는 크기와 배치 기준으로 설명해야 합니다. 테이블, 현관, 거실처럼 위치별 권장 볼륨을 제시하면 활용성이 높아집니다.",
      "관리 팁은 물 교체 주기, 직사광선 회피, 줄기 정리처럼 바로 실행 가능한 항목 위주로 구성해야 실제 도움이 됩니다.",
    ];
    return blocks[idx % blocks.length];
  }
  if (/병원|의원/.test(industry)) {
    const blocks = [
      "진료 흐름은 접수-문진-상담-안내 순서로 제시하는 편이 이해가 빠릅니다. 방문자가 어떤 준비를 해야 하는지 사전에 알려주면 불안을 줄일 수 있습니다.",
      "안내 정보는 위치, 운영시간, 예약 방식, 서류 여부를 구분해 작성해야 합니다. 핵심 정보를 한 문단에 몰아넣기보다 단계별로 나누는 구성이 유리합니다.",
      "방문 전 체크 항목에는 현재 상태 기록, 복용 정보, 궁금한 질문 정리를 포함하면 상담 효율이 높아집니다.",
      "주의사항은 과장이나 단정 없이 안내 중심으로 작성해야 합니다. 개인 상태에 따라 달라질 수 있는 부분은 확인 필요 표현으로 정리해야 신뢰를 지킬 수 있습니다.",
    ];
    return blocks[idx % blocks.length];
  }
  return industryStrategyBlock(ctx, input);
}

/** Section Planner — 섹션 수 부족 시 서로 다른 정보 단위로 새 섹션만 추가 */
function addSectionsFromPlan(pack, minSectionCount, ctx, input) {
  if (isCoverageExpansionForbidden()) {
    const sections = [...(pack.sections || [])];
    const headings = resolveSectionHeadings(ctx, input, Math.min(minSectionCount, 5));
    let cursor = 0;
    while (sections.length < Math.min(minSectionCount, 5)) {
      const heading =
        headings[sections.length] ||
        headings[headings.length - 1] ||
        `${String(ctx.brandName || input.brandName || "브랜드")} 안내`;
      const body = sanitizeForbidden(
        `${expansionBodyByIndustry(ctx, input, cursor)}\n\n${buildAdaptivePad(ctx, input, cursor)}`
      );
      sections.push({ heading, body });
      cursor += 1;
    }
    return sanitizeBlogPackPlannerLeak({ ...pack, sections });
  }

  if (isBriclogContext(ctx, input)) {
    const rules = { minSections: minSectionCount };
    const sections = [...(pack.sections || [])];
    const headings = resolveSectionHeadings(ctx, input, minSectionCount + 2);
    let cursor = 0;
    while (sections.length < minSectionCount) {
      const heading =
        headings[sections.length] ||
        headings[headings.length - 1] ||
        `${String(ctx.brandName || input.brandName || "브랜드")} 안내`;
      const body = sanitizeForbidden(
        `${expansionBodyByIndustry(ctx, input, cursor)}\n\n${buildAdaptivePad(ctx, input, cursor)}`
      );
      sections.push({ heading, body });
      cursor += 1;
    }
    return { ...pack, sections };
  }

  const coverage = input.knowledgeCoverage || buildKnowledgeCoverageMap({ ...ctx, ...input });
  const sections = [...(pack.sections || [])];
  const usedHeadings = new Set(
    sections.map((s) => String(s.heading || "").trim().toLowerCase())
  );
  const usedIds = new Set();
  let i = 0;
  while (sections.length < minSectionCount && i < coverage.areas.length) {
    const area = coverage.areas[i % coverage.areas.length];
    if (!usedIds.has(area.id)) {
      const body = sanitizeForbidden(buildCoverageAreaBody(area, { ...ctx, ...input }));
      if (isSubstantiveSectionBody(body)) {
        const heading = resolvePublishHeading(area.heading, usedHeadings);
        if (heading) {
          sections.push({ heading, body });
          usedIds.add(area.id);
        }
      }
    }
    i += 1;
  }
  if (sections.length < minSectionCount) {
    const headings = resolveSectionHeadings(ctx, input, minSectionCount + 2);
    let cursor = 0;
    while (sections.length < minSectionCount) {
      const heading =
        headings[sections.length] ||
        headings[headings.length - 1] ||
        `${String(ctx.brandName || input.brandName || "브랜드")} 안내`;
      const body = sanitizeForbidden(
        `${consumerTopicPad(ctx, input, cursor)}\n\n${buildAdaptivePad(ctx, input, cursor)}`
      );
      sections.push({ heading, body });
      cursor += 1;
    }
  }
  return sanitizeBlogPackPlannerLeak({ ...pack, sections });
}

function ensureTierStructure(pack, tierKey = "medium", ctx = {}, input = {}) {
  const rules = TIER_STRUCTURE_RULES[tierKey] || TIER_STRUCTURE_RULES.medium;
  return addSectionsFromPlan(pack, rules.minSections, ctx, input);
}

function ensureLongStructure(pack, ctx = {}, input = {}, tierKey = "medium") {
  const minSections = (TIER_STRUCTURE_RULES[tierKey] || TIER_STRUCTURE_RULES.medium).minSections;
  return addSectionsFromPlan(pack, minSections, ctx, input);
}

/** 길이 부족 → 정보량 확장만 (문장·패딩 반복 금지) */
function expandToMin(pack, min, ctx, input, tierKey = "medium") {
  let next = ensureTierStructure(ensureLongStructure(pack, ctx, input, tierKey), tierKey, ctx, input);
  let loops = 0;
  while (countBlogBodyCharsWithSpaces(next) < min && loops < 8) {
    next = expandToMinByInformation(next, min, ctx, input, "blog");
    loops += 1;
  }
  if (countBlogBodyCharsWithSpaces(next) > min * 1.15 && tierKey === "short") {
    next = compressToMax(next, min + 200, tierKey);
  }
  return next;
}

function compressToMax(pack, max, tierKey = "medium", ctx = {}, input = {}) {
  const minSections = (TIER_STRUCTURE_RULES[tierKey] || TIER_STRUCTURE_RULES.medium).minSections;
  let next = applyDuplicateKiller(
    { ...pack, sections: [...(pack.sections || [])] },
    { ...ctx, input },
    "blog"
  );

  next = {
    ...next,
    sections: next.sections.map((sec) => {
      const seen = new Set();
      const kept = [];
      for (const sent of splitSentences(sec.body)) {
        const key = sent.replace(/\s/g, "").slice(0, 48);
        if (seen.has(key) || sentenceWeakScore(sent) < 4) continue;
        seen.add(key);
        kept.push(sent);
      }
      return { ...sec, body: kept.join("\n\n").trim() };
    }),
    conclusion: splitSentences(next.conclusion)
      .filter((s) => sentenceWeakScore(s) >= 4)
      .join(" ")
      .trim(),
  };

  let guard = 0;
  while (countBlogBodyCharsWithSpaces(next) > max && guard < 80) {
    let trimmed = false;
    const sections = [...next.sections];
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const sents = splitSentences(sections[i]?.body);
      if (sents.length > 2) {
        sents.pop();
        sections[i] = { ...sections[i], body: sents.join("\n\n").trim() };
        trimmed = true;
        break;
      }
    }
    if (!trimmed && sections.length > minSections) {
      sections.pop();
      trimmed = true;
    }
    if (!trimmed) {
      const last = sections[sections.length - 1];
      if (last && countCharsWithSpaces(last.body) > 140) {
        last.body = last.body.slice(0, Math.max(120, last.body.length - 100)).trim();
        trimmed = true;
      }
    }
    if (!trimmed) break;
    next = { ...next, sections };
    guard += 1;
  }
  return sanitizeBlogPackPlannerLeak(next);
}

/** tier min~max 충족까지 확장·압축 (정보 단위만, 반복 패딩 금지) */
function enforceLengthBand(pack, tier, tierKey, ctx, input) {
  let next = pack;
  let attempts = 0;
  const maxAttempts = 18;

  while (attempts < maxAttempts) {
    const chars = countBlogBodyCharsWithSpaces(next);
    if (chars >= tier.min && chars <= tier.max) {
      return { pack: next, ok: true, chars, attempts };
    }
    if (chars < tier.min) {
      if (isLengthPaddingForbidden()) {
        next = deepenMissionProseToMin(next, tier.min, { ...ctx, ...input });
        next = dedupeSectionsByMeaning(next);
        const afterMission = countBlogBodyCharsWithSpaces(next);
        if (afterMission >= tier.min) {
          return { pack: next, ok: true, chars: afterMission, attempts };
        }
        return { pack: next, ok: afterMission >= tier.min, chars: afterMission, attempts, missionSoftLength: afterMission < tier.min };
      }
      next = expandPackByInformation(next, ctx, input, {
        minChars: tier.min,
        channel: "blog",
      });
      next = deepenPackBodiesToMin(next, tier.min, ctx, input);
      next = dedupeSectionsByMeaning(next);
    } else {
      next = compressToMax(next, tier.max, tierKey, ctx, input);
    }
    next = sanitizeBlogPackPlannerLeak(
      sanitizeForbiddenPackSections(next)
    );
    attempts += 1;
  }

  const chars = countBlogBodyCharsWithSpaces(next);
  return {
    pack: next,
    ok: chars >= tier.min && chars <= tier.max,
    chars,
    attempts,
  };
}

function sanitizeForbiddenPackSections(pack) {
  return {
    ...pack,
    sections: (pack.sections || []).map((s) => ({
      ...s,
      heading: sanitizeForbidden(s.heading),
      body: sanitizeForbidden(s.body),
    })),
    conclusion: sanitizeForbidden(pack.conclusion),
  };
}

/** 티어별 소제목 상한 — 정보는 본문 밀도로, 섹션 수만 늘리지 않음 */
function capSectionsForTier(pack, tierKey = "medium") {
  const max = TIER_MAX_SECTIONS[tierKey] || TIER_MAX_SECTIONS.medium;
  const sections = [...(pack?.sections || [])];
  if (sections.length <= max) return pack;

  const kept = sections.slice(0, max);
  const overflow = sections.slice(max);
  const last = kept[kept.length - 1];
  if (last && overflow.length) {
    const merged = overflow
      .map((s) => String(s.body || "").trim())
      .filter(Boolean)
      .join("\n\n");
    if (merged) {
      last.body = `${String(last.body || "").trim()}\n\n${merged}`.trim();
    }
  }
  return { ...pack, sections: kept };
}

export function normalizeBlogLengthAndStructure(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length) {
    return { pack, adjusted: false, charCount: 0, lengthOk: false };
  }
  const tierKey = input.blogLengthTier || "medium";
  const tier = resolveBlogLengthTier(tierKey);
  let next = {
    ...pack,
    sections: (pack.sections || []).map((s) => ({
      ...s,
      body: sanitizeForbidden(s.body),
    })),
    conclusion: sanitizeForbidden(pack.conclusion),
  };
  next = dedupeSectionsByMeaning(next);
  const rules = TIER_STRUCTURE_RULES[tierKey] || TIER_STRUCTURE_RULES.medium;
  if ((next.sections || []).length < rules.minSections) {
    next = addSectionsFromPlan(next, rules.minSections, ctx, input);
  }

  const noLengthPad = isLengthPaddingForbidden();
  const preserveGpt55Llm = shouldPreserveGpt55LlmPackBody(next, input);
  const before = countBlogBodyCharsWithSpaces(next);
  if (noLengthPad && before < tier.min && !preserveGpt55Llm) {
    next = deepenMissionProseToMin(next, tier.min, { ...ctx, ...input });
  }
  if (!noLengthPad && before < tier.min) {
    next = expandPackByInformation(next, ctx, input, {
      minChars: tier.min,
      channel: "blog",
    });
  }
  if (countBlogBodyCharsWithSpaces(next) > tier.max) {
    next = compressToMax(next, tier.max, tierKey, ctx, input);
  }
  if (noLengthPad && !preserveGpt55Llm && countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = deepenMissionProseToMin(next, tier.min, { ...ctx, ...input });
  }

  if (!noLengthPad && countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = expandPackByInformation(next, ctx, input, {
      minChars: tier.min,
      channel: "blog",
    });
  }

  let polish = 0;
  while (!noLengthPad && polish < 3) {
    next = {
      ...next,
      sections: (next.sections || []).filter((s) => isSubstantiveSectionBody(s.body)),
    };
    next = sanitizeBlogPackPlannerLeak(next);
    if (countBlogBodyCharsWithSpaces(next) >= tier.min) break;
    next = expandPackByInformation(next, ctx, input, {
      minChars: tier.min,
      channel: "blog",
    });
    polish += 1;
  }

  if (!noLengthPad && countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = deepenPackBodiesToMin(next, tier.min, ctx, input);
  }
  if (noLengthPad && !preserveGpt55Llm && countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = deepenMissionProseToMin(next, tier.min, { ...ctx, ...input });
  }
  next = capSectionsForTier(next, tierKey);
  if (!noLengthPad && countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = deepenPackBodiesToMin(next, tier.min, ctx, input);
  }
  if (noLengthPad && !preserveGpt55Llm && countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = deepenMissionProseToMin(next, tier.min, { ...ctx, ...input });
  }

  let band = enforceLengthBand(next, tier, tierKey, ctx, input);
  next = band.pack;

  next = applyKnowledgeCoverageGate(next, { ...ctx, input }, "blog");
  if (!noLengthPad && countBlogBodyCharsWithSpaces(next) < tier.min) {
    next = deepenPackBodiesToMin(next, tier.min, ctx, input);
    band = enforceLengthBand(next, tier, tierKey, ctx, input);
    next = band.pack;
  } else if (
    noLengthPad &&
    !preserveGpt55Llm &&
    countBlogBodyCharsWithSpaces(next) < tier.min
  ) {
    next = deepenMissionProseToMin(next, tier.min, { ...ctx, ...input });
    band = enforceLengthBand(next, tier, tierKey, ctx, input);
    next = band.pack;
  } else if (countBlogBodyCharsWithSpaces(next) > tier.max) {
    next = compressToMax(next, tier.max, tierKey, ctx, input);
    const charsNow = countBlogBodyCharsWithSpaces(next);
    band = { ...band, ok: charsNow >= tier.min && charsNow <= tier.max, chars: charsNow };
  }

  const after = countBlogBodyCharsWithSpaces(next);
  const paragraphN = totalParagraphCount(next);
  const inBand = noLengthPad
    ? after >= tier.min && after <= tier.max
    : band.ok;
  next._meta = {
    ...(next._meta || {}),
    charCount: after,
    blogLengthTier: tierKey,
    lengthControl: {
      current: after,
      target: tier.target,
      min: tier.min,
      max: tier.max,
      tooShort: after < tier.min,
      tooLong: after > tier.max,
      inBand,
      strictOk: inBand,
      missionSoftLength: noLengthPad,
      paragraphCount: paragraphN,
      minParagraphs: rules.minParagraphs,
      maxParagraphs: rules.maxParagraphs,
      sectionCount: (next.sections || []).length,
      minSections: rules.minSections,
      bandAttempts: band.attempts,
    },
    lengthTierMet: inBand,
    passOutput: inBand ? next._meta?.passOutput !== false : false,
  };
  return {
    pack: next,
    adjusted: before !== after,
    charCount: after,
    lengthOk: inBand,
  };
}

const GISEUNG_MIN_SECTIONS = 3;

/** 긴 섹션을 문단 단위로 분할 — 섹션 수 회귀(2개 fat section) 복구 */
export function splitPackSectionsForStructure(pack, minSections = GISEUNG_MIN_SECTIONS) {
  if (!pack?.sections?.length) return pack;
  let sections = [...pack.sections];
  let guard = 0;
  while (sections.length < minSections && guard < 12) {
    let bestIdx = -1;
    let bestParas = 0;
    for (let i = 0; i < sections.length; i += 1) {
      const paras = String(sections[i].body || "")
        .split(/\n\n+/)
        .map((p) => p.trim())
        .filter((p) => p.replace(/\s/g, "").length >= 24);
      if (paras.length >= 2 && paras.length > bestParas) {
        bestParas = paras.length;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    const sec = sections[bestIdx];
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter((p) => p.replace(/\s/g, "").length >= 24);
    const mid = Math.ceil(paras.length / 2);
    const baseHeading = String(sec.heading || "안내").trim();
    sections.splice(
      bestIdx,
      1,
      { heading: baseHeading, body: paras.slice(0, mid).join("\n\n") },
      {
        heading: `${baseHeading} — 확인 포인트`,
        body: paras.slice(mid).join("\n\n"),
      }
    );
    guard += 1;
  }
  return { ...pack, sections };
}

/** salvage·display 직전 — gi·승·전·결용 최소 섹션 확보 */
export function ensureMinBlogSections(pack, ctx = {}, input = {}, minOverride) {
  if (!pack?.sections?.length) return pack;
  const tierKey = input.blogLengthTier || "medium";
  const rules = TIER_STRUCTURE_RULES[tierKey] || TIER_STRUCTURE_RULES.medium;
  const target = Math.max(GISEUNG_MIN_SECTIONS, minOverride ?? rules.minSections);
  let next = splitPackSectionsForStructure(pack, target);
  if ((next.sections || []).length >= target) return next;
  return addSectionsFromPlan(next, target, ctx, input);
}
