/**
 * STEP 2 — Brand Profile Generation (조사·입력·메모리만)
 */
import { sanitizeText, isJunkValue } from "@/utils/sanitizeInput";
import { runBrandResearchEngine } from "@/lib/research/brandResearchEngine";
import { getBrandLearningBrief } from "@/lib/learning/brandLearning";

function pick(...vals) {
  for (const v of vals) {
    if (v && !isJunkValue(v)) return String(v).trim();
  }
  return null;
}

export function shouldRunBrandResearch(profile = {}) {
  return !!(
    profile.brandName ||
    profile.mainKeyword?.length >= 2 ||
    profile.storeFeatures ||
    profile.brandDescription
  );
}

export function generateBrandProfile(input = {}, understood = {}, brandMemory = null) {
  const brandResearch = shouldRunBrandResearch(understood)
    ? runBrandResearchEngine({
        ...input,
        brandName: understood.brand || input.brandName,
        region: understood.region || input.region,
        industryKey: understood.industryKey || input.industryKey,
        industryLabel: understood.industry,
        mainKeyword: understood.mainKeyword || input.mainKeyword,
        purposeType: input.purposeType,
        includePhrases: understood.includePhrases || input.includePhrases,
        storeFeatures: understood.storeFeatures,
        brandDescription: understood.brandDescription,
      })
    : null;

  const summary = brandResearch?.summary || {};
  const memoryBrief = brandMemory ? getBrandLearningBrief(brandMemory) : "";

  const profile = {
    brandName: pick(understood.brand, input.brandName),
    industry: pick(understood.industry, summary.industry, input.industryLabel),
    industryKey: understood.industryKey || input.industryKey || null,
    region: pick(understood.region, brandResearch?.region, input.region),
    mainServices: pick(
      understood.service,
      input.benefit,
      summary.operationStyle
    ),
    mainProducts: pick(understood.product, understood.mainKeyword, input.mainKeyword),
    differentiator: pick(
      summary.uniqueness,
      summary.coreStrengths?.[0],
      understood.storeFeatures
    ),
    brandPhilosophy: pick(
      brandMemory?.brandMood,
      brandResearch?.brandProfile?.brandMood,
      summary.brandTraits?.[0]
    ),
    customerSegment: pick(
      understood.customer,
      brandMemory?.targetAudience,
      summary.customerInterests?.[0]
    ),
    operationStyle: pick(summary.operationStyle, understood.storeFeatures),
    toneAndManner: pick(
      brandMemory?.writingStyle,
      brandMemory?.tone,
      brandResearch?.inferredTraits?.tone,
      input.tone
    ),
    recentActivity: summary.recentIssues?.[0] || null,
    recentEvent: understood.event || null,
    seasonality: understood.season || null,
    memoryBrief: memoryBrief || null,
    sourceStatus: brandResearch?.sourceStatus || "user_input_only",
    noCopyRule: brandResearch?.noCopyRule || "원문·출처 복사 금지 — 재해석만 사용",
  };

  const filled = Object.values(profile).filter((v) => v && !isJunkValue(v)).length;

  return {
    profile,
    brandResearch,
    ready: filled >= 4,
    itemCount: filled,
  };
}
