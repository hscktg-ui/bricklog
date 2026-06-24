/**
 * Visit Review Sovereign — 방문 후기는 템플릿·에디터 패딩 대신 GPT 단독 집필
 * (조사 팩트만 입력, mission prose / editor 패드 입력 금지)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  DEFAULT_BLOG_LENGTH_TIER,
  resolveBlogLengthTier,
} from "@/lib/constants";
import { formatResearchFactsForPrompt } from "@/lib/content/v2ResearchFacts";
import { isVisitReviewTopicInput, resolveVisitReviewIntentInput } from "@/lib/content/topicFacetEngine";
import {
  detectVisitReviewTemplateContamination,
  applyVisitReviewTopicPackGate,
} from "@/lib/content/visitReviewTopicGate";
import { buildVisitReviewUnifiedProsePromptBlock } from "@/lib/content/visitReviewUnifiedProseEngine";
import { buildColumnVisitNorthStarPromptBlock } from "@/lib/product/columnVisitNorthStar";
import { buildNorthStarReferencePromptBlock } from "@/lib/product/northStarReferenceExamples";
import {
  assessVisitReviewBenchmark,
} from "@/lib/product/visitReviewBenchmarkRubric";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { parseLlmBlogResponse } from "@/lib/llm/postProcessLlmBlog";
import { normalizeLlmVoiceForDelivery } from "@/lib/golden/llmDeliveryPolish";
import { createPromptContext } from "@/utils/promptBuilder";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import { isLlmOriginatedPack } from "@/lib/product/contentQualityDelivery";
import { isMissionFallbackPack } from "@/lib/product/briclogWriterEngine";
import { applyGpt55PrePublishChecks } from "@/lib/product/gpt55LightDelivery";
import { applyDisplayBodyGuardPack } from "@/lib/content/displayBodyGuards";
import { stripGlobalExactDuplicateSentences } from "@/lib/content/duplicateKillerEngine";
import { hasEngineSpamInPack } from "@/lib/product/columnistEngineSpam";
export { ENGINE_SPAM_RES, hasEngineSpamInText, hasEngineSpamInPack } from "@/lib/product/columnistEngineSpam";

export const VISIT_REVIEW_SOVEREIGN_VERSION = "visit-review-sovereign-v2";

/** 첫 송출 최소 벤치마크 점수 */
export const VISIT_REVIEW_SOVEREIGN_PASS_MIN = 72;

export function isVisitReviewSovereignEnabled() {
  if (process.env.BRICLOG_VISIT_REVIEW_SOVEREIGN === "false") return false;
  return isOpenAIConfigured();
}

/** 오픈·체험·수영·메뉴 후기 등 — 방문 의도가 있으면 sovereign */
export function isVisitReviewSovereignEligible(input = {}, pack = null) {
  const ctx = resolveVisitReviewIntentInput(input, pack);
  if (isVisitReviewTopicInput(ctx, pack)) return true;
  const blob = [
    ctx.topic,
    ctx.mainKeyword,
    ctx.includePhrases,
    ctx.representativeTitle,
    ctx.title,
  ]
    .filter(Boolean)
    .join(" ");
  if (/솔직|후기|다녀|직접\s*둘러|방문/.test(blob) && /오픈|수영|체험|목장|승마|워터|풀장|메뉴|돈까스|식사|카페/.test(blob)) {
    return true;
  }
  return false;
}

function hasEngineSpamText(pack) {
  return hasEngineSpamInPack(pack);
}

export function needsVisitReviewSovereignUpgrade(pack, input = {}) {
  const intentInput = resolveVisitReviewIntentInput(input, pack);
  if (!isVisitReviewSovereignEligible(intentInput, pack)) {
    return false;
  }
  if (!pack?.sections?.length) return true;
  if (pack._meta?.visitReviewSovereignLlm) return false;
  if (isMissionFallbackPack(pack, input)) return true;
  if (!isLlmOriginatedPack(pack, input)) return true;
  if (hasEngineSpamText(pack)) return true;
  const contam = detectVisitReviewTemplateContamination(pack, intentInput);
  if (!contam.ok) return true;
  return false;
}

function tierAccepts(pack, input = {}) {
  const tier = resolveBlogLengthTier(
    input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER
  );
  const chars = countBlogBodyCharsWithSpaces(pack);
  return (
    (pack.sections?.length || 0) >= Math.min(HUMAN_MIN_SECTIONS, 3) &&
    chars >= tier.min * 0.82
  );
}

function finishSovereignPack(pack, input = {}) {
  if (!pack?.sections?.length) return null;
  let next = applyGpt55PrePublishChecks(pack, input);
  next = applyVisitReviewTopicPackGate(next, input);
  next = stripGlobalExactDuplicateSentences(next);
  next = applyDisplayBodyGuardPack(next, input);
  if (hasEngineSpamText(next)) return null;
  const contam = detectVisitReviewTemplateContamination(next, input);
  if (!contam.ok) return null;

  const benchmark = assessVisitReviewBenchmark(next, input, {
    passMin: VISIT_REVIEW_SOVEREIGN_PASS_MIN,
  });
  if (!benchmark.publishOk && benchmark.hardFails.length > 0) return null;

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      visitReviewSovereignLlm: true,
      visitReviewSovereignVersion: VISIT_REVIEW_SOVEREIGN_VERSION,
      visitReviewBenchmark: benchmark,
      visitReviewBenchmarkOk: benchmark.publishOk,
      llmGenerated: true,
      generationMode: "visit_review_sovereign",
      missionProseFallback: undefined,
      draftFallback: undefined,
      deliveryRescue: undefined,
      forcedMissionProseRoute: undefined,
    },
  };
}

export function buildVisitReviewSovereignMessages(input = {}, ctx = {}) {
  const tierKey = input.blogLengthTier || ctx.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const tier = resolveBlogLengthTier(tierKey);
  const research = formatResearchFactsForPrompt(input.researchFacts || ctx.researchFacts, 24);
  const unified = buildVisitReviewUnifiedProsePromptBlock();
  const northStar = buildColumnVisitNorthStarPromptBlock();
  const reference = buildNorthStarReferencePromptBlock("blog");

  return [
    {
      role: "system",
      content: `You are a Korean leisure blogger writing a natural visit review after a real trip (like Naver blog top posts — NOT brochure, NOT SEO template).

Return ONLY one JSON object:
{"blog":{"titles":["...×5"],"title":"...","representativeTitle":"...","sections":[{"heading":"...","body":"..."}],"conclusion":"...","hashtags":[]}}

Write FRESH from research — do NOT copy template phrases.

${northStar}

${reference}

Structure (use these section rhythms — adapt headings to brand/topic):
1) Seasonal/situational opening — why this visit matters now (2–3 sentences)
2) "처음 도착해서 느낀 분위기" — space, mood, who it's good for (2+ paragraphs)
3) Core experience heading — what you saw/felt on site, concrete scenes (2+ paragraphs)
4) "이곳만의 장점" or "다른 점" — differentiation from generic alternatives
5) "방문 전 참고할 점" — hours, booking, season ONLY if in research
6) Short personal wrap-up in conclusion

Rules:
- ${tier.min}–${tier.max} Korean chars WITH SPACES; at least ${HUMAN_MIN_SECTIONS} sections
- 2–4 connected paragraphs per section; no staccato brochure lines
- Use research facts woven into scene sentences; do not invent pools, menus, or prices not in research
- Polite ~습니다/~입니다 prose (natural blog tone, like a power blogger column)
- Brand name 2–4 times total — never keyword-stuff every sentence
- FORBIDDEN: 「비교 기준」「대표 서비스」「방문·상담」「덜 헷갈릴까요」「비교가 수월」「목적별로 나눠」「매장·상담에서 확인」「브랜드 자주 비교되는」「공식 안내 기준」「로컬 매장 운영」
- No checklist / FAQ / confirm-please endings

${unified}`,
    },
    {
      role: "user",
      content: `Brand: ${input.brandName || ctx.brandName || "—"}
Region: ${input.region || ctx.region || "—"}
Topic: ${input.topic || ctx.topic || "—"}
Industry: ${input.industry || ctx.industryLabel || "—"}
Length tier: ${tierKey} (min ${tier.min})

【조사 확정 — 본문에 반드시 반영】
${research || "(브랜드·지역·주제 맥락만 사용. 시설·가격은 조사에 없으면 쓰지 말 것)"}`,
    },
  ];
}

/**
 * 조사만으로 방문 후기 신규 집필 (템플릿 초안 없음)
 */
export async function generateVisitReviewSovereignPack(input = {}, pack = null) {
  const intentInput = resolveVisitReviewIntentInput(input, pack);
  if (!isVisitReviewSovereignEnabled() || !isVisitReviewSovereignEligible(intentInput, pack)) {
    return null;
  }
  const ctx = createPromptContext(intentInput);
  try {
    const messages = buildVisitReviewSovereignMessages(intentInput, ctx);
    let raw = await callOpenAIChat(messages, {
      temperature: 0.58,
      maxTokens: 6200,
    });
    let parsed = parseLlmBlogResponse(raw, ctx);
    if (!tierAccepts(parsed, intentInput)) {
      const retry = buildVisitReviewSovereignMessages(intentInput, ctx);
      retry[1].content += `\n\n【재시도】분량 ${resolveBlogLengthTier(intentInput.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER).min}자 이상. 섹션마다 현장 묘사 2문단 이상.`;
      raw = await callOpenAIChat(retry, { temperature: 0.52, maxTokens: 6500 });
      parsed = parseLlmBlogResponse(raw, ctx);
    }
    if (!tierAccepts(parsed, intentInput)) return null;
    parsed = normalizeLlmVoiceForDelivery(parsed, intentInput);
    let finished = finishSovereignPack(parsed, intentInput);
    if (
      !finished &&
      assessVisitReviewBenchmark(parsed, intentInput).score >= VISIT_REVIEW_SOVEREIGN_PASS_MIN - 8
    ) {
      const benchRetry = buildVisitReviewSovereignMessages(intentInput, ctx);
      benchRetry[0].content += `\n\n【품질 재시도】엔진 스팸·브로슈어 문구 절대 금지. GPT 파워블로거 방문 칼럼 톤. 구조: 소식→도착 분위기→체감→차별→방문 전 참고→마무리.`;
      raw = await callOpenAIChat(benchRetry, { temperature: 0.5, maxTokens: 6500 });
      parsed = parseLlmBlogResponse(raw, ctx);
      if (tierAccepts(parsed, intentInput)) {
        parsed = normalizeLlmVoiceForDelivery(parsed, intentInput);
        finished = finishSovereignPack(parsed, intentInput);
      }
    }
    return finished;
  } catch {
    return null;
  }
}

/**
 * 템플릿·오염 팩 → sovereign LLM 전면 교체
 */
export async function upgradeVisitReviewPackViaSovereign(pack, input = {}) {
  if (!isVisitReviewSovereignEnabled()) return null;
  if (!needsVisitReviewSovereignUpgrade(pack, input)) {
    return pack?._meta?.visitReviewSovereignLlm ? pack : null;
  }
  const fresh = await generateVisitReviewSovereignPack(input, pack);
  if (fresh?.sections?.length) return fresh;
  return null;
}
