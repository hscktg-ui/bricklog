/**
 * LLM human-tier expansion — 짧은 원고를 GPT로 substantive 확장 (템플릿 패딩 대체)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import {
  DEFAULT_BLOG_LENGTH_TIER,
  resolveBlogLengthTier,
} from "@/lib/constants";
import { formatResearchFactsForPrompt } from "@/lib/content/v2ResearchFacts";
import { isHumanTierMet } from "@/lib/product/humanTierRegen";
import { HUMAN_MIN_SECTIONS } from "@/lib/product/deliveryGrade";
import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { parseLlmBlogResponse } from "@/lib/llm/postProcessLlmBlog";
import { buildHumanVoiceWriterBrief } from "@/lib/content/humanVoiceDeliveryPass";
import { buildNarrativeArcWriterBrief } from "@/lib/product/narrativeArcShapeEngine";
import { normalizeLlmVoiceForDelivery } from "@/lib/golden/llmDeliveryPolish";

function tierMinNote(input = {}) {
  const tier = resolveBlogLengthTier(
    input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER
  );
  return `반드시 ${tier.min}자(공백 포함) 이상. 섹션별 구체 장면·비교·선택 기준 추가.`;
}

function researchFactHints(input = {}, ctx = {}, limit = 12) {
  const fromPrompt = formatResearchFactsForPrompt(
    input.researchFacts || ctx.researchFacts || [],
    limit
  );
  if (fromPrompt) return fromPrompt;
  return "";
}

function buildDensityRules(contract = null) {
  const gaps = (contract?.reasons || [])
    .filter((r) =>
      [
        "topic_dominance_low",
        "information_yield_low",
        "duplicate_killer_fail",
        "duplicate_content",
        "experience_voice_low",
        "magazine_arc_weak",
        "tone_bookend_mismatch",
        "topic_thread_weak",
        "mission_pad_jumble",
      ].includes(r)
    )
    .join(", ");
  if (!gaps) {
    return "Each section must introduce a NEW fact or scene; never repeat the same keyword cluster twice in a row.";
  }
  return `Fix quality gaps (${gaps}): vary section topics, one unique research fact per section, no template boilerplate, no duplicate sentences.`;
}

function acceptLlmOutput(original, candidate, input = {}, { rewrite = false } = {}) {
  const inChars = countBlogBodyCharsWithSpaces(original);
  const outChars = countBlogBodyCharsWithSpaces(candidate);
  const tier = resolveBlogLengthTier(
    input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER
  );
  if (rewrite) return outChars >= tier.min * 0.85;
  return outChars >= Math.max(inChars * 0.88, tier.min * 0.82);
}

function stampUpgradedColumnMeta(original, next, input = {}, kind = "expansion") {
  const inboundChars = countBlogBodyCharsWithSpaces(original);
  const outChars = countBlogBodyCharsWithSpaces(next);
  const meta = { ...(original._meta || {}) };
  delete meta.missionProseFallback;
  delete meta.draftFallback;
  meta.deliveryRescue = undefined;
  return {
    ...next,
    _meta: {
      ...meta,
      llmGenerated: true,
      generationMode: "llm_human_column",
      llmHumanTierExpansion: kind === "expansion" || meta.llmHumanTierExpansion,
      llmHumanColumnRewrite: kind === "rewrite" || meta.llmHumanColumnRewrite,
      llmExpansionInboundChars: inboundChars,
      llmExpansionOutboundChars: outChars,
      writerEngineUpgradedFromFallback: Boolean(
        original._meta?.missionProseFallback ||
          original._meta?.deliveryRescue ||
          original._meta?.generationMode === "mission_prose_fallback"
      ),
    },
  };
}

function mergeExpansionPack(original, expanded, input = {}) {
  if (!acceptLlmOutput(original, expanded, input)) return original;
  return stampUpgradedColumnMeta(original, expanded, input, "expansion");
}

export function buildBlogRewriteMessages(pack, ctx = {}, input = {}, contract = null) {
  const tierKey =
    input.blogLengthTier || ctx.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const tier = resolveBlogLengthTier(tierKey);
  const research = researchFactHints(input, ctx, 16);
  const bodyPreview = getBlogFullText(pack).slice(0, 6000);
  const density = buildDensityRules(contract);

  return [
    {
      role: "system",
      content: `You are BRICLOG Column Writer — rewrite a template draft into a publish-ready Korean human column (person who visited and wrote honestly).
Return ONLY one JSON object:
{"blog":{"titles":["...×5"],"title":"...","representativeTitle":"...","sections":[{"heading":"...","body":"..."}],"conclusion":"...","hashtags":[]}}

Rules:
- Write FRESH from research — discard template phrases like 「헷갈리는 포인트」「정리했습니다」「관련 조건은 제품·시즌에 따라」.
- Target ${tier.min}–${tier.max} chars WITH SPACES; ${HUMAN_MIN_SECTIONS}+ sections; gi(why)→seung(info)→jeon(criteria)→gyeol(wrap) flow in section order.
- ${density}
- Scene-first opening; 솔직히·직접·다녀왔어요·생각보다 3+ times total.
- Korean only; 습니다체; no 해요체; no FAQ/checklist tone.
- ${buildHumanVoiceWriterBrief().replace(/\n/g, " ")}
- ${buildNarrativeArcWriterBrief(input).replace(/\n/g, " ")}`,
    },
    {
      role: "user",
      content: `Brand: ${input.brandName || ctx.brandName || "—"}
Region: ${input.region || ctx.region || "—"}
Topic: ${input.topic || ctx.topic || "—"}
Industry: ${input.industry || ctx.industryLabel || "—"}
Tier: ${tierKey} (min ${tier.min}, target ${tier.target})

【조사 확정 — 섹션마다 1개 이상 반드시 소비】
${research || "(브랜드·지역·주제 맥락으로 작성)"}

【버릴 템플릿 초안 — 참고만, 문장 복사 금지】
${bodyPreview}`,
    },
  ];
}

/**
 * Mission/rescue fallback — template → human column full rewrite
 */
export async function rewriteFallbackPackToHumanColumnViaLlm(
  pack,
  ctx = {},
  input = {},
  contract = null
) {
  if (!pack?.sections?.length) return pack;

  try {
    const messages = buildBlogRewriteMessages(pack, ctx, input, contract);
    const raw = await callOpenAIChat(messages, {
      temperature: 0.62,
      maxTokens: 5800,
    });
    const parsed = parseLlmBlogResponse(raw, ctx);
    if (!parsed?.sections?.length) return pack;

    let next = parsed;
    if (!acceptLlmOutput(pack, next, input, { rewrite: true })) {
      const retry = buildBlogRewriteMessages(pack, ctx, input, contract);
      retry[1].content += `\n\n【재시도】${tierMinNote(input)} 기(승전결) 구조 필수.`;
      const raw2 = await callOpenAIChat(retry, {
        temperature: 0.55,
        maxTokens: 6000,
      });
      const parsed2 = parseLlmBlogResponse(raw2, ctx);
      if (parsed2?.sections?.length) next = parsed2;
    }

    if (!acceptLlmOutput(pack, next, input, { rewrite: true })) return pack;
    next = normalizeLlmVoiceForDelivery(next, input);
    return stampUpgradedColumnMeta(pack, next, input, "rewrite");
  } catch {
    return pack;
  }
}

export function buildBlogExpansionMessages(pack, ctx = {}, input = {}, contract = null) {
  const tierKey =
    input.blogLengthTier || ctx.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const tier = resolveBlogLengthTier(tierKey);
  const current = countBlogBodyCharsWithSpaces(pack);
  const research = researchFactHints(input, ctx, 14);
  const bodyPreview = getBlogFullText(pack).slice(0, 9000);
  const contractReasons = (contract?.reasons || [])
    .filter((r) => r !== "length_tier_under")
    .slice(0, 6)
    .join(", ");

  return [
    {
      role: "system",
      content: `You are BRICLOG Senior Editor — expand a draft Korean blog to publish-ready human column length.
Return ONLY one JSON object:
{"blog":{"titles":["...×5"],"title":"...","representativeTitle":"...","sections":[{"heading":"...","body":"..."}],"conclusion":"...","hashtags":[]}}

Rules:
- Target ${tier.min}–${tier.max} chars WITH SPACES (current ${current}, need +${Math.max(0, tier.min - current)}).
- Keep ${HUMAN_MIN_SECTIONS}+ sections; each body 2–4 paragraphs of NEW substantive detail.
- Preserve brand voice, facts, headings thread — expand IN PLACE, do not replace with generic filler.
- Use research facts below; no outline, bullet stubs, FAQ tone, or 「확인하세요」 lists.
- Korean only; 습니다체; no 해요체.
- ${buildHumanVoiceWriterBrief().replace(/\n/g, " ")}
- ${buildNarrativeArcWriterBrief(input).replace(/\n/g, " ")}
- ${buildDensityRules(contract)}`,
    },
    {
      role: "user",
      content: `Brand: ${input.brandName || ctx.brandName || "—"}
Region: ${input.region || ctx.region || "—"}
Topic: ${input.topic || ctx.topic || "—"}
Industry: ${input.industry || ctx.industryLabel || "—"}
Tier: ${tierKey} (min ${tier.min}, target ${tier.target})
${contractReasons ? `Quality gaps to fix while expanding: ${contractReasons}` : ""}

【조사 확정】
${research || "(없음 — 브랜드·지역·주제 맥락으로 보강)"}

【현재 초안 — 이 글을 ${tier.min}자 이상으로 확장】
${bodyPreview}`,
    },
  ];
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {object} [input]
 */
export async function expandPackToHumanTierViaLlm(pack, ctx = {}, input = {}, contract = null) {
  if (!pack?.sections?.length) return pack;
  if (isHumanTierMet(pack, input) && contract?.humanVoiceMet) return pack;

  try {
    const initialContract = contract || null;
    const messages = buildBlogExpansionMessages(pack, ctx, input, initialContract);
    const raw = await callOpenAIChat(messages, {
      temperature: 0.58,
      maxTokens: 5200,
    });
    const parsed = parseLlmBlogResponse(raw, ctx);
    if (!parsed?.sections?.length) return pack;

    let next = mergeExpansionPack(pack, parsed, input);
    next = normalizeLlmVoiceForDelivery(next, input);
    if (!isHumanTierMet(next, input)) {
      const retryMessages = buildBlogExpansionMessages(next, ctx, {
        ...input,
        _expansionRetry: true,
      }, initialContract);
      retryMessages[1].content += `\n\n【재시도】아직 ${countBlogBodyCharsWithSpaces(next)}자. ${tierMinNote(input)}`;
      const raw2 = await callOpenAIChat(retryMessages, {
        temperature: 0.52,
        maxTokens: 5600,
      });
      const parsed2 = parseLlmBlogResponse(raw2, ctx);
      if (parsed2?.sections?.length) {
        const merged2 = mergeExpansionPack(next, parsed2, input);
        if (
          countBlogBodyCharsWithSpaces(merged2) >
          countBlogBodyCharsWithSpaces(next)
        ) {
          next = normalizeLlmVoiceForDelivery(merged2, input);
        }
      }
    }
    return next;
  } catch {
    return pack;
  }
}
