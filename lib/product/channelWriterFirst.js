/**
 * Writer-First 채널 송출 — place·instagram (순환 import 방지)
 */
import { getChannelFullText } from "@/lib/content/channelPack";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { isBriclogFastPipelineEnabled } from "@/lib/config/briclogFastPipeline";
import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import { isLlmOriginatedPack } from "@/lib/product/llmPackOrigin";
import { applyChannelSovereignTrimPass } from "@/lib/product/channelSovereignTrim";
import { assessChannelVisitNorthStar } from "@/lib/product/channelVisitNorthStar";
import { stampDeliveryGradeMeta } from "@/lib/product/deliveryGrade";
import { stampFirstDeliveryPerfectMeta } from "@/lib/product/customerFacingSanitize";

const CHANNEL_WRITER_FIRST_VERSION = "writer-first-channel-v1";

export function shouldUseWriterFirstChannelPostProcess(input = {}, pack = {}, channel = "place") {
  if (process.env.BRICLOG_WRITER_FIRST === "false") return false;
  const enabled =
    process.env.BRICLOG_WRITER_FIRST === "true" ||
    (isBriclogResetQualityEnforced() &&
      isBriclogFastPipelineEnabled() &&
      isGpt55WriterDominant() &&
      !isBriclogMaxQualityEnabled());
  if (!enabled) return false;
  if (channel !== "place" && channel !== "instagram") return false;
  return (
    isGpt55WriterDominant() ||
    pack?._meta?.llmGenerated ||
    isLlmOriginatedPack(pack, input) ||
    pack?._meta?.channelNorthStarPack === true
  );
}

export function finalizeWriterFirstChannelDelivery(pack, channel = "place", input = {}, opts = {}) {
  if (!pack) return pack;

  const next = applyChannelSovereignTrimPass(pack, channel, input);
  const northStar = assessChannelVisitNorthStar(next, channel, input);
  const chars = getChannelFullText(next, channel).replace(/\s/g, "").length;
  const minChars = channel === "instagram" ? 80 : 100;

  const hardFail =
    northStar.shouldWithhold ||
    !northStar.spam.ok ||
    chars < minChars;

  const graded = stampDeliveryGradeMeta(
    {
      ...next,
      _meta: {
        ...(next._meta || {}),
        writerFirstDelivery: true,
        writerFirstDeliveryVersion: CHANNEL_WRITER_FIRST_VERSION,
        writerSovereignBypassHeavyPolish: true,
        channelVisitNorthStar: northStar,
        channelVisitNorthStarOk: northStar.publishOk,
        outputWithheld: hardFail && !opts.allowSoftPreview,
        withholdReason: hardFail
          ? northStar.issues?.[0]?.type || "channel_writer_first_quality"
          : undefined,
        contentQualityValue: northStar.shape?.score || 100,
        publishReady: !hardFail,
        humanVoiceDeliveryPass: true,
        generationMode: next._meta?.generationMode || "llm_channel_writer_first",
        passOutput: !hardFail,
        completeDraft: !hardFail,
        displayReady: !hardFail,
      },
    },
    input
  );

  if (hardFail) return graded;
  return stampFirstDeliveryPerfectMeta(graded, input);
}
