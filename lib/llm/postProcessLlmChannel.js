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
import {
  hasMetaLayerLeak,
  sanitizeChannelPackMetaLayer,
} from "@/lib/content/metaLayerSeparation";
import { detectOutlineLeak } from "@/lib/content/outlinePackGuard";
import { assertV17PreOutput } from "@/lib/content/v17ContentGate";
import { applyV17PostWritePack } from "@/lib/content/v17PostProcess";
import { hasMetaPhilosophyLeak } from "@/lib/content/metaLayerSeparation";
import { detectChannelMarketerIssues } from "@/lib/content/channelMarketerEngine";
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { applyChannelStoryGate } from "@/lib/content/channelStoryEngine";
import { enforceSmartPlaceOwnerNotice } from "@/lib/channel/smartPlaceNoticeGuard";
import {
  stripCatalogContaminationFromChannelPack,
} from "@/lib/product/catalogContaminationGuard";
import {
  assessChannelFirstDeliveryQuality,
  resolveChannelPassOutputAfterFinish,
  scoreChannelSpecialQuality,
} from "@/lib/product/channelQualityStack";
import { applyAGradeChannelPass } from "@/lib/product/aGradeDeliveryEngine";

const CHANNEL_BLOG_TONE_RE =
  /(이번\s*글|결론적으로|정리하면|소제목|서론|본론|마무리)/;

function expectedInstaBodyMin(input = {}) {
  const tier = String(input.instaBodyLength || "medium").toLowerCase();
  if (tier === "short") return 60;
  if (tier === "long") return 300;
  return 220; // medium
}

function channelSpecialQuality(channel, pack, input = {}) {
  return scoreChannelSpecialQuality(pack, channel, input);
}

export function postProcessLlmChannel(channel, pack, ctx = {}, input = {}) {
  if (!pack) return null;
  const sanitizedInitial = sanitizeChannelPackMetaLayer(channel, pack);

  let next = stampSignatureChannelMeta(
    sanitizedInitial,
    channel,
    {
    llmGenerated: true,
      charCount: getChannelFullText(sanitizedInitial, channel).replace(/\s/g, "").length,
    }
  );

  next = applyV17PostWritePack(next, { ...ctx, input }, channel);
  next = applyChannelStoryGate(next, channel, { ...ctx, input });
  if (channel === "place") {
    next = enforceSmartPlaceOwnerNotice(next, input);
    next = stripCatalogContaminationFromChannelPack(next, "place");
  }
  if (channel === "instagram") {
    next = stripCatalogContaminationFromChannelPack(next, "instagram");
  }
  next = applyHumanityFinishPass(next, { ...ctx, input }, channel);

  const v2EvalInput = {
    ...input,
    contentChannel: channel,
    researchFacts: input.researchFacts || ctx.researchFacts || [],
  };

  const coreQuality = scoreCoreContent(next, { ...ctx, input: v2EvalInput }, channel);
  const v2Axis = evaluateV2Axis(next, ctx, v2EvalInput);
  const channelGate = channelSpecialQuality(channel, next, input);
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

  if (!channelGate.ok) {
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      ...channelGate.reasons,
    ];
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(qualityScore.total, 82);
  }

  if (channel === "place" || channel === "instagram") {
    const marketerGate = detectChannelMarketerIssues(next, channel, ctx, input);
    next._meta = {
      ...(next._meta || {}),
      channelMarketerGate: marketerGate,
    };
    if (!marketerGate.ok) {
      coreQuality.failReasons = [
        ...(coreQuality.failReasons || []),
        ...marketerGate.issues.map((i) => `${channel}_${i.type}`),
      ];
      coreQuality.pass = false;
      qualityScore.pass = false;
      qualityScore.total = Math.min(qualityScore.total, 84);
    }
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
  if (hasMetaPhilosophyLeak(full, { ...ctx, input })) {
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      "meta_philosophy_leak",
    ];
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(qualityScore.total, 85);
  }
  const v17Gate = assertV17PreOutput(next, channel, { ...ctx, input });
  if (!v17Gate.ok) {
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      ...v17Gate.reasons.filter(
        (r) => !(coreQuality.failReasons || []).includes(r)
      ),
    ];
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(
      qualityScore.total,
      v17Gate.reviewerScore ?? 82
    );
    next._meta = {
      ...(next._meta || {}),
      v17PreOutput: v17Gate,
      v14PreOutput: v17Gate.v14,
    };
  }
  if (hasMetaLayerLeak(full)) {
    next = sanitizeChannelPackMetaLayer(channel, next);
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      "meta_layer_term_leak",
    ];
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(qualityScore.total, 85);
  }
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

  const outlineLeak = detectOutlineLeak(next);
  if (outlineLeak.isOutline) {
    coreQuality.failReasons = [
      ...(coreQuality.failReasons || []),
      "outline_only_output",
    ];
    coreQuality.pass = false;
    qualityScore.pass = false;
    qualityScore.total = Math.min(qualityScore.total, 70);
    next._meta = {
      ...(next._meta || {}),
      outlineLeak: true,
      outlineLeakReasons: outlineLeak.reasons,
    };
  }

  const firstDelivery = assessChannelFirstDeliveryQuality(next, channel, input);
  const passOutput = resolveChannelPassOutputAfterFinish(
    next,
    channel,
    input,
    researchGateOk &&
      !outlineLeak.isOutline &&
      coreQuality.pass &&
      qualityScore.total >= CORE_TARGET_SCORE &&
      (!v3Post || v3Post.ok) &&
      firstDelivery.displayReady
  );

  const styleLabels = labelsForMeta(input);
  next._meta = {
    ...next._meta,
    coreQuality,
    qualityScore,
    passOutput,
    firstDeliveryReady: firstDelivery.displayReady,
    displayReady: firstDelivery.displayReady,
    channelFirstDelivery: firstDelivery,
    personaLabel: styleLabels.persona,
    emotionToneLabel: styleLabels.emotionTone,
    writingToneLabel: styleLabels.writingTone,
    skillLevelLabel: styleLabels.skillLevel,
    failReasons: coreQuality.failReasons,
    channelSpecialQuality: channelGate,
  };

  const graded = applyAGradeChannelPass(next, channel, input);

  return {
    pack: graded,
    passOutput: graded._meta?.passOutput ?? passOutput,
    charCount: graded._meta?.charCount ?? next._meta.charCount,
    fullText: getChannelFullText(graded, channel),
  };
}
