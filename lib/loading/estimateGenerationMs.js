/** 생성 대기 시간 안내 — Fast Pipeline 1~2분 UX 목표 */

import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";
import { isClientResearchPreVerified } from "@/lib/config/briclogFastPipeline";

export function estimateBlogGenerationMs(
  input,
  { blogOnly = true, withDefaultResearch = false } = {}
) {
  const preVerified =
    input?.v2ResearchReady &&
    input?.v2PreWriteVerified &&
    (input?.v2PipelineStage === "information_research_verified" ||
      input?.v2AxisVerified);

  const hasResearch =
    input?.researchEnabled ||
    withDefaultResearch ||
    Boolean(
      String(input?.brandName || "").trim() &&
        (String(input?.topic || "").trim() || String(input?.mainKeyword || "").trim())
    );
  const isLong =
    input?.desiredLength === "long" || input?.blogLengthTier === "long";

  if (isBriclogMaxQualityEnabled()) {
    let ms = preVerified ? 90_000 : 240_000;
    if (hasResearch && !preVerified) ms += 60_000;
    if (isLong) ms += 45_000;
    return ms;
  }

  if (isClientResearchPreVerified(input) || preVerified) {
    return blogOnly ? 55_000 : 75_000;
  }

  let ms = blogOnly ? 75_000 : 95_000;
  if (hasResearch) ms += 35_000;
  if (isLong) ms += 20_000;
  return ms;
}

export function formatDurationKo(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0 && s > 0) return `${m}분 ${s}초`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}
