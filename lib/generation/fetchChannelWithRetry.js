import { generateChannelPipelineAsync } from "@/lib/contentPipeline";
import { isGenerationTimeoutError } from "@/lib/generation/normalizeGenerationError";
import { isChannelStandaloneFastInput } from "@/lib/config/briclogFastPipeline";

export async function fetchChannelWithRetry(channel, pipelineInput, hooks = {}) {
  const { onRetry, setPipelineStep } = hooks;
  const maxAttempts = isChannelStandaloneFastInput({
    ...pipelineInput,
    contentChannel: channel,
  })
    ? 1
    : 2;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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
        attempt < maxAttempts &&
        (isGenerationTimeoutError(err) ||
          err?.message === "Failed to fetch" ||
          err?.name === "TypeError");
      if (!retryable) throw err;
    }
  }
  throw lastError;
}
