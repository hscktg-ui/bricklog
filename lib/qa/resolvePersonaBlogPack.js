/**
 * 10 페르소나 등 QA — OpenAI 연결 시 LLM 본문, 없으면 검색 보강 초안
 */
import { normalizePipelineInput } from "@/lib/contentPipeline";
import { applyPipelineQualityDefaults } from "@/lib/quality/qualityDefaults";
import { isOpenAIConfigured } from "@/lib/llm/llmProvider";
import { generateBlogWithLLMFirst } from "@/lib/llm/contentOrchestrator";
import {
  enrichMinimalBlogInput,
  buildDeliverableBlogFallback,
} from "@/lib/llm/blogDeliveryFallback";
import { applyV4SpeakerToInput } from "@/lib/persona/v4Speakers";
import { applyV2PersonaToInput } from "@/lib/constitution/writingConstitutionV2";
import { createPromptContext } from "@/utils/promptBuilder";
import { prepareUltimateBlogContext } from "@/lib/ultimate/runUltimateEngine";
import { enrichInputForGeneration } from "@/lib/content/enrichGenerationInput";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";

/**
 * @param {Record<string, unknown>} rawInput
 * @param {{ v4Speaker?: string }} persona
 */
export async function resolvePersonaBlogPack(rawInput = {}, persona = {}) {
  const normalized = applyPipelineQualityDefaults(
    normalizePipelineInput({
      ...rawInput,
      v4Speaker: persona.v4Speaker || rawInput.v4Speaker || "auto",
    })
  );
  const input = enrichInputForGeneration(
    applyV2PersonaToInput(
      applyV4SpeakerToInput(enrichMinimalBlogInput(normalized))
    )
  );

  if (isOpenAIConfigured()) {
    try {
      const gen = await generateBlogWithLLMFirst(input);
      const pack = gen.blogContent;
      if (pack?.sections?.length && !gen.withheld) {
        return {
          pack,
          mode: gen.mode || "llm",
          qualityScore:
            pack._meta?.qualityScore?.total ??
            pack._meta?.coreQuality?.total ??
            gen.meta?.qualityScore ??
            null,
        };
      }
    } catch {
      /* fallback below */
    }
  }

  if (isBriclogMissionEnforced()) {
    const { pack, source } = buildDeliverableBlogFallback({
      input,
      prep: null,
      failures: ["persona_qa_fallback"],
    });
    if (pack?.sections?.length) {
      const mode =
        source === "mission_prose_fallback"
          ? "mission_fallback"
          : source === "prose_fallback" || source === "search_brief"
            ? "search_enriched_draft"
            : source || "mission_fallback";
      return { pack, mode, qualityScore: null };
    }
    return { pack: null, mode: "withheld", qualityScore: null };
  }

  const ctx = createPromptContext(input);
  const prep = prepareUltimateBlogContext({ ...ctx, ...input });
  const { pack, source } = buildDeliverableBlogFallback({
    input,
    prep: prep.ok ? prep : null,
    failures: ["persona_qa_fallback"],
  });
  if (pack?.sections?.length) {
    const mode =
      source === "prose_fallback" || source === "search_brief"
        ? "search_enriched_draft"
        : source || "search_enriched_draft";
    return { pack, mode, qualityScore: null };
  }

  const topic =
    input.topic?.trim() ||
    input.mainKeyword?.trim() ||
    input.brandName?.trim() ||
    "주제";
  return {
    pack: {
      title: topic,
      representativeTitle: topic,
      sections: [{ heading: "주제", body: topic }],
      conclusion: "",
      _meta: { generationMode: "form_proxy" },
    },
    mode: "form_proxy",
    qualityScore: null,
  };
}
