/** 생성 대기 시간 안내용 — Tri-AI Fast Pipeline 기준 */

import { getGenerationTimeBudgetMs } from "@/lib/config/briclogFastPipeline";

export function estimateBlogGenerationMs(
  input,
  { blogOnly = true, withDefaultResearch = false } = {}
) {
  let ms = blogOnly ? 38_000 : 48_000;
  const hasResearch =
    input?.researchEnabled ||
    withDefaultResearch ||
    Boolean(
      String(input?.brandName || "").trim() &&
        (String(input?.topic || "").trim() || String(input?.mainKeyword || "").trim())
    );
  if (hasResearch) ms += 16_000;
  if (input?.desiredLength === "long" || input?.blogLengthTier === "long") {
    ms += 8_000;
  }
  return Math.min(ms, getGenerationTimeBudgetMs());
}

export function formatDurationKo(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0 && s > 0) return `${m}분 ${s}초`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}
