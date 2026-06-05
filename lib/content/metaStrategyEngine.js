import { getBrandTypeOption } from "@/lib/brand/brandType";
import { resolveBlogLengthTier } from "@/lib/constants";

const CONTENT_TYPES = [
  "브랜드 소개",
  "제품 소개",
  "방문 유도",
  "정보성",
  "후기형",
  "뉴스형",
  "운영형",
  "철학형",
  "홍보형",
  "비교형",
  "가이드형",
];

const AUDIENCES = [
  "구매 직전 사용자",
  "정보 탐색 사용자",
  "브랜드 비교 사용자",
  "초보 사용자",
  "기존 고객",
  "방문 예정 고객",
];

const GAINS = [
  "정보",
  "신뢰",
  "브랜드 이해",
  "구매 판단",
  "실행 흐름",
  "비교 기준",
  "철학",
  "운영 방식",
];

const TONES = [
  "브랜드형",
  "정보형",
  "운영형",
  "감성형",
  "뉴스형",
  "철학형",
  "실무형",
];

function normalizeIndustry(raw = "") {
  const v = String(raw).toLowerCase();
  if (/flower|꽃/.test(v)) return "꽃집";
  if (/saas/.test(v)) return "SaaS";
  if (/\bai\b|인공지능/.test(v)) return "AI";
  if (/마케팅|agency|광고/.test(v)) return "마케팅";
  if (/병원|의원|clinic|약국/.test(v)) return "병원";
  if (/가구|침대|furniture/.test(v)) return "가구";
  if (/카페|cafe|coffee/.test(v)) return "카페";
  if (/academy|교육|학원/.test(v)) return "교육";
  if (/커뮤니티|community/.test(v)) return "커뮤니티";
  if (/플랫폼|platform/.test(v)) return "플랫폼";
  if (/패션|fashion/.test(v)) return "패션";
  if (/리빙|living|홈/.test(v)) return "리빙";
  return String(raw || "").trim() || "기타";
}

function normalizePurpose(raw = "") {
  const v = String(raw || "").toLowerCase();
  if (/new|신제품|출시|런칭/.test(v)) return "신제품 소개";
  if (/event|행사|프로모션/.test(v)) return "행사 안내";
  if (/brand|브랜드/.test(v)) return "브랜드 소개";
  if (/compare|비교/.test(v)) return "비교 콘텐츠";
  if (/guide|가이드|방문|길찾기/.test(v)) return "방문 가이드";
  if (/info|정보/.test(v)) return "정보성";
  if (/promo|홍보/.test(v)) return "홍보성";
  if (/philosophy|철학|운영/.test(v)) return "운영 철학";
  return "정보성";
}

import { inferPublishPurpose } from "@/lib/content/publishPurposeEngine";

export function deriveMetaStrategy(input = {}) {
  const brand = String(input.brandName || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const region = String(input.region || "").trim();
  const industry = normalizeIndustry(input.industry || input.industryLabel || "");
  const brandType = getBrandTypeOption(input.brandType || "other");
  const lengthTierKey = input.blogLengthTier || "medium";
  const lengthTier = resolveBlogLengthTier(lengthTierKey);
  const purposeInference = inferPublishPurpose(input);
  const purposeLabel = purposeInference.purpose;
  const objective = String(input.contentObjective || input.purpose || "").toLowerCase();

  let contentType = purposeInference.structure;
  if (/brand|브랜드/.test(objective)) contentType = "브랜드 소개";
  else if (/product|제품/.test(objective)) contentType = "제품 소개";
  else if (/visit|방문/.test(objective)) contentType = "방문 유도";
  else if (/review|후기/.test(objective)) contentType = "후기형";
  else if (/event|promo|홍보/.test(objective)) contentType = "홍보형";
  else if (/localseo|search|info|정보/.test(objective)) contentType = "가이드형";

  const businessIndustry = /SaaS|AI|마케팅|교육|플랫폼/.test(industry);
  const audience =
    contentType === "방문 유도"
      ? "방문 예정 고객"
      : contentType === "브랜드 소개"
        ? "브랜드 비교 사용자"
        : "정보 탐색 사용자";
  const readerGain =
    contentType === "브랜드 소개"
      ? "브랜드 이해"
      : contentType === "제품 소개"
        ? "구매 판단"
        : "실행 흐름";
  const tone = businessIndustry ? "실무형" : contentType === "후기형" ? "운영형" : "정보형";

  const strategyFlow = [
    "입력값 분석",
    "브랜드 전략 결정",
    "업종 전략 결정",
    "글 길이 결정",
    "지역 전략 결정",
    "콘텐츠 목적 결정",
    "브랜드 메모리 검색",
    "과거 콘텐츠 검색",
    "공식자료 조사",
    "네이버 조사",
    "문체 결정",
    "콘텐츠 생성",
    "글자수 검수",
    "품질 검수",
  ];

  const ok = Boolean(topic && brand);
  const missing = [];
  if (!brand) missing.push("brandName");
  if (!topic) missing.push("topic");

  const isBriclog = brand.includes("브릭로그") || topic.includes("브릭로그");
  return {
    ok,
    missing,
    contentType,
    purpose: purposeLabel,
    publishPurpose: purposeInference.purpose,
    contentStructureType: purposeInference.structure,
    publishPurposeSource: purposeInference.source,
    industry,
    brandType: brandType.label,
    brandTypeKey: brandType.value,
    audience,
    readerGain,
    tone: isBriclog ? "철학형" : tone,
    region,
    lengthTierKey,
    lengthPlan: {
      min: lengthTier.min,
      target: lengthTier.target,
      max: lengthTier.max,
    },
    strategyFlow,
    businessIndustry,
    isBriclog,
    allowedContentTypes: CONTENT_TYPES,
    allowedAudiences: AUDIENCES,
    allowedGains: GAINS,
    allowedTones: TONES,
  };
}
