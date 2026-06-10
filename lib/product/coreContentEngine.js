/**
 * BRICLOG Core Content Engine — 정보 밀도 우선, 반복·허구·업종 오염 차단
 * 특정 사례 금지어가 아니라 전역 생성·감사 SSOT
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { detectExcessiveRepetition } from "@/lib/content/repetitionEngine";
import { detectDuplicateKillerIssues } from "@/lib/content/duplicateKillerEngine";
import { detectIndustryCrossContamination } from "@/lib/pipeline/v2/industryLock";
import { resolveBriclogIndustryKey } from "@/lib/product/industryContextEngine";
import { detectContentIntent } from "@/lib/pipeline/v2/intentDetection";
import {
  isInformationalTopicInput,
  isVisitReviewTopicInput,
  prefersVisitExperienceTone,
} from "@/lib/content/topicFacetEngine";
import { deriveTopicWritingContext, topicRaw } from "@/lib/content/topicFacetEngine";
import {
  applyVisitReviewTopicPackGate,
  detectVisitReviewTemplateContamination,
  rebuildVisitReviewAccuratePack,
} from "@/lib/content/visitReviewTopicGate";
import { inferPublishPurpose } from "@/lib/content/publishPurposeEngine";
import { isFlowerRecommendationTopic } from "@/lib/product/flowerRecommendationProseEngine";
import { shouldForceMissionProseOnlyPath } from "@/lib/product/missionProseRouteFlags";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { applyInformationalTopicPackGate } from "@/lib/content/informationalTopicPackGate";
import { koreanObjectParticle } from "@/lib/prompts/engine/textUtils";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { assessTopicCoverage } from "@/lib/evolution/topicCoverageEngine";
import { SELF_EVOLUTION_VERSION } from "@/lib/evolution/evolutionConstants";
import { assertContextLockPostWrite } from "@/lib/content/contextLockEngine";

export const CORE_ENGINE_VERSION = "v2";
/** 본문 최소 정보 단위 — 미만이면 짧은 안내형 */
export const MIN_BODY_INFORMATION_UNITS = 8;
/** 생성 전 5항목 체크리스트 — 3개 미만이면 본문 생성 금지 */
export const MIN_PRE_WRITE_CHECKLIST = 3;
/** 제품·서비스·브랜드·행사 — 9축 중 5개 미만이면 발행 불가 */
export const MIN_SUBJECT_MATTER_DIMENSIONS = 5;
/** 독자가 새롭게 알게 되는 정보 — 발행 가능 최소 */
export const MIN_READER_LEARNINGS = 5;

const PRE_WRITE_CHECKLIST = [
  { id: "real_information", label: "소재 실제 정보" },
  { id: "brand_reflected", label: "브랜드 정보" },
  { id: "product_reflected", label: "제품·서비스 정보" },
  { id: "consumer_questions", label: "소비자 궁금" },
  { id: "search_intent", label: "검색 의도" },
];

const SUBJECT_MATTER_DIMENSIONS = [
  { id: "what", label: "무엇인가", patterns: [/무엇|정의|개요|이란|소개|종류|역할/] },
  { id: "features", label: "특징", patterns: [/특징|구성|성분|재료|스펙|옵션|메뉴/] },
  { id: "advantages", label: "장점", patterns: [/장점|강점|메리트|좋은\s*점|이유/] },
  { id: "differences", label: "차이점", patterns: [/차이|다른\s*점|비교|대비|vs/] },
  { id: "selection", label: "선택 기준", patterns: [/선택|고르|기준|포인트|체크|비교/] },
  { id: "target", label: "대상 고객", patterns: [/대상|추천|누구|고객|가정|반려|선물/] },
  { id: "usage", label: "활용 방법", patterns: [/활용|이용|사용|먹|보관|방문|예약|적용/] },
  { id: "caution", label: "주의 사항", patterns: [/주의|유의|알레르|금기|확인|조건/] },
  { id: "related", label: "관련 정보", patterns: [/관련|추가|문의|일정|위치|영업|배송|연락/] },
];

const STRUCTURED_SUBJECT_RE =
  /제품|상품|서비스|브랜드|행사|이벤트|소개|프레임|간식|침대|매트리스|마케팅|대행|업체/;

export const FICTION_EXPERIENCE_RES = [
  /직접\s*다녀/,
  /직접\s*먹어/,
  /직접\s*상담/,
  /매장에서\s*들었/,
  /직원이\s*설명/,
  /고객이\s*말했/,
  /후기가\s*있었/,
  /구매했/,
  /체험했/,
  /만족했/,
  /누워보니/,
  /쇼룸에서/,
  /솔직\s*후기/,
  /다녀온\s*이야기/,
  /가보니까/,
  /들으며\s*메모/,
  /현장에서\s*직접/,
];

export const PADDING_PATTERN_RES = [
  /당일\s*상담\s*메모\s*\d+/,
  /확인해\s*확인해/,
  /둘러확인해/,
  /포인트를\s*따로\s*적어/,
  /향와|질감와|성분와/,
  /번째로\s*다시\s*확인/,
  /메모를\s*보강/,
  /비교에\s*도움이\s*됐/,
];

const NUMBERED_PAD_RE = /(?:메모|확인|포인트)\s*\d+/;

function paragraphInfoKey(text = "") {
  return String(text || "")
    .replace(/\d+/g, "#")
    .replace(/\s/g, "")
    .slice(0, 48);
}

export function isStructuredSubjectTopic(input = {}) {
  const blob = [
    input.topic,
    input.mainKeyword,
    input.purposeType,
    input.purpose,
    input.industry,
    input.industryLabel,
  ]
    .filter(Boolean)
    .join(" ");
  return STRUCTURED_SUBJECT_RE.test(blob);
}

function collectResearchAndInputBlob(input = {}, pack = null) {
  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  const factText = facts.map((f) => String(f?.fact || f || "")).join("\n");
  const include = String(input.includePhrases || "").trim();
  const body = pack ? getBlogFullText(pack) : "";
  return [factText, include, body, input.brandContentBrief, input.customerQuestionBrief]
    .filter(Boolean)
    .join("\n");
}

/** PRIMARY DIRECTIVE — 생성 전 5항목 체크 */
export function scorePreWriteChecklist(input = {}, ctx = {}) {
  const brand = String(input.brandName || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  const factCount = facts.length;
  const includeLen = String(input.includePhrases || "").replace(/\s/g, "").length;

  const intent = detectContentIntent(
    {
      topic,
      mainKeyword: input.mainKeyword,
      includeList: String(input.includePhrases || "").split(/[,，]/),
      purposeType: input.purposeType || input.purpose,
      brandName: brand,
    },
    ctx
  );

  const checks = [
    {
      id: "real_information",
      ok:
        factCount >= 2 ||
        (input.informationUnits?.unitCount ?? 0) >= 3 ||
        Boolean(input.knowledgeExpansionReady) ||
        includeLen >= 12,
    },
    {
      id: "brand_reflected",
      ok:
        Boolean(brand) &&
        (Boolean(input.brandProfile) ||
          Boolean(input.brandMemory?.length) ||
          Boolean(input.brandContentBrief) ||
          brand.length >= 2),
    },
    {
      id: "product_reflected",
      ok:
        /제품|상품|메뉴|서비스|프레임|간식|침대|행사|이벤트/.test(topic) ||
        facts.some((f) =>
          /제품|상품|구성|성분|특징|서비스|행사|이벤트/.test(String(f?.fact || f || ""))
        ) ||
        includeLen >= 8,
    },
    {
      id: "consumer_questions",
      ok:
        (input.customerQuestionMap?.questions?.length ?? 0) >= 2 ||
        Boolean(input.customerQuestionBrief) ||
        (input.customerQuestionMap?.items?.length ?? 0) >= 2,
    },
    {
      id: "search_intent",
      ok: Boolean(intent.ok && intent.userIntent),
    },
  ];

  const passed = checks.filter((c) => c.ok).length;
  return {
    checks: checks.map((c, i) => ({ ...PRE_WRITE_CHECKLIST[i], ...c })),
    passed,
    total: PRE_WRITE_CHECKLIST.length,
    ok: passed >= MIN_PRE_WRITE_CHECKLIST,
  };
}

/** 제품·서비스·브랜드·행사 — 9축 정보 확보 */
export function assessSubjectMatterCoverage(input = {}, ctx = {}, pack = null) {
  const required = isStructuredSubjectTopic(input);
  const blob = collectResearchAndInputBlob(input, pack);
  const covered = [];
  for (const dim of SUBJECT_MATTER_DIMENSIONS) {
    if (dim.patterns.some((re) => re.test(blob))) covered.push(dim.id);
  }
  const count = covered.length;
  return {
    required,
    covered,
    count,
    total: SUBJECT_MATTER_DIMENSIONS.length,
    ok: !required || count >= MIN_SUBJECT_MATTER_DIMENSIONS,
    dimensions: SUBJECT_MATTER_DIMENSIONS.map((d) => ({
      ...d,
      covered: covered.includes(d.id),
    })),
  };
}

/** 생성 전 — 3항목 미만이면 본문 생성 금지 */
export function assertPrimaryDirectivePreWrite(input = {}, ctx = {}) {
  const checklist = scorePreWriteChecklist(input, ctx);
  const reasons = [];
  if (!checklist.ok) reasons.push("primary_checklist_insufficient");
  return {
    ok: reasons.length === 0,
    checklist,
    reasons,
    userMessage:
      reasons.length > 0
        ? "발행에 필요한 정보가 아직 부족합니다. 조사를 더 진행한 뒤 글을 작성합니다."
        : null,
  };
}

/** 독자가 새롭게 알게 되는 정보 개수 */
export function countReaderLearnings(pack, input = {}) {
  return countBodyInformationUnits(pack, input);
}

/**
 * 최종 출력 전 질문: 수정 없이 바로 발행 가능한가?
 */
export function assessPublishWithoutEditing(pack, input = {}, ctx = {}) {
  const violations = detectCoreViolations(pack, input, ctx);
  const learnings = countReaderLearnings(pack, input);
  const subjectMatter = assessSubjectMatterCoverage(input, ctx, pack);
  const reasons = [];

  const hardCodes = new Set([
    "padding_pattern",
    "numbered_pad",
    "fiction_experience",
    "repetition",
    "duplicate",
    "industry_cross",
    "context_lock_foreign_industry_term",
    "context_lock_low_content_relevance",
    "context_lock_brand_not_in_opening",
    "context_lock_business_role_unclear",
    "context_lock_foreign_industry_in_opening",
  ]);
  for (const issue of violations.issues) {
    if (hardCodes.has(issue.code)) reasons.push(issue.code);
  }

  if (subjectMatter.required && !subjectMatter.ok) {
    reasons.push("subject_matter_insufficient");
  }

  const minLearnings = subjectMatter.required
    ? MIN_READER_LEARNINGS
    : Math.min(MIN_READER_LEARNINGS, 4);
  if (learnings < minLearnings) {
    reasons.push("low_reader_learnings");
  }

  if (!violations.ok && violations.issues.some((i) => i.code === "low_information_yield")) {
    reasons.push("low_information_yield");
  }

  const topicCoverage = assessTopicCoverage(pack, input);
  if (!topicCoverage.ok) {
    reasons.push("topic_coverage_gap");
  }

  const brandClarity = violations.contextLock?.clarity;
  if (brandClarity && !brandClarity.ok) {
    reasons.push(...brandClarity.reasons);
  }

  const publishReady = reasons.length === 0;
  return {
    ok: publishReady,
    publishReady,
    reasons: [...new Set(reasons)],
    learnings,
    minLearnings,
    violations,
    subjectMatter,
    topicCoverage,
    brandClarity,
    contextLock: violations.contextLock,
    question: brandClarity?.question ||
      "사용자가 이 글을 수정 없이 바로 발행할 수 있는가?",
    answer: publishReady ? "YES" : "NO",
  };
}

export function allowsFictionalExperience(input = {}) {
  if (isInformationalTopicInput(input)) return false;
  const intent = detectContentIntent(
    {
      topic: input.topic || input.mainKeyword,
      includeList: String(input.includePhrases || "").split(/[,，]/),
      purposeType: input.purposeType || input.purpose,
    },
    input
  );
  return intent.locked === "visit_review";
}

/** §9 생성 전 설계 스냅샷 */
export function buildCoreContentDesign(input = {}, ctx = {}) {
  const p = deriveTopicWritingContext(input);
  const industryKey = resolveBriclogIndustryKey(input);
  const intent = detectContentIntent(
    {
      topic: p.topicRaw,
      includeList: String(input.includePhrases || "").split(/[,，]/),
      purposeType: input.purposeType || input.purpose,
    },
    ctx
  );
  const purpose = inferPublishPurpose(input);
  const informational = isInformationalTopicInput(input);
  const fictionAllowed = allowsFictionalExperience(input);

  const readerQuestions = informational
    ? [
        `${p.topicRaw || p.topicFacet}가 무엇인지`,
        `선택·비교 기준`,
        `보관·성분·주의사항`,
        `문의·확인 경로`,
      ]
    : [
        `${p.brand}이 어떤 곳인지`,
        `방문·이용 전 확인할 것`,
        `비용·일정·혜택`,
      ];

  return {
    version: CORE_ENGINE_VERSION,
    industry: industryKey,
    purpose: purpose.purpose,
    structure: purpose.structure,
    audience: purpose.brief?.slice(0, 120) || "검색 독자",
    searchIntent: intent.userIntent,
    readerOutcome: intent.readerOutcome,
    contentIntent: intent.locked,
    informational,
    fictionAllowed,
    readerQuestions,
    forbiddenSentenceTypes: [
      ...(fictionAllowed ? [] : ["허구 체험", "방문 후기"]),
      "당일 상담 메모 패딩",
      "숫자만 바뀌는 반복",
      "업종 불일치 표현",
    ],
    structureMode: informational
      ? "question_answer"
      : intent.locked === "visit_review"
        ? "experience_note"
        : "brand_intro",
  };
}

export function countBodyInformationUnits(pack, input = {}) {
  if (!pack?.sections?.length) return 0;
  const seen = new Set();
  let count = 0;
  const blocks = [
    ...(pack.sections || []).flatMap((s) =>
      String(s.body || "")
        .split(/\n\n+/)
        .map((p) => p.trim())
    ),
    String(pack.conclusion || "").trim(),
  ].filter((p) => p.replace(/\s/g, "").length >= 28);

  for (const para of blocks) {
    if (PADDING_PATTERN_RES.some((re) => re.test(para))) continue;
    if (!allowsFictionalExperience(input) && FICTION_EXPERIENCE_RES.some((re) => re.test(para))) {
      continue;
    }
    const key = paragraphInfoKey(para);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    count += 1;
  }
  return count;
}

export function detectCoreViolations(pack, input = {}, ctx = {}) {
  const full = getBlogFullText(pack);
  const issues = [];
  const industryKey = resolveBriclogIndustryKey(input);

  for (const re of PADDING_PATTERN_RES) {
    if (re.test(full)) issues.push({ code: "padding_pattern", pattern: re.source });
  }
  if (NUMBERED_PAD_RE.test(full)) {
    issues.push({ code: "numbered_pad" });
  }

  if (!allowsFictionalExperience(input) && !prefersVisitExperienceTone(input)) {
    for (const re of FICTION_EXPERIENCE_RES) {
      if (re.test(full)) issues.push({ code: "fiction_experience", pattern: re.source });
    }
  }

  const repetition = detectExcessiveRepetition(full, { maxPhrase: 2, maxParagraphDup: 3 });
  if (!repetition.ok) {
    issues.push({ code: "repetition", detail: repetition.issues?.[0] });
  }

  const dup = detectDuplicateKillerIssues(full);
  if (!dup.ok) {
    issues.push({ code: "duplicate", detail: dup.issues?.[0] });
  }

  const industry = detectIndustryCrossContamination(full, industryKey);
  if (!industry.ok) {
    issues.push({
      code: "industry_cross",
      detail: industry.violations?.[0],
    });
  }

  const infoUnits = countBodyInformationUnits(pack, input);
  if (infoUnits < MIN_BODY_INFORMATION_UNITS) {
    issues.push({ code: "low_info_units", count: infoUnits });
  }

  const yieldScore = scoreInformationYield(full, { ...ctx, input }, "blog");
  if (!yieldScore.ok) {
    issues.push({ code: "low_information_yield", score: yieldScore.score });
  }

  const contextLock = assertContextLockPostWrite(pack, input);
  if (!contextLock.ok) {
    for (const code of contextLock.reasons) {
      issues.push({ code: `context_lock_${code}`, detail: contextLock });
    }
  }

  const visitTemplate = detectVisitReviewTemplateContamination(pack, input);
  if (!visitTemplate.ok) {
    issues.push({
      code: "visit_review_template_contamination",
      detail: visitTemplate.violations?.[0],
    });
  }

  return {
    ok: issues.length === 0,
    issues,
    infoUnits,
    informationYield: yieldScore.score,
    industryKey,
    contextLock,
  };
}

function filterParagraph(text = "", input = {}) {
  const t = String(text || "").trim();
  if (!t) return "";
  if (PADDING_PATTERN_RES.some((re) => re.test(t))) return "";
  if (NUMBERED_PAD_RE.test(t)) return "";
  if (!allowsFictionalExperience(input) && FICTION_EXPERIENCE_RES.some((re) => re.test(t))) {
    return "";
  }
  const industryKey = resolveBriclogIndustryKey(input);
  if (!detectIndustryCrossContamination(t, industryKey).ok) return "";
  return t;
}

function dedupeParagraphs(paragraphs = []) {
  const seen = new Set();
  const out = [];
  for (const para of paragraphs) {
    const key = paragraphInfoKey(para);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(para);
  }
  return out;
}

function buildQuestionLedParagraphs(input = {}, need = 4) {
  const p = deriveTopicWritingContext(input);
  const subject = topicRaw(input) || p.topicFacet || "안내";
  const obj = koreanObjectParticle(subject);
  const pool = [
    `${subject}를 찾을 때 가장 먼저 확인할 것은 성분·원재료·보관 방법입니다.`,
    `${p.brand} ${subject} — 공식 안내 기준으로 조건·구성을 비교할 수 있습니다.`,
    `선물·가정·반려 등 용도에 따라 ${subject}${obj} 달라질 수 있어요.`,
    `유통기한·냉장 여부는 제품 라벨을 먼저 확인하는 편이 좋습니다.`,
    `비슷한 ${subject}를 비교할 때는 원재료 비율과 첨가물 표기를 나란히 보면 수월합니다.`,
    `${p.regionBit}${p.brand} 문의 시 알레르기·성분 표기를 요청할 수 있습니다.`,
    `처음 ${subject}를 고를 때는 용도와 보관 환경부터 정리해 두면 선택이 빨라집니다.`,
    `궁금한 점은 매장·공식 채널 문의로 확인하는 것이 가장 정확합니다.`,
  ];
  return pool.slice(0, Math.max(need, 2));
}

function rebuildShortAccuratePack(pack, input = {}) {
  const p = deriveTopicWritingContext(input);
  const subject = topicRaw(input) || p.topicFacet || "안내";
  const title = `${p.regionBit}${p.brand} ${subject}`.replace(/\s+/g, " ").trim();
  const qa = buildQuestionLedParagraphs(input, 6);
  const sections = [
    {
      heading: `${subject}, 알아보게 된 이유`,
      body: qa.slice(0, 2).join("\n\n"),
    },
    {
      heading: `${subject} 고를 때 체크 포인트`,
      body: qa.slice(2, 4).join("\n\n"),
    },
    {
      heading: `${p.brand}에서 확인할 것`,
      body: qa.slice(4, 6).join("\n\n"),
    },
  ].map((sec) => ({
    ...sec,
    body: dedupeParagraphs(
      sec.body
        .split(/\n\n+/)
        .map((para) => filterParagraph(para, input))
        .filter(Boolean)
    ).join("\n\n"),
  }));

  return {
    ...pack,
    title,
    representativeTitle: title,
    sections,
    conclusion:
      filterParagraph(
        `${p.regionBit}${p.brand} ${subject} — 확인 가능한 정보만 기준으로 삼고, 궁금한 점은 공식 문의로 확인하시면 됩니다.`,
        input
      ) ||
      `${p.regionBit}${p.brand} ${subject} 안내 — 공식 채널로 추가 확인을 권장합니다.`,
    hashtags: [],
  };
}

function stripViolatingContent(pack, input = {}) {
  const sections = (pack.sections || []).map((sec) => {
    const paras = String(sec.body || "")
      .split(/\n\n+/)
      .map((p) => filterParagraph(p, input))
      .filter(Boolean);
    let heading = String(sec.heading || "").trim();
    if (/직접\s*다녀온|솔직\s*후기|당일\s*상담/.test(heading)) {
      heading = `${topicRaw(input) || "안내"} 정리`;
    }
    return { ...sec, heading, body: dedupeParagraphs(paras).join("\n\n").trim() };
  });
  const conclusion = filterParagraph(pack.conclusion, input);
  return { ...pack, sections, conclusion: conclusion || pack.conclusion };
}

export function shouldSuppressLengthTopoff(pack, input = {}) {
  if (isInformationalTopicInput(input)) return true;
  if (isFlowerRecommendationTopic(input) || shouldForceMissionProseOnlyPath(input)) return true;
  const audit = detectCoreViolations(pack, input);
  if (audit.infoUnits < MIN_BODY_INFORMATION_UNITS) return true;
  if (prefersVisitExperienceTone(input)) return false;
  if (!audit.ok) return true;
  if (!allowsFictionalExperience(input)) return true;
  return false;
}

/**
 * 생성 후 품질 감사 + 구조 재설계 (패딩·허구·업종 오염 제거)
 */
export function applyCoreContentEngineGate(pack, input = {}, ctx = {}) {
  if (!pack?.sections?.length) return pack;

  const design = buildCoreContentDesign(input, ctx);
  let next = stripViolatingContent(pack, input);
  let audit = detectCoreViolations(next, input, ctx);
  let publishAudit = assessPublishWithoutEditing(next, input, ctx);

  const needsShort =
    audit.infoUnits < MIN_BODY_INFORMATION_UNITS ||
    !publishAudit.publishReady ||
    audit.issues.some((i) =>
      ["padding_pattern", "fiction_experience", "industry_cross", "numbered_pad"].includes(
        i.code
      )
    );

  if (needsShort) {
    if (isInformationalTopicInput(input)) {
      next = applyInformationalTopicPackGate(next, input);
    } else if (isVisitReviewTopicInput(input)) {
      next = rebuildVisitReviewAccuratePack(next, input);
    } else if (!allowsFictionalExperience(input)) {
      next = applyInformationalTopicPackGate(next, input);
    } else {
      next = rebuildShortAccuratePack(next, input);
    }
    audit = detectCoreViolations(next, input, ctx);
    publishAudit = assessPublishWithoutEditing(next, input, ctx);
  }

  if (
    !publishAudit.publishReady &&
    (publishAudit.reasons.some((r) => ["repetition", "duplicate"].includes(r)) ||
      audit.issues.some((i) => i.code === "repetition" || i.code === "duplicate"))
  ) {
    if (isVisitReviewTopicInput(input)) {
      next = rebuildVisitReviewAccuratePack(next, input);
    } else if (isInformationalTopicInput(input)) {
      next = applyInformationalTopicPackGate(next, input);
    } else {
      next = rebuildShortAccuratePack(next, input);
    }
    audit = detectCoreViolations(next, input, ctx);
    publishAudit = assessPublishWithoutEditing(next, input, ctx);
  }

  if (isVisitReviewTopicInput(input)) {
    next = applyVisitReviewTopicPackGate(next, input);
    audit = detectCoreViolations(next, input, ctx);
    publishAudit = assessPublishWithoutEditing(next, input, ctx);
  }

  const densityFirst =
    needsShort ||
    audit.infoUnits < MIN_BODY_INFORMATION_UNITS ||
    !publishAudit.publishReady;

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      coreEngineVersion: CORE_ENGINE_VERSION,
      coreContentDesign: design,
      coreEngineAudit: audit,
      primaryDirective: {
        publishAudit,
        preWriteChecklist: scorePreWriteChecklist(input, ctx),
        subjectMatter: publishAudit.subjectMatter,
        topicCoverage: publishAudit.topicCoverage,
        readerLearnings: publishAudit.learnings,
        publishReady: publishAudit.publishReady,
        publishQuestion: publishAudit.question,
        publishAnswer: publishAudit.answer,
      },
      selfEvolutionVersion: SELF_EVOLUTION_VERSION,
      densityFirst,
      publishReady: publishAudit.publishReady,
      lengthTierMet: true,
      missionProseTierOk: true,
      fictionAllowed: design.fictionAllowed,
      passOutput: publishAudit.publishReady,
    },
  };
}
