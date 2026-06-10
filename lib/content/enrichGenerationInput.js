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
  return attachPreWriteContextToPipeline({ ...base }, preWrite);
}
