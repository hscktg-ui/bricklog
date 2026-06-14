/**
 * Flower persona golden/publishReady debug — t0316 · t0513 등
 */
import { getThousandUserPersona } from "../lib/qa/thousandUserPersonas.js";
import { resolvePersonaBlogPack } from "../lib/qa/resolvePersonaBlogPack.js";
import { finalizeContentQualityForDelivery } from "../lib/product/contentQualityDelivery.js";
import { normalizePipelineInput } from "../lib/contentPipeline.js";
import { applyPipelineQualityDefaults } from "../lib/quality/qualityDefaults.js";
import { applyV4SpeakerToInput } from "../lib/persona/v4Speakers.js";
import { applyV2PersonaToInput } from "../lib/constitution/writingConstitutionV2.js";
import { enrichMinimalBlogInput } from "../lib/llm/blogDeliveryFallback.js";
import { enrichInputForGeneration } from "../lib/content/enrichGenerationInput.js";
import { getBlogFullText } from "../utils/qualityCheck.js";
import { scoreGoldenIndustryFit } from "../lib/golden/goldenIndustryFitEngine.js";
import { detectFailureArticlePatterns } from "../lib/golden/goldenFailureDetection.js";

process.env.BRICLOG_MISSION = "true";
process.env.BRICLOG_RESET_QUALITY = "true";

const INDUSTRY_INPUT = {
  flower: { industry: "꽃집", purpose: "season", tone: "emotional" },
};

function personaToInput(persona) {
  const b = persona.brand || {};
  const ind = INDUSTRY_INPUT[persona.industry] || {};
  return applyPipelineQualityDefaults(
    normalizePipelineInput({
      brandName: b.brandName,
      region: b.region,
      topic: b.topic,
      mainKeyword: b.mainKeyword,
      blogLengthTier: persona.blogLengthTier,
      v4Speaker: persona.v4Speaker,
      contentPersona: persona.contentPersona,
      ...ind,
    })
  );
}

const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["t0316", "t0513", "t0016", "t0616"];

for (const id of ids) {
  const persona = getThousandUserPersona(id);
  const input = enrichInputForGeneration(
    applyV2PersonaToInput(
      applyV4SpeakerToInput(enrichMinimalBlogInput(personaToInput(persona)))
    )
  );
  const { pack: raw } = await resolvePersonaBlogPack(input, {
    v4Speaker: persona.v4Speaker,
  });
  if (process.env.DEBUG_RAW === "1") {
    console.log("RAW", id, getBlogFullText(raw).slice(0, 400));
  }
  const pack = finalizeContentQualityForDelivery(raw, input, "blog");
  const full = getBlogFullText(pack);
  const industryFit = scoreGoldenIndustryFit(full, input);
  const failure = detectFailureArticlePatterns(full, input);
  console.log(
    JSON.stringify(
      {
        id,
        speaker: persona.v4Speaker,
        tier: persona.blogLengthTier,
        topic: input.topic,
        flowerEd: pack._meta?.flowerRecommendationEditorial,
        golden: pack._meta?.goldenGate?.score,
        haeshin: pack._meta?.goldenGate?.haeshin?.score,
        publishReady: pack._meta?.publishReady,
        eval: pack._meta?.contentEvaluation?.score,
        sqv: pack._meta?.sqv?.score,
        reasons: pack._meta?.goldenGate?.reasons?.slice(0, 6),
        foreignHits: industryFit.foreignHits,
        failureHits: failure.hits,
        textSample: full.slice(0, 400),
      },
      null,
      2
    )
  );
}
