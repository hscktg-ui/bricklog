/**
 * 콘텐츠 품질 검수 AI 실행
 */
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { parseOpenAIJson } from "@/lib/prompts/parseResponse";
import {
  buildContentQualityReviewMessages,
  buildContentQualityRevisionMessages,
} from "@/lib/llm/buildContentQualityReviewPrompt";
import { scoreContentQualityHeuristics } from "@/lib/quality/scoreContentQualityHeuristics";
import { computeWeightedFinalScore } from "@/lib/quality/scoreContentQualityHeuristics";
import {
  CQREVIEW_THRESHOLD,
} from "@/lib/quality/contentQualityReviewConstants";
import {
  parseLlmBlogResponse,
  postProcessLlmBlog,
} from "@/lib/llm/postProcessLlmBlog";
import { applyGoldenSafeEdit } from "@/lib/golden/goldenSafeEditEngine";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { scrubPlaceholderFromPack } from "@/lib/content/placeholderTraceEngine";
import { runIndustryPipelineSanitize } from "@/lib/product/industryPipelineRouter";
import { injectBrandFactsIntoPack } from "@/lib/content/brandFactInjectionEngine";
import { assessBriclogResetQualityGate, BRICLOG_RESET_PASS_SCORE } from "@/lib/product/briclogResetQualityGate";
import { applyParagraphSafeEdit } from "@/lib/golden/paragraphSafeEditEngine";
import { assessContentEvaluation, CONTENT_EVAL_PASS_SCORE } from "@/lib/product/contentEvaluationEngine";

function mergeScores(heuristic, llmScores) {
  if (!llmScores) return heuristic.scores;
  const merged = { ...heuristic.scores };
  for (const [k, v] of Object.entries(llmScores)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      const h = heuristic.scores[k];
      merged[k] =
        typeof h === "number"
          ? Math.round(h * 0.35 + v * 0.65)
          : Math.round(v);
    }
  }
  const { finalScore, platformFit } = computeWeightedFinalScore(merged);
  return { scores: { ...merged, platformFit }, finalScore };
}

function parseReviewJson(raw) {
  try {
    const data = typeof raw === "string" ? parseOpenAIJson(raw) : raw;
    if (!data?.scores) return null;
    return data;
  } catch {
    return null;
  }
}

function reviewThreshold() {
  return isBriclogResetQualityEnforced() ? CONTENT_EVAL_PASS_SCORE : CQREVIEW_THRESHOLD;
}

export async function runContentQualityReview(pack, ctx, extras = {}) {
  const heuristic = scoreContentQualityHeuristics(pack, ctx, extras);
  const threshold = reviewThreshold();

  if (isBriclogResetQualityEnforced()) {
    const evalInput = ctx?.input || extras.input || {};
    const evaluation = assessContentEvaluation(pack, evalInput);
    const blended = Math.min(heuristic.finalScore, evaluation.score);
    return {
      ...heuristic,
      finalScore: blended,
      approved: evaluation.pass && blended >= threshold,
      contentEvaluation: evaluation,
      source: "evaluation+heuristic",
    };
  }

  if (!isOpenAIConfigured()) {
    return {
      ...heuristic,
      approved: heuristic.finalScore >= threshold,
    };
  }

  try {
    const messages = buildContentQualityReviewMessages(pack, ctx, heuristic);
    const raw = await callOpenAIChat(messages, {
      temperature: 0.35,
      maxTokens: 2000,
    });
    const parsed = parseReviewJson(raw);
    if (!parsed?.scores) {
      return {
        ...heuristic,
        approved: heuristic.finalScore >= threshold,
      };
    }

    const { scores, finalScore } = mergeScores(heuristic, parsed.scores);
    const suggestions = [
      ...(parsed.improvementSuggestions || []),
      ...heuristic.improvementSuggestions,
    ].filter(Boolean);
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 6);
    const aiIssues = [
      ...(parsed.aiIssues || []),
      ...heuristic.aiIssues,
    ].filter(Boolean);

    return {
      scores,
      finalScore,
      approved: finalScore >= threshold,
      improvementSuggestions: uniqueSuggestions,
      aiIssues: [...new Set(aiIssues)].slice(0, 8),
      perspectives: parsed.perspectives || null,
      summary: parsed.summary || null,
      source: "heuristic+llm",
    };
  } catch {
    return {
      ...heuristic,
      approved: heuristic.finalScore >= threshold,
    };
  }
}

/** RESET: 재생성 금지 — 문단 단위 Safe Edit (원문 85%+) */
function applySafeEditRevision(pack, input = {}, review = {}) {
  const evaluation =
    review.contentEvaluation || assessContentEvaluation(pack, input);
  let next = applyParagraphSafeEdit(pack, input, evaluation);
  if (!next?.sections?.length) {
    next = applyGoldenSafeEdit(pack, input, { forceApply: true });
    next = runIndustryPipelineSanitize(next, input);
    next = scrubPlaceholderFromPack(next);
    next = injectBrandFactsIntoPack(next, input);
  }
  return next?.sections?.length ? next : null;
}

export async function applyContentQualityRevision(pack, ctx, review, input = {}) {
  if (isBriclogResetQualityEnforced()) {
    return applySafeEditRevision(pack, input, review);
  }
  if (!isOpenAIConfigured()) return null;
  try {
    const messages = buildContentQualityRevisionMessages(pack, ctx, review);
    const raw = await callOpenAIChat(messages, {
      temperature: 0.55,
      maxTokens: 5000,
    });
    const parsed = parseLlmBlogResponse(raw, ctx);
    if (!parsed) return null;
    const processed = postProcessLlmBlog(parsed, ctx, input);
    return processed?.pack || null;
  } catch {
    return null;
  }
}
