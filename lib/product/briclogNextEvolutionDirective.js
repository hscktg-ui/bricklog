/**
 * BRICLOG NEXT EVOLUTION DIRECTIVE — SSOT
 * 글쓰기가 아니라 브랜드·주제·독자 이해 후 편집
 */
import { isNextEvolutionDirectiveEnforced } from "@/lib/product/missionFlags";
import { PIPELINE_ORDER_STRICT } from "@/lib/product/briclogPriority";
import { buildTopicMap, formatTopicMapBrief } from "@/lib/product/topicMapEngine";
import {
  assertTopicProofPreWrite,
  computeInfoSecurementRate,
  computeTopicExplanationRate,
} from "@/lib/product/topicProofGate";
import {
  buildBrandInvestigationReport,
  evaluateBrandJournalistWriteGate,
  formatBrandInvestigationBrief,
} from "@/lib/product/brandJournalistDirective";
import {
  assessBrandKnowledge,
  formatBrandKnowledgeBrief,
} from "@/lib/product/brandKnowledgeEngine";
import {
  filterUsableFactsForBody,
  formatConfidenceBrief,
} from "@/lib/product/confidenceEngine";
import {
  assessPreWriteInformationDensity,
  formatInformationDensityBrief,
} from "@/lib/product/informationDensityEngine";
import { assertNoIndustryContamination } from "@/lib/product/industryContaminationEngine";
import { buildBrandDnaPromptBlock } from "@/lib/product/brandDnaEngine";
import { buildAiPatternForbiddenBrief } from "@/lib/product/aiPatternDetector";
import {
  buildGlobalizationBrief,
  detectContentLocale,
} from "@/lib/product/globalizationEngine";
import { buildBrandWiki, formatBrandWikiBrief } from "@/lib/evolution/brandWikiEngine";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";
import {
  assertTopicLockPreWrite,
  formatTopicLockBrief,
} from "@/lib/product/topicLockEngine";
import { formatTopicAnswerBrief, buildTitleAnswerChecklist } from "@/lib/product/topicAnswerEngine";

export const NEXT_EVOLUTION_VERSION = "v2";
export const NEXT_EVOLUTION_PIPELINE = PIPELINE_ORDER_STRICT;

export const NEXT_EVOLUTION_ROLE_BRIEF = `【BRICLOG 역할 재정의】
브릭로그는 AI 글쓰기 서비스가 아니다.
브랜드 조사 시스템 · 브랜드 메모리 시스템 · 브랜드 콘텐츠 운영체제.
글을 먼저 생성하지 않는다 — 브랜드·주제·독자를 이해한 뒤 콘텐츠를 설계·편집한다.
브릭로그는 작가가 아니다. 브랜드 기자이자 브랜드 편집자다.
목표: 사용자가 수정 없이 바로 발행 가능한 결과물.`;

export const NEXT_EVOLUTION_FINAL_PRINCIPLE = `【최종 원칙】
브릭로그는 글을 생성하지 마라. 먼저 주제를 설명할 수 있는지 증명하라.
증명하지 못하면 작성하지 마라.
반복·허구·업종 오염·정보 부족·브랜드 부재·AI 문체 — 모두 주제 미이해에서 비롯된다.`;

export function buildNextEvolutionPromptBlock(input = {}) {
  const locale = detectContentLocale(input);
  return [
    NEXT_EVOLUTION_ROLE_BRIEF,
    NEXT_EVOLUTION_FINAL_PRINCIPLE,
    `파이프라인: ${PIPELINE_ORDER_STRICT.join(" → ")}`,
    buildAiPatternForbiddenBrief(),
    buildBrandDnaPromptBlock(input),
    buildGlobalizationBrief(locale),
    "【TOPIC LOCK】생성 전 허용 엔티티(브랜드·지역·주제·직접 관련)만 — 허용 외 등장 시 오염.",
    "【TOPIC ANSWER】작성 후 제목에 대한 답을 했는가? 설명 부족 시 재작성.",
  ].join("\n\n");
}

/**
 * 콘텐츠 설계 brief — 본문 생성 직전
 */
export function buildContentDesignBrief(input = {}, ctx = {}) {
  const topicMap = ctx.topicMap || input.topicMap || buildTopicMap(input);
  const persona = resolvePersonaEngineProfile(input);
  return [
    "【콘텐츠 설계 · CONTENT DESIGN】",
    "작성 순서: 사실 → 관찰 → 해석 → 정보 (나열 금지)",
    formatTopicMapBrief(topicMap),
    `화자: ${persona.label || persona.archetype || "브랜드 편집자"}`,
    ctx.brandInvestigationBrief || formatBrandInvestigationBrief(ctx.brandInvestigation),
    ctx.confidenceBrief,
    ctx.informationDensityBrief,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * 진화 파이프라인 — 작성 전 통합 게이트
 */
export function assertNextEvolutionPreWrite(input = {}, parsed = {}, research = {}) {
  if (!isNextEvolutionDirectiveEnforced()) {
    return { ok: true, skipped: true, stage: "next_evolution" };
  }
  if (input.publicTestMode && input.nextEvolutionStrict !== true) {
    return { ok: true, skipped: true, publicTestBypass: true };
  }

  const reasons = [];
  const stages = {};

  const brandWiki = buildBrandWiki(input);
  stages.brand_analysis = { wiki: brandWiki, ok: brandWiki.ok };

  const brandKnowledge = assessBrandKnowledge({ ...input, brandWikiBrief: formatBrandWikiBrief(brandWiki) });
  stages.brand_knowledge = brandKnowledge;
  if (!brandKnowledge.ok) reasons.push("insufficient_brand_knowledge");

  const topicMap = input.topicMap || buildTopicMap(input);
  stages.topic_map = { topicMap, brief: formatTopicMapBrief(topicMap) };

  const topicLockGate = assertTopicLockPreWrite({ ...input, topicMap });
  stages.topic_lock = topicLockGate;
  if (!topicLockGate.ok && !topicLockGate.skipped) {
    reasons.push(...(topicLockGate.reasons || []));
  }
  const titleAnswerChecklist = buildTitleAnswerChecklist(
    String(input.topic || input.mainKeyword || "").trim(),
    { ...input, topicMap }
  );
  stages.title_answer_plan = titleAnswerChecklist;

  const investigation = buildBrandInvestigationReport(input, parsed, research);
  stages.research_report = investigation;

  const journalistGate = evaluateBrandJournalistWriteGate(input, parsed, research);
  stages.fact_verify = journalistGate;
  if (!journalistGate.ok) reasons.push(...(journalistGate.reasons || []));

  const confidence = filterUsableFactsForBody(input, parsed, research);
  stages.confidence = confidence;
  if (!confidence.ok) reasons.push("insufficient_confident_facts");

  const securement = computeInfoSecurementRate(topicMap, input);
  const explanation = computeTopicExplanationRate(input, topicMap);
  stages.info_securement_rate = securement;
  stages.topic_explanation_rate = explanation;
  if (!securement.ok) reasons.push("low_info_securement_rate");
  if (!explanation.ok) reasons.push("low_topic_explanation_rate");

  const density = assessPreWriteInformationDensity(input);
  stages.info_unit_check = density;
  if (!density.ok) reasons.push("insufficient_prewrite_info_units");

  const topicProof = assertTopicProofPreWrite({ ...input, topicMap });
  stages.topic_proof = topicProof;
  for (const r of topicProof.reasons || []) {
    if (!reasons.includes(r)) reasons.push(r);
  }

  const ok = reasons.length === 0;
  const ctx = {
    brandInvestigation: investigation,
    brandInvestigationBrief: formatBrandInvestigationBrief(investigation),
    confidenceBrief: formatConfidenceBrief(confidence),
    informationDensityBrief: formatInformationDensityBrief(density),
    brandKnowledgeBrief: formatBrandKnowledgeBrief(brandKnowledge),
    topicMap,
    topicMapBrief: formatTopicMapBrief(topicMap),
    topicLock: topicLockGate.lock,
    topicLockBrief: formatTopicLockBrief(topicLockGate.lock),
    titleAnswerChecklist,
    titleAnswerBrief: formatTopicAnswerBrief(titleAnswerChecklist),
  };

  return {
    ok,
    stage: ok ? "content_design_ready" : "next_evolution_blocked",
    reasons,
    pipelineOrder: PIPELINE_ORDER_STRICT,
    stages,
    brandWiki,
    brandKnowledge,
    investigation,
    confidence,
    securement,
    explanation,
    density,
    topicProof,
    contentDesignBrief: ok ? buildContentDesignBrief(input, ctx) : null,
    userMessage: ok
      ? null
      : reasons.includes("insufficient_brand_knowledge")
        ? "브랜드에 대한 이해가 아직 부족해요. 조사를 더 진행한 뒤 글을 작성합니다."
        : reasons.includes("low_topic_explanation_rate")
          ? "주제를 충분히 설명할 수 없어요. 조사를 보강한 뒤 다시 시도해 주세요."
          : reasons.includes("insufficient_prewrite_info_units")
            ? "정보가 부족해요. 길게 쓰지 말고 조사를 먼저 보강해 주세요."
            : "브랜드·주제 이해가 부족해 조사를 더 진행합니다.",
    ...ctx,
  };
}

/**
 * 생성 후 — AI 편집장 감사 보조
 */
export function assertNextEvolutionPostWrite(pack, input = {}) {
  if (!isNextEvolutionDirectiveEnforced()) {
    return { ok: true, skipped: true };
  }

  const reasons = [];
  const industry = assertNoIndustryContamination(pack, input);
  if (!industry.ok) reasons.push("industry_contamination");

  return {
    ok: reasons.length === 0,
    reasons,
    industry,
    pipelineOrder: PIPELINE_ORDER_STRICT,
  };
}
