/**
 * CUSTOMER QUESTION ENGINE
 * 주제 설명 금지 — 검색자가 왜 찾는지 분석 후 6대 질문에 답하는 본문
 */
import { topicWritingFacet, topicRaw } from "@/lib/content/topicFacetEngine";
import { getBlogFullText } from "@/utils/qualityCheck";
import { detectContentIntent } from "@/lib/pipeline/v2/intentDetection";

export const CUSTOMER_QUESTION_STAGE_LABEL = "검색자 질문 분석 중…";

export const CUSTOMER_QUESTION_MIN_COVERAGE = 4;

export const CUSTOMER_QUESTION_WRITING_RULES = `【CUSTOMER QUESTION ENGINE】
- BRICLOG는 주제를 설명하지 않는다. 검색한 사람이 왜 찾는지 먼저 분석한 뒤 그 질문에 답한다.
- 백과사전·정의형·「~란?」·「~에 대해 알아보겠습니다」식 주제 소개로 시작 금지.
- 본문 흐름은 아래 6대 고객 질문(왜·누가·언제·비교·자주 묻는 질문·구매 전 실수)에 직접 답해야 한다.
- 주제 키워드 반복만으로 분량을 채우지 말 것.`;

/** @type {{ id: string, label: string, signals: RegExp[] }[]} */
export const CUSTOMER_QUESTION_DEFS = [
  {
    id: "why_search",
    label: "왜 찾는가",
    signals: [/왜|이유|목적|필요|고민|때문|원인|계기|상황|문제|해결/],
  },
  {
    id: "who_search",
    label: "누가 찾는가",
    signals: [/누구|대상|분들|처음|예비|기존|가족|부부|직장|부모|신혼|이사/],
  },
  {
    id: "when_search",
    label: "언제 찾는가",
    signals: [/언제|시기|때|전에|이후|상황|계절|행사|기간|이벤트|오픈|연휴/],
  },
  {
    id: "what_compare",
    label: "무엇을 비교하는가",
    signals: [/비교|차이|대안|선택|기준|vs|versus|어느|어떤\s*게|포인트/],
  },
  {
    id: "top_questions",
    label: "가장 많이 하는 질문",
    signals: [/궁금|질문|자주|묻|문의|FAQ|faq|\?|？/],
  },
  {
    id: "pre_purchase_mistakes",
    label: "구매 전 실수",
    signals: [/실수|놓치|확인|주의|전에|체크|후회|착각|오해|미리/],
  },
];

const TOPIC_DESCRIPTION_PATTERNS = [
  /(?:이란|란)\??\s*$/m,
  /에\s*대해\s*알아보/,
  /정의\s*하자면/,
  /개념\s*을\s*소개/,
  /특징\s*을\s*살펴보/,
  /주제\s*소개/,
  /~에\s*대한\s*정보/,
  /이\s*글에서는\s*.*(?:소개|설명)/,
];

function industryReaderPhrase(industry = "") {
  const i = String(industry || "").toLowerCase();
  if (/병원|의원|치과|한의/.test(i)) return "진료·예약을 앞둔 분";
  if (/꽃|플라워/.test(i)) return "선물·행사를 준비하는 분";
  if (/가구|침대|매트리스|모션/.test(i)) return "구매·체험을 검토하는 분";
  if (/saas|ai|플랫폼|마케팅|교육/.test(i)) return "도입·비교를 검토하는 담당자";
  return "선택·방문을 고민하는 분";
}

function pickFactSnippet(facts = [], axes = []) {
  for (const axis of axes) {
    const hit = facts.find((f) => f?.axis === axis && String(f?.fact || "").trim().length > 8);
    if (hit) return String(hit.fact).trim().slice(0, 120);
  }
  const any = facts.find((f) => String(f?.fact || "").trim().length > 8);
  return any ? String(any.fact).trim().slice(0, 120) : "";
}

function buildAnswerFor(id, ctx) {
  const {
    brand,
    region,
    topic,
    topicFull,
    industry,
    intent,
    factSnippet,
    promoLike,
  } = ctx;
  const regionBit = region ? `${region} ` : "";
  const brandBit = brand ? `${brand} ` : "";

  switch (id) {
    case "why_search":
      if (promoLike) {
        return `${regionBit}${brandBit}${topicFull || topic} 혜택·행사 조건을 실제로 비교하려고 검색합니다. 할인만 보고 지나치기보다 체험·구성·기간을 함께 확인하려는 목적입니다.`;
      }
      if (intent?.locked === "visit_review") {
        return `${regionBit}${brandBit} 방문 전에 분위기·체험 포인트·기대치를 맞추려고 검색합니다.`;
      }
      if (intent?.locked === "compare") {
        return `${topicFull || topic} 선택 시 기준·차이·대안을 정리하려고 검색합니다.`;
      }
      return `${regionBit}${brandBit}${topicFull || topic} 관련해서 지금 필요한 정보(조건·방법·차이)를 빠르게 확인하려고 검색합니다.${factSnippet ? ` (${factSnippet})` : ""}`;

    case "who_search":
      return `${industryReaderPhrase(industry)} — ${region ? `${region} 근처에서 ` : ""}${topicFull || topic}을(를) 처음 알아보거나, 다시 비교·예약·구매를 검토하는 검색자입니다.`;

    case "when_search":
      if (promoLike) {
        return `행사·할인 기간 전후, 주말 방문·예약 전, 이사·신혼·교체 시점처럼 결정 직전에 검색하는 경우가 많습니다.`;
      }
      return `방문·예약·구매·비교를 결정하기 직전, 또는 ${region ? `${region} ` : ""}근처 매장·서비스를 찾을 때 검색합니다.`;

    case "what_compare":
      return `${brand ? `${brand} ` : ""}${topicFull || topic}과(와) 다른 구성·가격·체험 방식·${region ? `${region} 접근성·` : ""}혜택 조건·A/S·예약 방식을 비교합니다.`;

    case "top_questions":
      return [
        `${region ? `${region} ` : ""}어디서 확인·체험·예약하나요?`,
        `${topicFull || topic} 조건·구성·기간은 어떻게 되나요?`,
        `${brand ? `${brand} ` : ""}다른 선택지와 무엇이 다른가요?`,
        `방문·구매 전에 꼭 확인할 것은 무엇인가요?`,
      ].join(" / ");

    case "pre_purchase_mistakes":
      return `할인·키워드만 보고 방문 동선·체험·구성·기간·예약 조건·설치·A/S를 놓치는 경우, ${region ? "타 지역 매장과 혼동하는 경우, " : ""}확인되지 않은 스펙·가격을 단정하는 경우가 흔합니다.`;

    default:
      return "";
  }
}

/**
 * @param {Record<string, unknown>} input
 * @param {{ researchFacts?: object[], research?: object, v3?: object }} [opts]
 */
export function buildCustomerQuestionAnalysis(input = {}, opts = {}) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topicFull = topicRaw(input) || String(input.topic || input.mainKeyword || "").trim();
  const topic = topicWritingFacet(input);
  const industry = String(input.industry || input.industryText || "").trim();
  const promoLike = /할인|행사|프로모|이벤트|특가|기간/.test(topicFull);

  const intent = detectContentIntent(
    {
      brandName: brand,
      region,
      topic: topicFull,
      mainKeyword: input.mainKeyword,
      purposeType: input.purpose,
      includeList: input.includePhrases
        ? String(input.includePhrases).split(/[,，]/)
        : [],
    },
    input
  );

  const facts = opts.researchFacts || input.researchFacts || [];
  const factSnippet = pickFactSnippet(facts, ["topic", "brand", "region"]);

  const answerCtx = {
    brand,
    region,
    topic,
    topicFull,
    industry,
    intent,
    factSnippet,
    promoLike,
  };

  const questions = CUSTOMER_QUESTION_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    answer: buildAnswerFor(def.id, answerCtx),
  }));

  return {
    ok: Boolean(topicFull || topic),
    topic: topicFull,
    topicFacet: topic,
    intent: intent.locked,
    questions,
    minAnswerDimensions: CUSTOMER_QUESTION_MIN_COVERAGE,
  };
}

export function formatCustomerQuestionBrief(analysis) {
  if (!analysis?.questions?.length) return "";
  const lines = [
    "【CUSTOMER QUESTION ENGINE — 작성 전 분석】",
    "주제 설명·정의형 서두 금지. 검색자 질문에 본문으로 답할 것.",
    "",
  ];
  analysis.questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.label}: ${q.answer}`);
  });
  lines.push("", CUSTOMER_QUESTION_WRITING_RULES);
  return lines.join("\n");
}

function answerTokens(answer = "") {
  return String(answer)
    .split(/[\s,，·/?？/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 10);
}

function dimensionAnswered(def, full, analysis) {
  if (def.signals.some((re) => re.test(full))) return true;
  const row = analysis?.questions?.find((q) => q.id === def.id);
  if (!row?.answer) return false;
  const tokens = answerTokens(row.answer);
  if (!tokens.length) return false;
  const hits = tokens.filter((t) => full.includes(t)).length;
  const need = tokens.length <= 2 ? 1 : 2;
  return hits >= need;
}

/**
 * @param {object} pack
 * @param {Record<string, unknown>} ctx
 */
export function evaluateCustomerQuestionDelivery(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const input = ctx.input || ctx;
  const analysis =
    input.customerQuestionMap ||
    ctx.customerQuestionMap ||
    buildCustomerQuestionAnalysis(input, {
      researchFacts: input.researchFacts || ctx.researchFacts,
    });

  if (!full.trim()) {
    return {
      ok: false,
      score: 0,
      coverage: 0,
      topicDescriptionOnly: false,
      reasons: ["customer_questions_missing"],
    };
  }

  const answered = CUSTOMER_QUESTION_DEFS.map((def) =>
    dimensionAnswered(def, full, analysis)
  );
  const coverage = answered.filter(Boolean).length;

  const topicDescriptionHits = TOPIC_DESCRIPTION_PATTERNS.filter((re) =>
    re.test(full)
  ).length;
  const definitionHeavy =
    (full.match(/(?:이란|란|정의|개념|소개합니다|알아보겠)/g) || []).length >= 3;
  const questionMarkers =
    (full.match(/[?？]|궁금|질문|왜 |누가 |언제 |비교|실수|확인/g) || []).length;

  const topicDescriptionOnly =
    (topicDescriptionHits >= 2 && coverage < 3) ||
    (definitionHeavy && questionMarkers < 4 && coverage < CUSTOMER_QUESTION_MIN_COVERAGE);

  const reasons = [];
  if (coverage < CUSTOMER_QUESTION_MIN_COVERAGE) {
    reasons.push("customer_questions_missing");
  }
  if (topicDescriptionOnly) {
    reasons.push("topic_description_only");
  }

  const ok = reasons.length === 0;
  const score = Math.round(
    Math.min(100, (coverage / CUSTOMER_QUESTION_DEFS.length) * 70 + (topicDescriptionOnly ? 0 : 30))
  );

  return {
    ok,
    score,
    coverage,
    topicDescriptionOnly,
    reasons,
    answered,
  };
}
