/**
 * BRICLOG VISION — Brand Content OS
 *
 * AI Writer가 아니다. GPT·Claude·Gemini와 경쟁하지 않는다.
 * 대한민국 최고의 브랜드 블로그 운영 AI.
 *
 * 콘텐츠 기획 30 · 조사 30 · 설명 20 · 글쓰기 10 · 검수 10
 */
import { detectContentIntent } from "@/lib/pipeline/v2/intentDetection";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { assessExplainQuality } from "@/lib/product/briclogExplainEngine";
import { assessContentEvaluation } from "@/lib/product/contentEvaluationEngine";
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";

export const BRAND_CONTENT_OS_VERSION = "brand-content-os-v1";

export const BRICLOG_VISION = {
  identity: "Brand Content OS",
  tagline: "대한민국 최고의 브랜드 블로그 운영 AI",
  not: [
    "AI 글쓰기 서비스",
    "AI Writer",
    "GPT 경쟁",
    "Claude 경쟁",
    "Gemini 경쟁",
  ],
  delivers: [
    "무엇을 써야 하는지",
    "왜 써야 하는지",
    "어떤 정보를 조사해야 하는지",
    "브랜드에 맞게 정리",
    "사람이 읽을 수 있는 글로 완성",
  ],
  userValue: '「글을 받았다」가 아니라 「이번 달 운영 계획이 생겼다」',
};

export const BRAND_CONTENT_OS_KPI = {
  planning: 30,
  research: 30,
  explain: 20,
  writing: 10,
  review: 10,
};

export const BRAND_CONTENT_OS_PHASES = [
  { id: "planning", step: 1, weight: 30, label: "콘텐츠 기획", role: "무엇을·왜 쓸지" },
  { id: "research", step: 2, weight: 30, label: "조사", role: "조사 항목·팩트" },
  { id: "explain", step: 3, weight: 20, label: "설명", role: "이유·활용·브랜드 연결" },
  { id: "writing", step: 4, weight: 10, label: "글쓰기", role: "사람이 읽을 문장" },
  { id: "review", step: 5, weight: 10, label: "검수", role: "품질·placeholder 차단" },
];

export function isBrandContentOSEnforced() {
  if (process.env.BRICLOG_BRAND_CONTENT_OS === "false") return false;
  if (process.env.BRICLOG_BRAND_CONTENT_OS === "true") return true;
  return isBriclogResetQualityEnforced();
}

function monthLabel(date = new Date()) {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

/**
 * STEP 1 — 콘텐츠 기획 (글 아님 · 운영 계획)
 */
export function buildContentOperatingPlan(input = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();
  const industry = resolveBriclogIndustryKey(input);
  const intent = detectContentIntent(input, input);

  const whatToWrite = [
    {
      id: "primary",
      topic,
      channel: "blog",
      priority: "이번 주",
    },
    {
      id: "support_place",
      topic: `${brand} ${region} 플레이스·방문 정보`,
      channel: "place",
      priority: "이번 달",
    },
    {
      id: "support_insta",
      topic: `${topic} — 현장·제품 한 장면`,
      channel: "instagram",
      priority: "이번 달",
    },
  ];

  const whyWrite = [
    {
      topic,
      reason: intent.userIntent || `${topic} — 독자 검색 의도에 답하기`,
      outcome: intent.readerOutcome || "방문·구매·문의 전환에 도움이 되는 정보",
    },
    {
      topic: `${brand} 브랜드 신뢰`,
      reason: "지역·매장 팩트를 쌓아 검색·플레이스 신뢰를 높이기",
      outcome: "브랜드명·지역명과 함께 기억되는 콘텐츠",
    },
  ];

  const researchMustKnow = [];
  if (/꽃|플라워/.test(`${industry} ${topic}`)) {
    researchMustKnow.push(
      "시즌 꽃 이름 3종 이상",
      "꽃별 특징·선물 용도",
      "보관·관리 방법",
      "매장 운영 방식(무인·가격·픽업)"
    );
  } else if (industry === "furniture") {
    researchMustKnow.push(
      "체험 포인트(앉기·조절·소재)",
      "비교 기준 2가지",
      "사용 상황(거실·다이닝·이사)",
      "배송·A/S 조건"
    );
  } else if (industry === "cafe" || industry === "tea_cafe") {
    researchMustKnow.push("대표 메뉴", "분위기·좌석", "방문 이유");
  } else {
    researchMustKnow.push(
      "브랜드·매장 차별점",
      "지역 연관성",
      "주제 핵심 팩트 3개"
    );
  }

  return {
    version: BRAND_CONTENT_OS_VERSION,
    month: monthLabel(),
    brand,
    region,
    industry,
    primaryTopic: topic,
    intent: {
      locked: intent.locked,
      label: intent.label,
      userIntent: intent.userIntent,
    },
    whatToWrite,
    whyWrite,
    researchMustKnow,
    operatingHeadline: `${monthLabel()} ${brand} 블로그 운영안 — ${topic}`,
    userValueStatement: BRICLOG_VISION.userValue,
  };
}

export function formatContentOperatingPlanBrief(plan = {}) {
  if (!plan?.primaryTopic) return "";
  return [
    "【BRICLOG Brand Content OS — 운영 기획 (글 아님)】",
    plan.operatingHeadline,
    "",
    "■ 무엇을 쓸지",
    ...plan.whatToWrite.map(
      (w) => `- [${w.priority}] ${w.channel}: ${w.topic}`
    ),
    "",
    "■ 왜 쓸지",
    ...plan.whyWrite.map((w) => `- ${w.topic}: ${w.reason} → ${w.outcome}`),
    "",
    "■ 조사해야 할 것",
    ...plan.researchMustKnow.map((r) => `- ${r}`),
    "",
    "글은 기획·조사·설명이 끝난 뒤 마지막에 쓴다.",
  ].join("\n");
}

/**
 * Brand Content OS 통합 품질 — 기획·조사·설명·글·검수
 */
export function assessBrandContentOSQuality(pack, input = {}, opts = {}) {
  const plan = opts.plan || buildContentOperatingPlan(input);
  const dossier = opts.dossier || input.researchFirstDossier || null;

  const planningScore =
    plan.whatToWrite?.length >= 2 &&
    plan.whyWrite?.length >= 1 &&
    plan.researchMustKnow?.length >= 3
      ? 1
      : 0.5;

  const researchRate = dossier?.writable
    ? Math.min(
        1,
        (dossier.organized?.coveredCount || 0) /
          Math.max(dossier.checklist?.length || 1, 3)
      )
    : 0.35;

  const explain = assessExplainQuality(pack, input);
  const evaluation = assessContentEvaluation(pack, input);
  const full = getBlogFullText(pack);
  const writingScore =
    full.length >= 200 && (pack.sections?.length || 0) >= 2 ? 1 : 0.4;
  const reviewScore =
    evaluation.pass && explain.hollow === 0 && explain.keywordLeaks === 0
      ? 1
      : evaluation.pass
        ? 0.7
        : 0.3;

  const breakdown = {
    planning: Math.round(BRAND_CONTENT_OS_KPI.planning * planningScore),
    research: Math.round(BRAND_CONTENT_OS_KPI.research * researchRate),
    explain: Math.round(BRAND_CONTENT_OS_KPI.explain * explain.rate),
    writing: Math.round(BRAND_CONTENT_OS_KPI.writing * writingScore),
    review: Math.round(BRAND_CONTENT_OS_KPI.review * reviewScore),
  };

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const pass = score >= 85 && explain.ok && (!dossier || dossier.writable);

  return {
    version: BRAND_CONTENT_OS_VERSION,
    vision: BRICLOG_VISION.identity,
    score,
    pass,
    breakdown,
    weights: BRAND_CONTENT_OS_KPI,
    phases: BRAND_CONTENT_OS_PHASES,
    plan,
    dossier,
    explain,
    evaluation,
    shouldWithhold: !pass && isBrandContentOSEnforced(),
    userDeliverable: plan.operatingHeadline,
  };
}

export function stampBrandContentOSOnInput(input = {}) {
  const plan = buildContentOperatingPlan(input);
  const brief = formatContentOperatingPlanBrief(plan);
  return {
    ...input,
    brandContentOS: true,
    contentOperatingPlan: plan,
    contentOperatingPlanBrief: brief,
    pipelineBrief: [brief, input.researchFirstBrief, input.researchBrief]
      .filter(Boolean)
      .join("\n\n"),
  };
}

export function getPublicBrandContentOSVision() {
  return {
    identity: BRICLOG_VISION.identity,
    tagline: BRICLOG_VISION.tagline,
    userValue: BRICLOG_VISION.userValue,
    kpi: BRAND_CONTENT_OS_KPI,
    phases: BRAND_CONTENT_OS_PHASES.map((p) => p.label),
  };
}
