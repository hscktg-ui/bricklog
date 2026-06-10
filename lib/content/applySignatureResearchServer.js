/**
 * 서버(검수 API 등) — V2/V3 조사·검증 brief (클라이언트 fetch 없이 runResearch 직접 호출)
 */
import {
  buildBrandAxisBrief,
  buildRegionAxisBrief,
  buildV2AxisResearchQuery,
  parseV2AxisResearch,
} from "@/lib/content/v2AxisResearch";
import { runBrandResearchEngine } from "@/lib/research/brandResearchEngine";
import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";
import { buildResearchBrief } from "@/lib/research/buildResearchBrief";
import { defaultAutoResearchTypes } from "@/lib/research/needsOnlineResearch";
import { verifyPreWriteResearch } from "@/lib/content/v2PipelineGate";
import { runV3PreWriteEnrichment } from "@/lib/content/v3/pipeline";
import { runResearch } from "@/lib/research/runResearch";
import { runResearchDepthCascade } from "@/lib/content/researchDepthEngine";
import { discoverClues } from "@/lib/content/clueDiscoveryEngine";
import { prepareBriclogPreWriteContext } from "@/lib/content/briclogPreWriteContext";
import {
  buildCustomerQuestionAnalysis,
  formatCustomerQuestionBrief,
} from "@/lib/content/customerQuestionEngine";
import { normalizeResearchTypes } from "@/lib/research/types";
import { withSignatureEnforcement } from "@/lib/content/channelPack";
import { getResearchDepthMaxRounds } from "@/lib/config/briclogFastPipeline";
import {
  runResearchFirstPipeline,
  stampResearchFirstOnInput,
} from "@/lib/product/briclogResearchFirstPipeline";
import { isBriclogResearchFirstEnforced } from "@/lib/config/researchFirstFlags";
import { stampBrandContentOSOnInput } from "@/lib/product/briclogBrandContentOS";

export async function applySignatureResearchServer(input = {}, channel = "blog") {
  const enriched = withSignatureEnforcement(input, channel);
  const brand = String(enriched.brandName || "").trim();
  const region = String(enriched.region || "").trim();
  const topic =
    String(enriched.topic || "").trim() ||
    String(enriched.mainKeyword || "").trim();

  if (!brand || !region || !topic) {
    return { ok: false, insufficient: true, input: enriched };
  }

  const clueDiscovery = discoverClues(enriched);
  enriched.clueDiscovery = clueDiscovery;
  const preWrite = prepareBriclogPreWriteContext(enriched);
  Object.assign(enriched, {
    knowledgeCoverage: preWrite.knowledgeCoverage,
    coverageMapBrief: preWrite.coverageMapBrief,
    searchExpansion: preWrite.searchExpansion,
    brandContentBrief: preWrite.brandContentBrief,
  });

  const brandResearch = runBrandResearchEngine(enriched);
  const brandBrief = buildBrandAxisBrief(enriched, brandResearch);
  const query = buildV2AxisResearchQuery(enriched);
  const types = normalizeResearchTypes(
    enriched.researchTypes || defaultAutoResearchTypes(enriched)
  );
  const regionHints = buildRegionKeywordHints(enriched);

  let research = null;
  try {
    research = await runResearch({
      query,
      types,
      brandContext: {
        brandName: brand,
        region,
        industry: enriched.industry,
        mainKeyword: enriched.mainKeyword,
        topic,
        brandDescription: enriched.brandDescription,
        clueDiscovery,
        searchExpansion: enriched.searchExpansion,
      },
      mode: enriched.researchMode || "v2_axis",
      regionKeywordHints: regionHints,
    });
  } catch {
    research = null;
  }

  const depthRun = await runResearchDepthCascade({
    input: enriched,
    types,
    regionKeywordHints: regionHints,
    primaryResearch: research,
    brandResearch,
    runResearch,
    maxRounds: getResearchDepthMaxRounds(false),
  });

  research = depthRun.research;

  const parsed = parseV2AxisResearch(research, enriched, brandResearch, {
    facts: depthRun.facts,
    depth: depthRun.depth,
  });

  if (!parsed.ok) {
    return { ok: false, insufficient: true, input: enriched, parsed };
  }

  const preWriteVerification = verifyPreWriteResearch(parsed, research);
  if (!preWriteVerification.ok) {
    return { ok: false, insufficient: true, input: enriched, preWriteVerification };
  }

  const v3 = runV3PreWriteEnrichment({
    input: enriched,
    brandResearch,
    parsed,
    research,
    regionHints,
  });
  if (!v3.ok) {
    return { ok: false, insufficient: true, input: enriched, v3 };
  }

  const customerQuestionMap = buildCustomerQuestionAnalysis(enriched, {
    researchFacts: parsed.facts,
    research,
    v3,
  });
  const customerQuestionBrief = formatCustomerQuestionBrief(customerQuestionMap);

  const regionBrief = buildRegionAxisBrief(enriched);
  const combinedBrief = [
    clueDiscovery.brief,
    brandBrief,
    regionBrief,
    v3.v3MasterBrief,
    parsed.brief,
    research?.knowledgeMapPrompt,
    enriched.coverageMapBrief,
    customerQuestionBrief,
    buildResearchBrief(research, { query, types }),
  ]
    .filter(Boolean)
    .join("\n\n");

  let out = {
    ...enriched,
    researchBrief: combinedBrief,
    v2AxisBrief: combinedBrief,
    v2ProductName: parsed.productName,
    regionKeywordHints: regionHints,
    researchFacts: parsed.facts,
    researchFactCount: parsed.factCount,
    researchDepthTier: parsed.depthTier,
    clueDiscovery,
    factsPrompt: parsed.factsPrompt,
    knowledgeMapBrief: research?.knowledgeMapPrompt || "",
    coverageMapBrief: enriched.coverageMapBrief || "",
    knowledgeMap: research?.knowledgeMap || null,
    knowledgeCoverage: enriched.knowledgeCoverage,
    searchExpansion: research?.searchExpansion || enriched.searchExpansion,
    v2ResearchReady: true,
    v2PreWriteVerified: true,
    v2PreWriteVerification: preWriteVerification,
    v2PipelineStage: "research_verified",
    v3PreWriteVerified: true,
    v3MasterBrief: v3.v3MasterBrief,
    v3ContentStrategy: v3.strategy,
    v3SeoStrategy: v3.seoStrategy,
    v3BrandAnalysis: v3.brandAnalysis,
    v3RegionAnalysis: v3.regionAnalysis,
    v3TopicAnalysis: v3.topicAnalysis,
    v3Verification: v3.verification,
    customerQuestionMap,
    customerQuestionBrief,
  };

  if (isBriclogResearchFirstEnforced()) {
    const dossier = runResearchFirstPipeline(out, { parsed, research });
    out = stampBrandContentOSOnInput(stampResearchFirstOnInput(out, dossier));
    if (!dossier.writable) {
      return {
        ok: false,
        insufficient: true,
        input: out,
        researchFirstBlocked: true,
        failReasons: dossier.failReasons,
        userMessage:
          out.researchFirstDossier?.failReasons?.includes("brand_missing")
            ? "브랜드 정보가 없어 조사를 시작할 수 없어요."
            : "조사가 아직 충분하지 않아 글을 쓰지 않았어요.",
      };
    }
    out.researchBrief = [out.contentOperatingPlanBrief, combinedBrief, out.researchFirstBrief]
      .filter(Boolean)
      .join("\n\n");
    out.v2AxisBrief = out.researchBrief;
  }

  return { ok: true, input: out, research, parsed };
}
