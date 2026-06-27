/** 생성 대기 시간 안내 — Fast Pipeline 30초 UX */

import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";
import {
  CUSTOMER_CHANNEL_SLA_MS,
  isClientResearchPreVerified,
  isCustomerTwoMinuteSlaMode,
} from "@/lib/config/briclogFastPipeline";
import { getCustomerBlogSlaMs } from "@/lib/config/briclogDefaults";

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
    let ms = preVerified ? 60_000 : 120_000;
    if (hasResearch && !preVerified) ms += 30_000;
    if (isLong) ms += 20_000;
    return ms;
  }

  const sla = isCustomerTwoMinuteSlaMode()
    ? getCustomerBlogSlaMs()
    : CUSTOMER_CHANNEL_SLA_MS;

  if (isClientResearchPreVerified(input) || preVerified) {
    return blogOnly
      ? Math.min(45_000, sla)
      : sla;
  }

  let ms = blogOnly ? Math.min(55_000, sla) : sla;
  if (isLong) ms = Math.min(sla, ms + 2_000);
  return Math.min(ms, sla);
}

export function formatDurationKo(ms) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0 && s > 0) return `${m}분 ${s}초`;
  if (m > 0) return `${m}분`;
  return `${s}초`;
}
