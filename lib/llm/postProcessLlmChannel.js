import { runV3PostWritePipeline } from "@/lib/content/v3/pipeline";
import { requiresV2ResearchGate } from "@/lib/content/v2PipelineGate";
import {
  scoreCoreContent,
  labelsForMeta,
  CORE_TARGET_SCORE,
} from "@/lib/quality/coreQualityEngine";
import { evaluateV2Axis } from "@/lib/quality/v2AxisQuality";
import { getChannelFullText, stampSignatureChannelMeta } from "@/lib/content/channelPack";
import { findBannedTemplateHits } from "@/lib/content/v2BannedTemplates";

export function postProcessLlmChannel(channel, pack, ctx = {}, input = {}) {
  if (!pack) return null;

  let next = stampSignatureChannelMeta(pack, channel, {
    llmGenerated: true,
    charCount: getChannelFullText(pack, channel).replace(/\s/g, "").length,
  });

  const v2EvalInput = {
    ...input,
    contentChannel: channel,
    researchFacts: input.researchFacts || ctx.researchFacts || [],
  };

  const coreQuality = scoreCoreContent(next, { ...ctx, input: v2EvalInput }, channel);
  const v2Axis = evaluateV2Axis(next, ctx, v2EvalInput);
  const qualityScore = {
    total: coreQuality.total,
    breakdown: coreQuality.breakdown,
    failReasons: [...(coreQuality.failReasons || [])],
    pass: coreQuality.pass,
    target: CORE_TARGET_SCORE,
    core: coreQuality,
    v2Axis,
  };

  if (v2Axis && !v2Axis.ok) {
    qualityScore.total = Math.min(qualityScore.total, v2Axis.total);
    coreQuality.pass = false;
    qualityScore.pass = false;
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      ...(v2Axis.failReasons || []),
    ];
  }

  let v3Post = null;
  if (input.v3EngineEnforced || input.v3PreWriteVerified) {
    v3Post = runV3PostWritePipeline(next, ctx, input);
    next = v3Post.pack;
    qualityScore.v3 = v3Post.score;
    qualityScore.total = Math.min(qualityScore.total, v3Post.score?.total ?? 100);
    if (!v3Post.ok) {
      coreQuality.pass = false;
      qualityScore.pass = false;
      coreQuality.failReasons = [
        ...(coreQuality.failReasons || []),
        ...(v3Post.failReasons || []),
      ];
    }
  }

  const full = getChannelFullText(next, channel);
  const banned = findBannedTemplateHits(full);
  if (banned.length) {
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      "banned_template",
    ];
    coreQuality.pass = false;
    qualityScore.pass = false;
  }

  const researchGateOk =
    !requiresV2ResearchGate({ ...input, ...ctx }) ||
    Boolean(input.v2PreWriteVerified);
  if (!researchGateOk) {
    coreQuality.failReasons = [...(coreQuality.failReasons || []), "v2axis_no_research"];
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(qualityScore.total, 40);
  }

  const passOutput =
    researchGateOk &&
    coreQuality.pass &&
    qualityScore.total >= CORE_TARGET_SCORE &&
    (!v3Post || v3Post.ok);

  const styleLabels = labelsForMeta(input);
  next._meta = {
    ...next._meta,
    coreQuality,
    qualityScore,
    passOutput,
    personaLabel: styleLabels.persona,
    emotionToneLabel: styleLabels.emotionTone,
    writingToneLabel: styleLabels.writingTone,
    skillLevelLabel: styleLabels.skillLevel,
    failReasons: coreQuality.failReasons,
  };

  return {
    pack: next,
    passOutput,
    charCount: next._meta.charCount,
    fullText: full,
  };
}
