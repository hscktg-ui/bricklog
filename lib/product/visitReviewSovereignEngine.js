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
import { isVisitReviewTopicInput } from "@/lib/content/topicFacetEngine";
import {
  detectVisitReviewTemplateContamination,
  applyVisitReviewTopicPackGate,
} from "@/lib/content/visitReviewTopicGate";
import { buildVisitReviewUnifiedProsePromptBlock } from "@/lib/content/visitReviewUnifiedProseEngine";
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

export const VISIT_REVIEW_SOVEREIGN_VERSION = "visit-review-sovereign-v1";

const ENGINE_SPAM_RES = [
  /덜\s*헷갈릴까요/,
  /대표\s*서비스/,
  /방문·상담/,
  /비교가\s*수월/,
  /비교하면\s*수월/,
  /목적별로\s*나눠/,
  /매장·상담에서\s*확인/,
  /왜\s*지금\s*는지/,
  /브랜드\s*자주\s*비교되는/,
  /단정해서\s*볼\s*일은\s*아닌/,
  /현장\s*쇼룸\s*현장\s*쇼룸/,
];

export function isVisitReviewSovereignEnabled() {
  if (process.env.BRICLOG_VISIT_REVIEW_SOVEREIGN === "false") return false;
  return isOpenAIConfigured();
}

/** 오픈·체험·수영 등 + 방문 의도 — 후기 라우팅 확장 */
export function isVisitReviewSovereignEligible(input = {}) {
  if (isVisitReviewTopicInput(input)) return true;
  const blob = [
    input.topic,
    input.mainKeyword,
    input.includePhrases,
    input.representativeTitle,
    input.title,
  ]
    .filter(Boolean)
    .join(" ");
  if (/솔직|후기|다녀|직접\s*둘러|방문/.test(blob) && /오픈|수영|체험|목장|승마|워터|풀장/.test(blob)) {
    return true;
  }
  return false;
}

function hasEngineSpamText(pack) {
  const full = getBlogFullText(pack);
  return ENGINE_SPAM_RES.some((re) => re.test(full));
}

export function needsVisitReviewSovereignUpgrade(pack, input = {}) {
  if (!isVisitReviewSovereignEligible(input)) {
    return false;
  }
  if (!pack?.sections?.length) return true;
  if (pack._meta?.visitReviewSovereignLlm) return false;
  if (isMissionFallbackPack(pack, input)) return true;
  if (!isLlmOriginatedPack(pack, input)) return true;
  if (hasEngineSpamText(pack)) return true;
  const contam = detectVisitReviewTemplateContamination(pack, input);
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

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      visitReviewSovereignLlm: true,
      visitReviewSovereignVersion: VISIT_REVIEW_SOVEREIGN_VERSION,
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

  return [
    {
      role: "system",
      content: `You are a Korean leisure blogger writing a natural visit review after a real trip (like Naver blog top posts — NOT brochure, NOT SEO template).

Return ONLY one JSON object:
{"blog":{"titles":["...×5"],"title":"...","representativeTitle":"...","sections":[{"heading":"...","body":"..."}],"conclusion":"...","hashtags":[]}}

Write FRESH from research — do NOT copy template phrases.

Structure (adapt headings to topic):
1) Seasonal/situational opening — why this visit matters now
2) First impression on arrival (space, mood, who it's good for)
3) Core experience (what you saw/felt on site — concrete)
4) What makes this place different from generic alternatives
5) Practical notes before visiting (hours, booking, season — only if in research)
6) Short personal wrap-up

Rules:
- ${tier.min}–${tier.max} Korean chars WITH SPACES; at least ${HUMAN_MIN_SECTIONS} sections
- 2–4 connected paragraphs per section; no staccato brochure lines
- Use research facts; do not invent pools, menus, or prices not in research
- Polite ~습니다/~입니다 prose (natural blog tone)
- FORBIDDEN phrases: 「비교 기준」「대표 서비스」「방문·상담」「덜 헷갈릴까요」「비교가 수월」「목적별로 나눠」「매장·상담에서 확인」「브랜드 자주 비교되는」
- No keyword loops (repeating brand+topic in every sentence)
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
export async function generateVisitReviewSovereignPack(input = {}) {
  if (!isVisitReviewSovereignEnabled() || !isVisitReviewSovereignEligible(input)) {
    return null;
  }
  const ctx = createPromptContext(input);
  try {
    const messages = buildVisitReviewSovereignMessages(input, ctx);
    let raw = await callOpenAIChat(messages, {
      temperature: 0.58,
      maxTokens: 6200,
    });
    let parsed = parseLlmBlogResponse(raw, ctx);
    if (!tierAccepts(parsed, input)) {
      const retry = buildVisitReviewSovereignMessages(input, ctx);
      retry[1].content += `\n\n【재시도】분량 ${resolveBlogLengthTier(input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER).min}자 이상. 섹션마다 현장 묘사 2문단 이상.`;
      raw = await callOpenAIChat(retry, { temperature: 0.52, maxTokens: 6500 });
      parsed = parseLlmBlogResponse(raw, ctx);
    }
    if (!tierAccepts(parsed, input)) return null;
    parsed = normalizeLlmVoiceForDelivery(parsed, input);
    return finishSovereignPack(parsed, input);
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
  const fresh = await generateVisitReviewSovereignPack(input);
  if (fresh?.sections?.length) return fresh;
  return null;
}
