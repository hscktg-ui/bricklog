/**
 * BRICLOG Evaluate-First Pipeline — 12단계 (평가 우선)
 * STEP1–7: 컨텍스트 로드 · STEP8–9: 구조·본문(기존 생성) · STEP10–12: 평가·수정·출력
 */
import { lockIndustryOnInput } from "@/lib/product/industryPipelineRouter";
import { detectContentIntent } from "@/lib/pipeline/v2/intentDetection";
import { prepareBriclogPreWriteContext } from "@/lib/content/briclogPreWriteContext";
import {
  assessContentEvaluation,
  stampContentEvaluation,
} from "@/lib/product/contentEvaluationEngine";
import { applyParagraphSafeEdit } from "@/lib/golden/paragraphSafeEditEngine";
import { tracePlaceholderAtStage } from "@/lib/content/placeholderTraceEngine";
import { injectBrandFactsIntoPack } from "@/lib/content/brandFactInjectionEngine";
import { runIndustryPipelineSanitize } from "@/lib/product/industryPipelineRouter";

export const EVALUATE_FIRST_PIPELINE_VERSION = "eval-first-v1";

export const PIPELINE_STEP_LABELS = [
  "업종 판별",
  "검색 의도 판별",
  "브랜드 정보 로드",
  "브랜드 철학 로드",
  "지역 정보 로드",
  "고객 질문 DB 로드",
  "계절성 데이터 로드",
  "콘텐츠 구조 생성",
  "본문 생성",
  "품질 평가",
  "재작성",
  "출력",
];

/** STEP1–7 — 생성 전 컨텍스트 (평가·생성 공용) */
export function loadEvaluateFirstContext(input = {}) {
  const steps = [];
  let ctx = { ...input };

  const locked = lockIndustryOnInput(ctx);
  ctx = { ...ctx, ...locked };
  steps.push({ step: 1, id: "industry", ok: Boolean(ctx.industryKey) });

  const intent = detectContentIntent(ctx);
  ctx = { ...ctx, contentIntent: intent };
  steps.push({ step: 2, id: "search_intent", ok: Boolean(intent?.primary) });

  const preWrite = prepareBriclogPreWriteContext(ctx);
  ctx = {
    ...ctx,
    ...preWrite,
    brandPhilosophyBrief:
      preWrite.brandWiki?.philosophy ||
      preWrite.brandWiki?.brandStory ||
      ctx.brandDescription,
    seasonalBrief:
      preWrite.seasonalBrief ||
      preWrite.knowledgeExpansion?.seasonal ||
      preWrite.season,
  };

  steps.push({
    step: 3,
    id: "brand_info",
    ok: Boolean(ctx.brandName || ctx.storeFeatures),
  });
  steps.push({
    step: 4,
    id: "brand_philosophy",
    ok: Boolean(ctx.brandPhilosophyBrief),
  });
  steps.push({ step: 5, id: "region", ok: Boolean(ctx.region) });
  steps.push({
    step: 6,
    id: "customer_questions",
    ok: Boolean(
      ctx.customerQuestionMap?.questions?.length ||
        ctx.customerQuestionMap?.coverage?.length
    ),
  });
  steps.push({
    step: 7,
    id: "seasonality",
    ok: Boolean(ctx.seasonalBrief || ctx.season),
  });

  return { input: ctx, preWrite, steps, evaluateFirst: true };
}

/** STEP10–12 — 평가 → 문단 수정 → 출력 여부 */
export function evaluateReviseAndGateOutput(pack, input = {}, opts = {}) {
  if (!pack?.sections?.length) {
    return {
      pack,
      evaluation: null,
      outputAllowed: false,
      steps: [{ step: 10, id: "evaluate", ok: false }],
    };
  }

  let next = tracePlaceholderAtStage(pack, input, "pre_evaluate");
  next = runIndustryPipelineSanitize(next, input);
  next = injectBrandFactsIntoPack(next, input);

  let evaluation = assessContentEvaluation(next, input);
  const steps = [{ step: 10, id: "evaluate", ok: evaluation.pass, score: evaluation.score }];

  if (!evaluation.pass && opts.allowRevise !== false) {
    const revised = applyParagraphSafeEdit(next, input, evaluation);
    if (revised?.sections?.length) {
      next = revised;
      evaluation = assessContentEvaluation(next, input);
      steps.push({
        step: 11,
        id: "revise",
        ok: evaluation.pass,
        score: evaluation.score,
        preserveRatio: revised._meta?.paragraphSafeEditPreserveRatio,
      });
    }
  }

  next = stampContentEvaluation(next, input);
  const outputAllowed = evaluation.pass && !evaluation.shouldWithhold;
  steps.push({ step: 12, id: "output", ok: outputAllowed });

  return {
    pack: next,
    evaluation,
    outputAllowed,
    steps,
  };
}
