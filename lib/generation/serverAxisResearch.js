/**
 * 서버 — 클라이언트 축 조사 미완 시 applyV2AxisResearch 실행 (API·hydrate 공통)
 */
import { applyV2AxisResearch } from "@/lib/content/applyV2AxisResearch";
import { isClientAxisResearchComplete } from "@/lib/content/v2PipelineGate";
import { hasFilledBlogAxes } from "@/lib/product/deliverySoftPass";
import { ensureGenerationAxesOnInput } from "@/lib/workspace/brandFormSync";
import { runResearch } from "@/lib/research/runResearch";
import { resolveResearchQueryAndTypes } from "@/lib/research/resolveResearchConfig";
import { buildRegionKeywordHints } from "@/lib/content/regionKeywordHints";
import { formatCustomerResearchBlockMessage } from "@/lib/product/researchReadiness";
import { getResearchClientTimeoutMs, getLaunchResearchTimeoutMs } from "@/lib/config/briclogFastPipeline";
import { isLaunchPublishFirstMode } from "@/lib/config/launchPublishFlags";
import { sanitizeGenerationInputResearch } from "@/lib/content/researchFactSanitize";

async function serverGenerateResearchAsync(input = {}) {
  const researchConfig = resolveResearchQueryAndTypes(input);
  const { query, types } = researchConfig;
  const regionKeywordHints = buildRegionKeywordHints(input);
  const timeoutMs = isLaunchPublishFirstMode()
    ? getLaunchResearchTimeoutMs()
    : getResearchClientTimeoutMs(input);
  const research = await Promise.race([
    runResearch({
      query,
      types,
      brandContext: {
        brandName: input.brandName,
        region: input.region,
        industry: input.industry,
        mainKeyword: input.mainKeyword,
        topic: input.topic || input.mainKeyword,
        brandDescription: input.brandDescription,
        clueDiscovery: input.clueDiscovery,
      },
      mode: input.researchMode || "v2_axis",
      regionKeywordHints,
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("research_time_budget_exceeded")), timeoutMs)
    ),
  ]);
  return { research };
}

/**
 * @param {object} input
 * @returns {Promise<{ ok: boolean, input: object, userMessage?: string, reasons?: string[] }>}
 */
export async function ensureServerAxisResearch(input = {}) {
  if (typeof window !== "undefined") {
    return { ok: true, input };
  }
  Object.assign(input, ensureGenerationAxesOnInput(input));
  if (isClientAxisResearchComplete(input)) {
    return { ok: true, input: sanitizeGenerationInputResearch(input) };
  }
  if (!hasFilledBlogAxes(input)) {
    return {
      ok: false,
      input,
      userMessage: "브랜드 · 지역 · 주제를 모두 입력해 주세요.",
      reasons: ["missing_axes"],
    };
  }

  const pipelineInput = { ...input };
  pipelineInput.v2AxisRequired = pipelineInput.v2AxisRequired !== false;
  pipelineInput.v2PipelineEnforced = true;
  pipelineInput.v3EngineEnforced = pipelineInput.v3EngineEnforced !== false;

  try {
    const axis = await applyV2AxisResearch({
      pipelineInput,
      generateResearchAsync: serverGenerateResearchAsync,
    });
    if (!axis.ok) {
      return {
        ok: false,
        input: pipelineInput,
        userMessage:
          axis.userMessage ||
          formatCustomerResearchBlockMessage(pipelineInput, axis.reasons || ["research_empty"]),
        reasons: axis.reasons || ["axis_research_failed"],
      };
    }
    return {
      ok: true,
      input: sanitizeGenerationInputResearch(pipelineInput),
      factCount: axis.factCount,
    };
  } catch {
    return {
      ok: false,
      input: pipelineInput,
      userMessage: formatCustomerResearchBlockMessage(pipelineInput, ["research_empty"]),
      reasons: ["server_axis_exception"],
    };
  }
}
