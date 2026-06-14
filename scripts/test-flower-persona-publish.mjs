/**
 * 꽃집 페르소나 publishReady 회귀 — t0316 · t0513 (야간 배치 엣지)
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
import { scoreGoldenIndustryFit } from "../lib/golden/goldenIndustryFitEngine.js";
import { getBlogFullText } from "../utils/qualityCheck.js";

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

async function runCase(id) {
  const persona = getThousandUserPersona(id);
  const input = enrichInputForGeneration(
    applyV2PersonaToInput(
      applyV4SpeakerToInput(enrichMinimalBlogInput(personaToInput(persona)))
    )
  );
  const { pack: raw } = await resolvePersonaBlogPack(input, {
    v4Speaker: persona.v4Speaker,
  });
  const pack = finalizeContentQualityForDelivery(raw, input, "blog");
  const full = getBlogFullText(pack);
  const industryFit = scoreGoldenIndustryFit(full, input);
  return {
    id,
    golden: pack._meta?.goldenGate?.score ?? 0,
    haeshin: pack._meta?.goldenGate?.haeshin?.score ?? 0,
    publishReady: pack._meta?.publishReady === true,
    sqv: pack._meta?.sqv?.score ?? 0,
    foreignHits: industryFit.foreignHits,
    flowerEd: pack._meta?.flowerRecommendationEditorial === true,
  };
}

const cases = ["t0316", "t0513", "t0517", "t0311"];
const results = [];
for (const id of cases) {
  results.push(await runCase(id));
}

for (const r of results) {
  if (!r.flowerEd) {
    console.error(`FAIL ${r.id}: flowerRecommendationEditorial missing`);
    process.exit(1);
  }
  if (r.foreignHits.length > 0) {
    console.error(`FAIL ${r.id}: foreign industry hits`, r.foreignHits);
    process.exit(1);
  }
  if (r.golden < 72) {
    console.error(`FAIL ${r.id}: golden ${r.golden} < 72`);
    process.exit(1);
  }
  if (!r.publishReady) {
    console.error(`FAIL ${r.id}: publishReady false (golden=${r.golden}, sqv=${r.sqv})`);
    process.exit(1);
  }
}

console.log(
  "PASS flower persona publish",
  results.map((r) => `${r.id}:golden=${r.golden},sqv=${r.sqv}`).join(" · ")
);
