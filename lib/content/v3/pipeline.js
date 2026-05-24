import { analyzeBrandV3, formatBrandAnalysisBrief } from "@/lib/content/v3/brandAnalysis";
import { analyzeRegionV3, formatRegionAnalysisBrief } from "@/lib/content/v3/regionAnalysis";
import { analyzeTopicV3, formatTopicAnalysisBrief } from "@/lib/content/v3/topicAnalysis";
import {
  runDualVerificationV3,
  formatVerificationBrief,
} from "@/lib/content/v3/verification";
import {
  resolveContentStrategyV3,
  formatStrategyBrief,
} from "@/lib/content/v3/contentStrategy";
import {
  buildSeoStrategyV3,
  formatSeoStrategyBrief,
} from "@/lib/content/v3/seoStrategy";
import { purgeIndustryAndAiSentences } from "@/lib/content/v3/industryPurge";
import { runPostWriteFactCheckV3 } from "@/lib/content/v3/factCheck";
import {
  evaluateV3BrandScore,
  buildV3RegenNote,
  needsV3Regen,
} from "@/lib/content/v3/brandScore";
import { V3_ENGINE_VERSION } from "@/lib/content/v3/constants";
import { getBlogFullText } from "@/utils/qualityCheck";
import { findIndustryDriftHits } from "@/lib/content/v3/industryPurge";

/**
 * V3 작성 전 enrichment (조사 이후 ~ 작성 전)
 */
export function runV3PreWriteEnrichment({
  input,
  brandResearch,
  parsed,
  research,
  regionHints,
  onStep,
}) {
  onStep?.("브랜드 분석 중…");
  const brandAnalysis = analyzeBrandV3(input, brandResearch);

  onStep?.("지역 분석 중…");
  const regionAnalysis = analyzeRegionV3({ ...input, regionKeywordHints: regionHints });

  onStep?.("주제·제품 분석 중…");
  const topicAnalysis = analyzeTopicV3(input, parsed, research);

  onStep?.("정보 검증 중…");
  const verification = runDualVerificationV3(parsed, research, topicAnalysis);
  if (!verification.ok && verification.depthTier === "blocked") {
    return {
      ok: false,
      userMessage: "브랜드 · 지역 · 주제를 모두 입력해 주세요.",
      verification,
    };
  }

  onStep?.("콘텐츠 전략 수립 중…");
  const strategy = resolveContentStrategyV3(input, { topicAnalysis, regionAnalysis });

  const briefText = [
    formatBrandAnalysisBrief(brandAnalysis),
    formatRegionAnalysisBrief(regionAnalysis),
    formatTopicAnalysisBrief(topicAnalysis),
    formatVerificationBrief(verification),
    formatStrategyBrief(strategy),
  ].join("\n\n");

  const driftInBrief = findIndustryDriftHits(briefText);
  if (driftInBrief.length) {
    return {
      ok: false,
      userMessage:
        "조사·전략 단계에서 업종 무관 표현이 감지되었습니다. 브랜드·주제에 맞게 입력을 조정해 주세요.",
      driftInBrief,
    };
  }

  onStep?.("SEO 전략 수립 중…");
  const seoStrategy = buildSeoStrategyV3(
    input,
    brandAnalysis,
    regionAnalysis,
    topicAnalysis
  );
  const seoBrief = formatSeoStrategyBrief(seoStrategy);

  const v3MasterBrief = [
    "【BRICLOG V3 — 브랜드 기반 콘텐츠 플랫폼】",
    "AI 글쓰기가 아닌, 브랜드·지역·주제 조사·검증 후 작성.",
    briefText,
    seoBrief,
    parsed?.factsPrompt || "",
    "【8. 작성 순서】 브랜드 → 지역 → 주제 → 조사정보 → 브랜드메모리 → SEO → 본문",
    "확인되지 않은 내용·허구·업종 무관 문장 금지.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    ok: true,
    v3EngineVersion: V3_ENGINE_VERSION,
    brandAnalysis,
    regionAnalysis,
    topicAnalysis,
    verification,
    strategy,
    seoStrategy,
    seoBrief,
    v3MasterBrief,
    v3PreWriteVerified: true,
  };
}

/**
 * V3 작성 후 (9~12단계)
 */
export function runV3PostWritePipeline(pack, ctx = {}, input = {}) {
  let next = pack;

  const purged = purgeIndustryAndAiSentences(next, ctx);
  next = purged.pack;

  const factCheck = runPostWriteFactCheckV3(next, input);
  input.v3FactCheck = factCheck;

  const score = evaluateV3BrandScore(next, ctx, {
    ...input,
    v3IndustryRemoved: purged.removedCount,
    v3IndustryHits: purged.industryHits,
    v3AiHits: purged.aiHits,
  });

  next._meta = {
    ...next._meta,
    v3Engine: V3_ENGINE_VERSION,
    v3FactCheck: factCheck,
    v3BrandScore: score,
    v3IndustryPurge: {
      removed: purged.removedCount,
      industryHits: purged.industryHits,
      aiHits: purged.aiHits,
    },
    writtenFromVerifiedResearch: Boolean(input.v2PreWriteVerified),
    qualityScore: {
      ...(next._meta?.qualityScore || {}),
      v3: score,
      v2Axis: score.v2Axis,
      total: score.total,
    },
  };

  return {
    pack: next,
    factCheck,
    score,
    purged,
    ok: score.ok && factCheck.ok,
    failReasons: [
      ...(score.failReasons || []),
      ...(factCheck.ok ? [] : ["v3_fact_check_fail"]),
    ],
    regenNote: buildV3RegenNote(score),
    fullText: getBlogFullText(next),
  };
}

export { needsV3Regen, buildV3RegenNote, evaluateV3BrandScore };
