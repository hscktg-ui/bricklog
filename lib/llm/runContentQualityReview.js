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

export async function runContentQualityReview(pack, ctx, extras = {}) {
  const heuristic = scoreContentQualityHeuristics(pack, ctx, extras);

  if (!isOpenAIConfigured()) {
    return {
      ...heuristic,
      approved: heuristic.finalScore >= CQREVIEW_THRESHOLD,
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
        approved: heuristic.finalScore >= CQREVIEW_THRESHOLD,
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
      approved: finalScore >= CQREVIEW_THRESHOLD,
      improvementSuggestions: uniqueSuggestions,
      aiIssues: [...new Set(aiIssues)].slice(0, 8),
      perspectives: parsed.perspectives || null,
      summary: parsed.summary || null,
      source: "heuristic+llm",
    };
  } catch {
    return {
      ...heuristic,
      approved: heuristic.finalScore >= CQREVIEW_THRESHOLD,
    };
  }
}

export async function applyContentQualityRevision(pack, ctx, review, input = {}) {
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
