/**
 * LLM·API 생성 직전 — pre-write(조사·위키·화자·목적) 컨텍스트 주입
 */
import { attachPublishPurpose } from "@/lib/content/publishPurposeEngine";
import {
  attachPreWriteContextToPipeline,
  prepareBriclogPreWriteContext,
} from "@/lib/content/briclogPreWriteContext";
import { lockIndustryOnInput } from "@/lib/product/industryPipelineRouter";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { loadEvaluateFirstContext } from "@/lib/product/briclogEvaluateFirstPipeline";
import { isBriclogMasterRebuildEnforced } from "@/lib/config/masterRebuildFlags";

/**
 * @param {Record<string, unknown>} input
 * @returns {Record<string, unknown>}
 */
export function enrichInputForGeneration(input = {}) {
  let base = attachPublishPurpose({ ...input });
  if (isBriclogResetQualityEnforced()) {
    base = lockIndustryOnInput(base);
  }
  const preWrite = prepareBriclogPreWriteContext(base);
  let out = attachPreWriteContextToPipeline({ ...base }, preWrite);
  if (isBriclogMasterRebuildEnforced()) {
    const evalCtx = loadEvaluateFirstContext(out);
    out = {
      ...evalCtx.input,
      evaluateFirstSteps: evalCtx.steps,
      masterRebuildContextLoaded: true,
    };
  }
  return out;
}
