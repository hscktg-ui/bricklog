/** 생성 대기 시간 안내용 — prod SLA 관측치 기준 (클라이언트 타임아웃과 분리) */

import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";

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
    let ms = preVerified ? 120_000 : 360_000;
    if (hasResearch && !preVerified) ms += 60_000;
    if (isLong) ms += 60_000;
    return ms;
  }

  let ms = preVerified ? 90_000 : blogOnly ? 240_000 : 300_000;
  if (hasResearch && !preVerified) ms += 120_000;
  if (isLong) ms += 60_000;
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
