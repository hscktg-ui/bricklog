/**
 * ENGINE PRIORITY OVERRIDE — 주제 증명 게이트
 * 입력 → 주제맵 → 정보확보율 → 주제설명률 → (생성) → 브랜드고유성 · 정보단위 → 출력
 */
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { assessTopicCoverageFromText } from "@/lib/evolution/topicCoverageEngine";
import {
  buildTopicMap,
  formatTopicMapBrief,
} from "@/lib/product/topicMapEngine";
import {
  MIN_INFO_SECUREMENT_RATE,
  MIN_TOPIC_EXPLANATION_RATE,
  MIN_PREWRITE_INFO_UNITS,
  MIN_POSTWRITE_INFO_UNITS,
} from "@/lib/product/topicProofThresholds";

function resolveTopicProofThresholds(input = {}) {
  if (input.publicTestMode) {
    return {
      minSecurement: 0.35,
      minExplanation: 0.45,
      minPreUnits: 5,
      minPostUnits: 6,
    };
  }
  return {
    minSecurement: MIN_INFO_SECUREMENT_RATE,
    minExplanation: MIN_TOPIC_EXPLANATION_RATE,
    minPreUnits: MIN_PREWRITE_INFO_UNITS,
    minPostUnits: MIN_POSTWRITE_INFO_UNITS,
  };
}
import { getBlogFullText } from "@/utils/qualityCheck";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { assertBrandUniquenessPostWrite } from "@/lib/product/brandUniquenessGate";

export const TOPIC_PROOF_PIPELINE_ORDER = [
  "input",
  "topic_map",
  "info_securement_rate",
  "topic_explanation_rate",
  "info_unit_check",
  "generate",
  "quality_audit",
  "brand_uniqueness",
  "output",
];

function collectProofBlob(input = {}) {
  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  const factText = facts.map((f) => String(f?.fact || f || "")).join("\n");
  const parts = [
    factText,
    input.researchBrief,
    input.geminiWriterBrief,
    input.topicDecompositionBrief,
    input.informationUnitBrief,
    input.coverageMapBrief,
    input.customerQuestionBrief,
    input.brandWikiBrief,
    input.includePhrases,
    input.brandName,
    input.region,
    input.topic || input.mainKeyword,
  ];
  return parts.filter(Boolean).join("\n");
}

function itemSecured(item, blob = "") {
  const text = String(blob || "");
  if (item.patterns?.some((re) => re.test(text))) return true;
  if (item.keywords?.some((kw) => kw && text.includes(kw))) return true;
  return false;
}

export function computeInfoSecurementRate(topicMap, input = {}) {
  const thresholds = resolveTopicProofThresholds(input);
  const required = topicMap?.requiredExplanationItems || [];
  const blob = collectProofBlob(input);
  const secured = required.filter((item) => itemSecured(item, blob));
  const requiredCount = Math.max(required.length, 1);
  const securedCount = secured.length;
  const rate = securedCount / requiredCount;
  return {
    requiredCount,
    securedCount,
    rate,
    securedIds: secured.map((i) => i.id),
    missing: required.filter((i) => !secured.includes(i)).map((i) => i.label),
    ok: rate >= thresholds.minSecurement,
    minRequired: thresholds.minSecurement,
  };
}

export function computeTopicExplanationRate(input = {}, topicMap = null) {
  const thresholds = resolveTopicProofThresholds(input);
  const blob = collectProofBlob(input);
  const coverage = assessTopicCoverageFromText(blob);
  const mapQuestions = (topicMap?.requiredExplanationItems || []).map((item) => ({
    id: item.id,
    label: item.label,
    covered: itemSecured(item, blob),
  }));
  const mapCovered = mapQuestions.filter((q) => q.covered).length;
  const mapTotal = Math.max(mapQuestions.length, 1);
  const mapRate = mapCovered / mapTotal;
  const blendedRate = Math.max(
    coverage.explanationRate ?? 0,
    mapRate
  );
  return {
    ...coverage,
    mapQuestions,
    mapRate,
    explanationRate: blendedRate,
    ok: blendedRate >= thresholds.minExplanation,
    minRequired: thresholds.minExplanation,
  };
}

export function countPreWriteInfoUnits(input = {}) {
  const thresholds = resolveTopicProofThresholds(input);
  const facts = collectMergedResearchFacts(input, input.v2AxisParsed, input.research);
  const unitCount = Math.max(
    input.informationUnits?.unitCount ?? 0,
    input.informationUnits?.units?.length ?? 0,
    input.knowledgeCoverage?.coverageCount ?? 0,
    facts.length
  );
  return {
    unitCount,
    ok: unitCount >= thresholds.minPreUnits,
    minRequired: thresholds.minPreUnits,
  };
}

/**
 * 생성 전 — 주제 증명 통과 여부
 */
export function assertTopicProofPreWrite(input = {}) {
  const topicMap = input.topicMap || buildTopicMap(input);
  const securement = computeInfoSecurementRate(topicMap, input);
  const explanation = computeTopicExplanationRate(input, topicMap);
  const infoUnits = countPreWriteInfoUnits(input);
  const reasons = [];

  if (!securement.ok) reasons.push("low_info_securement_rate");
  if (!explanation.ok) reasons.push("low_topic_explanation_rate");
  if (!infoUnits.ok) reasons.push("insufficient_prewrite_info_units");

  const ok = reasons.length === 0;
  const metrics = {
    topicMap,
    securement,
    explanation,
    infoUnits,
    pipelineOrder: TOPIC_PROOF_PIPELINE_ORDER,
  };

  return {
    ok,
    stage: ok ? "topic_proof_pass" : "topic_proof_blocked",
    reasons,
    metrics,
    topicMap,
    topicMapBrief: formatTopicMapBrief(topicMap),
    userMessage: ok
      ? null
      : securement.rate < MIN_INFO_SECUREMENT_RATE
        ? `주제에 대한 정보가 ${Math.round(securement.rate * 100)}%만 확보되었습니다. 추가 조사 후 작성합니다.`
        : explanation.explanationRate < MIN_TOPIC_EXPLANATION_RATE
          ? `주제 설명률이 ${Math.round((explanation.explanationRate || 0) * 100)}%입니다. 조사를 보강한 뒤 다시 시도해 주세요.`
          : `정보 단위가 부족합니다(최소 ${MIN_PREWRITE_INFO_UNITS}개). 조사를 보강한 뒤 다시 시도해 주세요.`,
    needsMoreResearch: !ok,
  };
}

function countPostWriteInfoUnits(pack, input = {}) {
  const thresholds = resolveTopicProofThresholds(input);
  const full = getBlogFullText(pack);
  const yieldScore = scoreInformationYield(full, { ...input, input }, "blog");
  const fromParagraphs = String(full || "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.replace(/\s/g, "").length >= 40);
  const distinct = new Set(
    fromParagraphs.map((p) =>
      p
        .replace(/\d+/g, "#")
        .replace(/\s/g, "")
        .slice(0, 48)
    )
  );
  const unitCount = Math.max(
    yieldScore.newInfoUnits ?? 0,
    distinct.size,
    (pack?.sections || []).filter(
      (s) => String(s.body || "").replace(/\s/g, "").length >= 40
    ).length
  );
  return {
    unitCount,
    ok: unitCount >= thresholds.minPostUnits,
    minRequired: thresholds.minPostUnits,
    yieldScore,
  };
}

/**
 * 작성 후 — 정보단위·브랜드고유성
 */
export function assertTopicProofPostWrite(pack, input = {}) {
  const infoUnits = countPostWriteInfoUnits(pack, input);
  const brandGate = assertBrandUniquenessPostWrite(pack, input);
  const reasons = [];

  if (!infoUnits.ok) reasons.push("insufficient_postwrite_info_units");
  if (!brandGate.ok) reasons.push(...(brandGate.reasons || []));

  const ok = reasons.length === 0;
  return {
    ok,
    stage: ok ? "topic_proof_post_pass" : "topic_proof_post_blocked",
    reasons,
    infoUnits,
    brandGate,
    userMessage: ok
      ? null
      : !infoUnits.ok
        ? `본문 정보 단위가 부족합니다(확보 ${infoUnits.unitCount}/${MIN_POSTWRITE_INFO_UNITS}). 다시 다듬는 중입니다.`
        : brandGate.userMessage ||
          "브랜드 맞춤 정보가 부족해 다시 다듬는 중입니다.",
    needsRegen: !ok,
  };
}
