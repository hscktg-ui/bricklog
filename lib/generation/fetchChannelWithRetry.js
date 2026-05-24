import { generateChannelPipelineAsync } from "@/lib/contentPipeline";
import { isGenerationTimeoutError } from "@/lib/generation/normalizeGenerationError";

export async function fetchChannelWithRetry(channel, pipelineInput, hooks = {}) {
  const { onRetry, setPipelineStep } = hooks;
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (attempt > 1) {
        setPipelineStep?.("다시 연결하는 중…");
        onRetry?.(attempt);
        await new Promise((r) => setTimeout(r, 900));
      }
      return await generateChannelPipelineAsync(channel, pipelineInput);
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
