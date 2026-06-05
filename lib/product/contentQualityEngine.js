/**
 * BRICLOG CONTENT QUALITY ENGINE — SSOT
 * 정보 부족 시 작성 금지 · 상식 검증 · 휴먼 에디터 · 최종 「사람 에디터가 썼는가」
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";
import { assertKnowledgeExpansionReady } from "@/lib/content/knowledgeExpansionEngine";
import { assessResearchSufficiencyForWrite } from "@/lib/content/researchSufficiencyGate";
import { MIN_INFORMATION_UNITS } from "@/lib/content/informationUnitEngine";
import {
  INFORMATION_UNIT_RANGE,
  HUMAN_DUPLICATE_POLICY,
  MASTER_FINAL_REVIEW,
} from "@/lib/product/briclogUltimateV20";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { evaluateContentQualityRoot } from "@/lib/quality/contentQualityRoot";
import {
  scoreHumanityCommonSense,
  detectForcedEntityStacking,
  detectSentenceStructureOveruse,
  detectIndustryCommonSenseViolations,
  detectRegionCommonSenseViolations,
} from "@/lib/product/humanityCommonSenseEngine";
import { scoreHumanBelief } from "@/lib/product/humanBeliefEngine";
import {
  scoreEditorV95,
  buildEditorV95PromptBlock,
} from "@/lib/product/briclogEditorEngineV95";
import { scorePersonaEngineAlignment } from "@/lib/persona/personaEngineProfile";
import { countTokenMentions } from "@/lib/product/antiSeoSpamEngine";
import { titleContext } from "@/lib/content/humanTitleEngine";
import { mapIndustryEmojiKey } from "@/lib/emoji/emojiEngine";
import { resolveResearchCategoryKey } from "@/lib/research/searchExpansionEngine";
import {
  evaluateResearchWriteGate,
  formatCustomerResearchBlockMessage,
  formatCustomerResearchProgressMessage,
  hasCompletedResearchStep as isResearchStepComplete,
} from "@/lib/product/researchReadiness";

export const CONTENT_QUALITY_VERSION = "v1";

export const CONTENT_QUALITY_BRIEF = `브릭로그는 정보가 부족한 상태에서 절대 글을 작성하지 않는다.
최소 ${INFORMATION_UNIT_RANGE.min}개 이상의 고유 정보 단위를 확보한 뒤 에디터 작성에 들어간다.
정보 부족 시 Gemini·Naver·공식 홈페이지·FAQ·리뷰 조사를 추가 수행한다.
상식: 업종·지역·브랜드·주제와 맞지 않는 정보 출력 금지.
휴먼 에디터: SEO 문장·억지 키워드 나열 금지 — 사람이 실제 경험한 것처럼.
동일 문장 구조 3회 이상·동일 의미·동일 정보 반복 금지.
목표는 글자수가 아니라 정보량과 읽는 재미다.
최종 검수: 「이 글이 사람 에디터가 작성한 것 같은가」 — NO 재작성, YES 출력.`;

export const SUPPLEMENTAL_RESEARCH_SOURCES = [
  { id: "gemini", label: "Gemini 조사", role: "research" },
  { id: "naver", label: "Naver 조사", role: "local" },
  { id: "official", label: "공식 홈페이지 조사", role: "brand_official" },
  { id: "faq", label: "FAQ 조사", role: "faq" },
  { id: "reviews", label: "리뷰 조사", role: "reviews" },
];

const SEO_SENTENCE_RES = [
  /업체\s*소개/,
  /소개합니다\s*$/,
  /검색\s*(?:최적|유리|노출)/,
  /키워드\s*(?:반복|삽입|밀도)/,
  /SEO\s*(?:점수|최적)/,
  /메타\s*설명/,
];

function resolveTopicSenseKey(input = {}) {
  const blob = `${input.topic || ""} ${input.mainKeyword || ""} ${input.industry || ""}`.toLowerCase();
  if (/반려|펫|애견|강아지|고양이|간식/.test(blob)) return "pet";
  if (/꽃|플라워|화환|다발/.test(blob)) return "flower";
  if (/카페|커피|브런치|베이커리/.test(blob)) return "cafe";
  if (/병원|치과|진료|검진|임플란/.test(blob)) return "hospital";
  if (/가구|침대|매트리스|모션/.test(blob)) return "furniture";
  return mapIndustryEmojiKey(input) || resolveResearchCategoryKey(input) || "default";
}

/**
 * 주제·업종 상식 — humanity 업종 검사에 주제 키 우선 적용
 */
export function detectTopicCommonSenseViolations(fullText = "", input = {}) {
  const topicKey = resolveTopicSenseKey(input);
  if (!topicKey || topicKey === "default") {
    return { ok: true, topicKey, issues: [] };
  }
  return {
    ...detectIndustryCommonSenseViolations(fullText, {
      ...input,
      industryKey: topicKey,
    }),
    topicKey,
  };
}

/**
 * 브랜드 무관·과도 이탈 — 브랜드명이 있는데 본문에 거의 없음
 */
export function detectBrandRelevanceViolations(fullText = "", input = {}) {
  const brand = String(input.brandName || "").trim();
  if (!brand || brand.length < 2) return { ok: true, issues: [] };
  const norm = fullText.replace(/\s/g, "");
  const brandNorm = brand.replace(/\s/g, "");
  const count = brandNorm.length >= 2 ? (norm.split(brandNorm).length - 1) : 0;
  const issues = [];
  if (norm.length > 400 && count === 0) {
    issues.push({ type: "brand_absent", brand });
  }
  const { brand: ctxBrand } = titleContext({}, input);
  if (ctxBrand && count >= 6) {
    issues.push({ type: "brand_over_repeat", count });
  }
  return { ok: issues.length === 0, issues, mentionCount: count };
}

export function detectSeoSentenceSmell(fullText = "") {
  const issues = [];
  for (const re of SEO_SENTENCE_RES) {
    if (re.test(fullText)) issues.push({ type: "seo_sentence", pattern: re.source });
  }
  return { ok: issues.length === 0, issues };
}

export function detectDuplicateContentViolations(fullText = "") {
  const issues = [];
  const structure = detectSentenceStructureOveruse(fullText);
  if (!structure.ok) issues.push(...structure.issues);

  if (hasDuplicateSentences(fullText, 18)) {
    issues.push({ type: "same_meaning_repeat" });
  }

  const exactDup =
    HUMAN_DUPLICATE_POLICY.forbidExactSentence &&
    /(.{24,}?)[.!?…]\s*\1/.test(fullText.replace(/\s+/g, " "));
  if (exactDup) issues.push({ type: "exact_sentence_repeat" });

  return { ok: issues.length === 0, issues, structure };
}

/**
 * 조사 부족 시 추가 수행할 조사 축
 */
export function buildSupplementalResearchPlan(input = {}, reasons = []) {
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();
  const plans = [];

  if (
    reasons.some((r) =>
      /insufficient_information|information_units|insufficient_coverage|insufficient_search|knowledge_expansion|research_facts_thin|research_status|topic_research|region_research|gemini/.test(
        String(r)
      )
    )
  ) {
    if (brand) plans.push({ source: "gemini", query: `${brand} ${topic} 공식·특징·차별` });
    if (region && brand) {
      plans.push({ source: "naver", query: `${region} ${brand} ${topic}` });
    }
    if (brand) plans.push({ source: "official", query: `${brand} 공식 홈페이지·안내` });
    plans.push({ source: "faq", query: topic ? `${topic} FAQ 자주 묻는 질문` : "FAQ" });
    plans.push({ source: "reviews", query: brand ? `${brand} 후기·체험` : `${topic} 리뷰` });
  }

  return {
    sources: SUPPLEMENTAL_RESEARCH_SOURCES.map((s) => s.id),
    plans: plans.slice(0, 8),
    /** @deprecated 내부 로그용 — UI에 쓰지 말 것 */
    internalMessage:
      plans.length > 0
        ? `supplemental:${plans.map((p) => p.source).join(",")}`
        : null,
    message: plans.length > 0 ? formatCustomerResearchProgressMessage() : null,
  };
}

/**
 * 작성 전 — 정보 단위·조사 충분성
 */
export function assertPreWriteContentQuality(input = {}) {
  if (!isBriclogMissionEnforced()) {
    return { ok: true, sufficient: true, reasons: [], stage: "pre_write" };
  }

  const writeGate = evaluateResearchWriteGate(
    input,
    input.v2AxisParsed,
    input.research
  );
  const research = assessResearchSufficiencyForWrite(
    input,
    input.v2AxisParsed,
    input.research
  );

  if (!writeGate.ok) {
    const supplemental = buildSupplementalResearchPlan(input, writeGate.reasons);
    return {
      ok: false,
      sufficient: false,
      reasons: writeGate.reasons,
      expansion: null,
      research,
      supplemental,
      userMessage: writeGate.userMessage,
      stage: "information_research",
    };
  }

  const researchDone = isResearchStepComplete(input);
  const expansion = researchDone
    ? {
        ok: true,
        skipped: true,
        clientVerified: true,
        reasons: [],
        unitCount: input.informationUnits?.unitCount ?? 0,
      }
    : assertKnowledgeExpansionReady(
        {
          brand: input.brandName,
          region: input.region,
          topicRaw: input.topic || input.mainKeyword,
          unitCount: input.informationUnits?.unitCount,
          coverageCount: input.knowledgeCoverage?.coverageCount,
          searchQueryCount: input.searchExpansion?.searchQueries?.length,
          informationUnits: input.informationUnits,
          knowledgeCoverage: input.knowledgeCoverage,
          searchExpansion: input.searchExpansion,
        },
        input
      );

  const reasons = expansion.ok ? research.reasons || [] : expansion.reasons || [];

  return {
    ok: true,
    sufficient: true,
    soft: writeGate.soft || research.soft,
    mode: writeGate.mode,
    reasons: [...new Set(reasons)],
    expansion,
    research,
    unitCount: expansion.unitCount ?? input.informationUnits?.unitCount ?? 0,
    minUnits: MIN_INFORMATION_UNITS,
    supplemental: buildSupplementalResearchPlan(input, []),
    userMessage: null,
    stage: "information_research",
  };
}

/**
 * 출력 전 — 콘텐츠 품질·휴먼 에디터 최종 검수
 */
export function scoreContentQuality(pack, ctx = {}, input = {}) {
  if (!isBriclogMissionEnforced()) {
    return {
      ok: true,
      score: 100,
      humanEditorPass: true,
      issues: [],
      checks: {},
    };
  }

  const evalInput = input || ctx.input || ctx;
  const full = getBlogFullText(pack);

  const humanity = scoreHumanityCommonSense(pack, ctx, evalInput);
  const root = evaluateContentQualityRoot(pack, { ...ctx, input: evalInput }, "blog");
  const topicSense = detectTopicCommonSenseViolations(full, evalInput);
  const industry = detectIndustryCommonSenseViolations(full, evalInput);
  const region = detectRegionCommonSenseViolations(full, evalInput);
  const brand = detectBrandRelevanceViolations(full, evalInput);
  const seo = detectSeoSentenceSmell(full);
  const dup = detectDuplicateContentViolations(full);
  const stack = detectForcedEntityStacking(pack, ctx, evalInput);
  const belief = scoreHumanBelief(full, evalInput, pack);
  const editorV95 = scoreEditorV95(pack, ctx, evalInput);
  const personaAlign = scorePersonaEngineAlignment(pack, evalInput);

  const { region: r, brand: b, topic: t } = titleContext(ctx, evalInput);
  const tokenSpam = [];
  if (r && countTokenMentions(full, r) > 5) tokenSpam.push("region");
  if (b && countTokenMentions(full, b) > 6) tokenSpam.push("brand");
  if (t && countTokenMentions(full, t) > 5) tokenSpam.push("topic");

  const issues = [
    ...humanity.issues,
    ...root.failures.map((f) => ({ type: "content_root", code: f })),
    ...topicSense.issues,
    ...industry.issues,
    ...region.issues,
    ...brand.issues,
    ...seo.issues,
    ...dup.issues,
    ...stack.issues,
    ...(tokenSpam.length ? [{ type: "entity_token_spam", tokens: tokenSpam }] : []),
    ...(belief.ok ? [] : belief.issues.map((i) => ({ type: "human_belief", code: i }))),
    ...(editorV95.editorPass ? [] : editorV95.issues.slice(0, 8)),
    ...(personaAlign.ok ? [] : personaAlign.issues.slice(0, 4)),
  ];

  let score = humanity.score;
  if (!root.ok) score -= 10;
  if (!topicSense.ok) score -= 22;
  if (!industry.ok) score -= 20;
  if (!region.ok) score -= 18;
  if (!brand.ok) score -= 8;
  if (!seo.ok) score -= 12;
  if (!dup.ok) score -= 14;
  if (!belief.ok) score -= 10;
  if (!editorV95.editorPass) score -= 12;
  if (!personaAlign.ok) score -= 14;
  if (tokenSpam.length) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const hardFail =
    !humanity.humanRead ||
    !topicSense.ok ||
    !industry.ok ||
    !region.ok ||
    !stack.ok ||
    !dup.ok ||
    !seo.ok ||
    !editorV95.editorPass ||
    !personaAlign.ok;

  const humanEditorPass =
    score >= 72 &&
    !hardFail &&
    belief.score >= 60 &&
    humanity.checks?.arc?.met >= 3 &&
    editorV95.editorPass &&
    personaAlign.ok;

  return {
    ok: humanEditorPass,
    score,
    humanEditorPass,
    humanReadLikely: humanity.humanRead,
    issues,
    checks: {
      humanity,
      root,
      topicSense,
      industry,
      region,
      brand,
      seo,
      duplicate: dup,
      stack,
      belief,
      editorV95,
      personaAlign,
      tokenSpam,
    },
    finalReview: MASTER_FINAL_REVIEW.map((r) => ({
      ...r,
      pass:
        r.id === "human_voice"
          ? humanEditorPass
          : r.id === "information_depth"
            ? humanity.checks?.variety?.ok !== false
            : r.id === "no_duplication"
              ? dup.ok
              : r.id === "no_ai_smell"
                ? seo.ok && belief.ok
                : null,
    })),
  };
}

export function assertContentQualityForOutput(pack, ctx = {}, input = {}) {
  const scored = scoreContentQuality(pack, ctx, input);
  return {
    ok: scored.humanEditorPass,
    passOutput: scored.humanEditorPass,
    score: scored.score,
    issues: scored.issues,
    userMessage: scored.humanEditorPass
      ? null
      : "사람 에디터가 쓴 것처럼 보이지 않아 다시 다듬었습니다. 잠시 후 다시 시도해 주세요.",
    contentQuality: scored,
  };
}

export function applyContentQualityMetaPass(pack, ctx = {}, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;
  const scored = scoreContentQuality(pack, ctx, input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      contentQuality: scored,
      humanEditorPass: scored.humanEditorPass,
      humanReadLikely: scored.humanReadLikely,
    },
  };
}

export function buildContentQualityPromptBlock() {
  const sources = SUPPLEMENTAL_RESEARCH_SOURCES.map((s) => s.label).join(" · ");
  return [
    "【CONTENT QUALITY ENGINE】",
    CONTENT_QUALITY_BRIEF,
    `정보 부족 시 추가 조사: ${sources}`,
    `중복 정책: 문장 유사 ${HUMAN_DUPLICATE_POLICY.similarityPercent}%+ · 동일 꼬리 ${HUMAN_DUPLICATE_POLICY.sameParagraphStructureMax}회+ 금지`,
    buildEditorV95PromptBlock(),
  ].join("\n");
}
