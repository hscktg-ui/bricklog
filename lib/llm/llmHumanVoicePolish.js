/**
 * LLM experience-voice polish — tier 충족 후 말투·경험 구어만 GPT로 보강
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { callOpenAIChat } from "@/lib/llm/openaiClient";
import { parseLlmBlogResponse } from "@/lib/llm/postProcessLlmBlog";
import { normalizeLlmVoiceForDelivery } from "@/lib/golden/llmDeliveryPolish";
import { buildHumanVoiceWriterBrief } from "@/lib/content/humanVoiceDeliveryPass";

function mergeVoicePolishPack(original, polished) {
  const inboundChars = countBlogBodyCharsWithSpaces(original);
  const outChars = countBlogBodyCharsWithSpaces(polished);
  if (outChars < inboundChars * 0.92) return original;

  return {
    ...polished,
    title: original.title || polished.title,
    representativeTitle:
      original.representativeTitle || polished.representativeTitle,
    titles: original.titles?.length ? original.titles : polished.titles,
    _meta: {
      ...(original._meta || {}),
      llmHumanVoicePolish: true,
      llmVoiceInboundChars: inboundChars,
      llmVoiceOutboundChars: outChars,
      generationMode: original._meta?.generationMode || "llm_openai",
      llmGenerated: true,
    },
  };
}

export function buildVoicePolishMessages(pack, ctx = {}, input = {}, contract = {}) {
  const current = countBlogBodyCharsWithSpaces(pack);
  const reasons = (contract.reasons || []).slice(0, 8).join(", ") || "experience_voice_low";
  const bodyPreview = getBlogFullText(pack).slice(0, 9000);

  return [
    {
      role: "system",
      content: `You are BRICLOG Column Voice Editor — rewrite a Korean blog to sound like a person who visited and wrote honestly.
Return ONLY one JSON object:
{"blog":{"titles":["...×5"],"title":"...","representativeTitle":"...","sections":[{"heading":"...","body":"..."}],"conclusion":"...","hashtags":[]}}

Rules:
- Keep ${current}±120 chars WITH SPACES — do NOT shorten below ${Math.round(current * 0.92)}.
- Keep same section headings and factual claims; improve voice only.
- Add 솔직히·직접·다녀왔어요·생각보다·처음엔…했는데 등 경험 구어 3회 이상.
- Remove brochure/FAQ/「확인하세요」/「소개해 드립니다」/「많은 분들이」 tone.
- Korean only; 습니다체; no 해요체.
- ${buildHumanVoiceWriterBrief().replace(/\n/g, " ")}`,
    },
    {
      role: "user",
      content: `Brand: ${input.brandName || ctx.brandName || "—"}
Region: ${input.region || ctx.region || "—"}
Topic: ${input.topic || ctx.topic || "—"}
Voice gaps: ${reasons}

【현재 원고 — 말투만 사람 칼럼으로】
${bodyPreview}`,
    },
  ];
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {object} [input]
 * @param {object} [contract]
 */
export async function polishPackExperienceVoiceViaLlm(
  pack,
  ctx = {},
  input = {},
  contract = {}
) {
  if (!pack?.sections?.length) return pack;
  if (contract?.humanVoiceMet) return pack;

  try {
    const messages = buildVoicePolishMessages(pack, ctx, input, contract);
    const raw = await callOpenAIChat(messages, {
      temperature: 0.42,
      maxTokens: 4800,
    });
    const parsed = parseLlmBlogResponse(raw, ctx);
    if (!parsed?.sections?.length) return pack;

    return normalizeLlmVoiceForDelivery(
      mergeVoicePolishPack(pack, parsed),
      input
    );
  } catch {
    return pack;
  }
}
