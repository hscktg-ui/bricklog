/**
 * 조사결과 검증 시스템 — 생성 전 메트릭 계산 · 기준 미달 시 생성 금지
 * 조사 → 검증 → 생성 → 감사 → 출력
 */
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { assessResearchDepth } from "@/lib/evolution/researchDepthEngine";
import { assessTopicCoverageFromText } from "@/lib/evolution/topicCoverageEngine";
import { isStructuredSubjectTopic } from "@/lib/product/coreContentEngine";
import { detectExcessiveRepetition } from "@/lib/content/repetitionEngine";
import { wordOverlapRatio } from "@/lib/content/duplicateKillerEngine";
import { PIPELINE_ORDER_STRICT } from "@/lib/product/briclogPriority";
import { assessBrandWikiReadiness } from "@/lib/evolution/brandWikiEngine";
import {
  MIN_VERIFIED_BRAND_FACTS,
  collectVerifiedBrandFacts,
} from "@/lib/product/brandJournalistDirective";
import { isBrandJournalistDirectiveEnforced } from "@/lib/product/missionFlags";

export const RESEARCH_VERIFY_VERSION = "v1";

export const MIN_ENTITY_COUNT = 3;
export const MIN_TOPIC_EXPLANATION_RATE = 0.6;
export const MAX_PREWRITE_REPETITION_RATE = 0.28;

function collectResearchBlob(input = {}) {
  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  const factText = facts.map((f) => String(f?.fact || f || "")).join("\n");
  const include = String(input.includePhrases || "").trim();
  const brief = String(
    input.researchBrief || input.geminiWriterBrief || input.topicDecompositionBrief || ""
  ).trim();
  const unitBrief = String(input.informationUnitBrief || "").trim();
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  return [factText, include, brief, unitBrief, brand, region, topic]
    .filter(Boolean)
    .join("\n");
}

function countSecuredEntities(input = {}) {
  const seen = new Set();
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (brand) seen.add(`brand:${brand}`);
  if (region) seen.add(`region:${region}`);
  if (topic) seen.add(`topic:${topic.slice(0, 48)}`);

  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  for (const row of facts) {
    const t = String(row?.fact || row || "").trim();
    if (t.length >= 8) seen.add(`fact:${t.slice(0, 56)}`);
  }

  const units = input.informationUnits?.units || input.informationUnits?.items || [];
  for (const u of units) {
    const id = u?.id || u?.label || u?.headingSuffix;
    if (id) seen.add(`unit:${id}`);
  }

  const areas = input.knowledgeCoverage?.areas || input.knowledgeCoverage?.covered || [];
  for (const a of areas) {
    const id = a?.id || a?.label || a?.area;
    if (id) seen.add(`area:${id}`);
  }

  return seen.size;
}

function measureResearchRepetitionRate(blob = "") {
  const paras = String(blob || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.replace(/\s/g, "").length >= 16);
  if (paras.length < 2) return 0;

  const repetition = detectExcessiveRepetition(blob, { maxPhrase: 3, maxParagraphDup: 2 });
  if (!repetition.ok) return 0.45;

  let dupPairs = 0;
  let pairs = 0;
  for (let i = 0; i < paras.length; i += 1) {
    for (let j = i + 1; j < paras.length; j += 1) {
      pairs += 1;
      if (wordOverlapRatio(paras[i], paras[j]) >= 0.72) dupPairs += 1;
    }
  }
  return pairs ? dupPairs / pairs : 0;
}

/**
 * 생성 전 4대 메트릭
 */
export function computePreGenerationMetrics(input = {}) {
  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  const infoCount = Math.max(
    facts.length,
    input.informationUnits?.unitCount ?? 0,
    input.knowledgeCoverage?.coverageCount ?? 0
  );

  const entityCount = countSecuredEntities(input);
  const blob = collectResearchBlob(input);
  const topic = assessTopicCoverageFromText(blob);
  const repetitionRate = measureResearchRepetitionRate(blob);
  const depth = assessResearchDepth(input);
  const wiki = assessBrandWikiReadiness(input);
  const structured = isStructuredSubjectTopic(input);
  const verifiedBrandCount = isBrandJournalistDirectiveEnforced()
    ? collectVerifiedBrandFacts(input).length
    : 0;
  const minInfoCount = isBrandJournalistDirectiveEnforced()
    ? MIN_VERIFIED_BRAND_FACTS
    : structured
      ? 5
      : 3;

  return {
    version: RESEARCH_VERIFY_VERSION,
    infoCount,
    entityCount,
    topicExplanationRate: topic.explanationRate ?? topic.count / topic.total,
    topicCoverageCount: topic.count,
    repetitionRate,
    minInfoCount,
    structured,
    researchDepthOk: depth.ok,
    entityCountFromWiki: wiki.entryCount,
    brandWikiOk: wiki.ok,
    verifiedBrandCount,
    pipelineOrder: PIPELINE_ORDER_STRICT,
    topicQuestions: topic.questions,
  };
}

export function assertResearchVerificationGate(input = {}) {
  const metrics = computePreGenerationMetrics(input);
  const reasons = [];

  if (!metrics.researchDepthOk) reasons.push("research_depth_insufficient");
  if (metrics.infoCount < metrics.minInfoCount) reasons.push("insufficient_info_count");
  if (metrics.entityCount < MIN_ENTITY_COUNT) reasons.push("insufficient_entity_count");
  if (metrics.topicExplanationRate < MIN_TOPIC_EXPLANATION_RATE) {
    reasons.push("low_topic_explanation_rate");
  }
  if (metrics.repetitionRate > MAX_PREWRITE_REPETITION_RATE) {
    reasons.push("high_prewrite_repetition");
  }
  if (!metrics.brandWikiOk && metrics.infoCount < metrics.minInfoCount + 2) {
    reasons.push("brand_wiki_thin");
  }

  const ok = reasons.length === 0;

  return {
    ok,
    stage: "research_verify",
    reasons,
    metrics,
    pipelineOrder: PIPELINE_ORDER_STRICT,
    userMessage: ok
      ? null
      : "조사·검증 기준에 미달해 글을 작성하지 않습니다. 조사를 보강한 뒤 다시 시도해 주세요.",
  };
}
