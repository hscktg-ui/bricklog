import { generateBlogPipelineAsync } from "@/lib/contentPipeline";
import { isGenerationTimeoutError } from "@/lib/generation/normalizeGenerationError";

/**
 * 타임아웃·일시 네트워크 오류 시 1회 자동 재시도
 */
export async function fetchBlogWithRetry(pipelineInput, hooks = {}) {
  const { onRetry, setPipelineStep } = hooks;
  let lastError;
  let input = pipelineInput;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (attempt > 1) {
        input = {
          ...pipelineInput,
          _skipDefaultResearch: true,
        };
        setPipelineStep?.("다시 연결하는 중…");
        onRetry?.(attempt);
        await new Promise((r) => setTimeout(r, 900));
      }
      return await generateBlogPipelineAsync(input);
    } catch (err) {
      lastError = err;
      const retryable =
        attempt < 2 &&
        (isGenerationTimeoutError(err) ||
          err?.message === "Failed to fetch" ||
          err?.name === "TypeError");
      if (!retryable) throw err;
    }
  }
  throw lastError;
}
