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
import { normalizeLlmVoiceForDelivery } from "@/lib/golden/llmDeliveryPolish";
import { buildKnowledgeCoverageMap } from "@/lib/content/knowledgeCoverageEngine";

function mergeExpansionPack(original, expanded) {
  const inboundChars = countBlogBodyCharsWithSpaces(original);
  const outChars = countBlogBodyCharsWithSpaces(expanded);
  if (outChars < inboundChars * 0.92) return original;

  return {
    ...expanded,
    title: original.title || expanded.title,
    representativeTitle:
      original.representativeTitle || expanded.representativeTitle,
    titles: original.titles?.length ? original.titles : expanded.titles,
    _meta: {
      ...(original._meta || {}),
      llmHumanTierExpansion: true,
      llmExpansionInboundChars: inboundChars,
      llmExpansionOutboundChars: outChars,
      generationMode: original._meta?.generationMode || "llm_openai",
      llmGenerated: true,
    },
  };
}

export function buildBlogExpansionMessages(pack, ctx = {}, input = {}, contract = null) {
  const tierKey =
    input.blogLengthTier || ctx.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER;
  const tier = resolveBlogLengthTier(tierKey);
  const current = countBlogBodyCharsWithSpaces(pack);
  const research = formatResearchFactsForPrompt(
    input.researchFacts || ctx.researchFacts || [],
    14
  );
  const bodyPreview = getBlogFullText(pack).slice(0, 9000);
  const contractReasons = (contract?.reasons || [])
    .filter((r) => r !== "length_tier_under")
    .slice(0, 6)
    .join(", ");
  let coverageHint = "";
  try {
    const map = buildKnowledgeCoverageMap({ input, ...input, ...ctx });
    const facts = [
      ...(map?.confirmedFacts || []),
      ...(map?.related || []),
    ]
      .slice(0, 10)
      .map((f) => (typeof f === "string" ? f : f?.fact || ""))
      .filter(Boolean);
    if (facts.length) {
      coverageHint = `\n- Each section must consume at least 1 unique fact: ${facts.slice(0, 8).join(" · ")}`;
    }
  } catch {
    /* optional */
  }

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
- ${buildHumanVoiceWriterBrief().replace(/\n/g, " ")}${coverageHint}`,
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

    let next = mergeExpansionPack(pack, parsed);
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
        const merged2 = mergeExpansionPack(next, parsed2);
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

function tierMinNote(input = {}) {
  const tier = resolveBlogLengthTier(
    input.blogLengthTier || DEFAULT_BLOG_LENGTH_TIER
  );
  return `반드시 ${tier.min}자(공백 포함) 이상. 섹션별 구체 장면·비교·선택 기준 추가.`;
}
