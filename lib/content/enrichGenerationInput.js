/**
 * LLM·API 생성 직전 — pre-write(조사·위키·화자·목적) 컨텍스트 주입
 */
import { attachPublishPurpose } from "@/lib/content/publishPurposeEngine";
import {
  attachPreWriteContextToPipeline,
  prepareBriclogPreWriteContext,
} from "@/lib/content/briclogPreWriteContext";

/**
 * @param {Record<string, unknown>} input
 * @returns {Record<string, unknown>}
 */
export function enrichInputForGeneration(input = {}) {
  const withPurpose = attachPublishPurpose({ ...input });
  const preWrite = prepareBriclogPreWriteContext(withPurpose);
  return attachPreWriteContextToPipeline({ ...withPurpose }, preWrite);
}
