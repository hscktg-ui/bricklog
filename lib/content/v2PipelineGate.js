/**
 * V2 파이프라인: 조사 → 검증 → 작성 → 검증
 * 조사·검증 없이 작성된 글은 품질 점수와 무관하게 출력 금지.
 */
import { evaluateV2Axis } from "@/lib/quality/v2AxisQuality";
import { runV3PostWritePipeline } from "@/lib/content/v3/pipeline";
import { V3_TARGET_SCORE } from "@/lib/content/v3/constants";
import { isChannelPackDeliverable } from "@/lib/content/channelPack";

export const V2_PIPELINE_ORDER = [
  "research",
  "research_verify",
  "write",
  "output_verify",
];

const MESSAGES = {
  missing_axes:
    "브랜드 · 지역 · 주제를 모두 입력해 주세요.",
  pre_write:
    "조사·검증 단계를 마무리하지 못했습니다. 브랜드·지역·주제를 확인해 주세요.",
  post_write:
    "작성 후 검수 기준에 맞지 않아 화면에 올리지 않았습니다.",
  no_research_output:
    "조사·검증 없이 작성된 글은 출력할 수 없습니다.",
};

export function requiresV2ResearchGate(input = {}) {
  if (input.v2AxisRequired === false) return false;
  if (input.channelDeriveExempt === true) return false;
  return (
    input.v2AxisRequired === true ||
    input.v2PipelineEnforced === true ||
    input.v3EngineEnforced === true
  );
}

export function assertPreWriteVerified(input = {}) {
  if (!requiresV2ResearchGate(input)) {
    return { ok: true, stage: "research_verify", skipped: true };
  }

  const reasons = [];
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const topic =
    String(input.topic || "").trim() ||
    String(input.mainKeyword || "").trim();

  if (!brand || !region || !topic) reasons.push("missing_axes");
  if (!input.v2PreWriteVerified) reasons.push("pre_write_not_verified");
  if (input.v3EngineEnforced && !input.v3PreWriteVerified) {
    reasons.push("v3_pre_write_not_verified");
  }
  if (!input.v2ResearchReady) reasons.push("research_not_ready");
  if (!String(input.researchBrief || input.v2AxisBrief || "").trim()) {
    reasons.push("missing_research_brief");
  }
  if (!input.researchPayload && !input.researchBrief?.trim()) {
    reasons.push("missing_research_payload");
  }

  if (input.v2PreWriteVerification?.pass === false) {
    reasons.push("research_verification_failed");
  }

  if (reasons.length) {
    return {
      ok: false,
      stage: "research_verify",
      reasons,
      userMessage: userMessageForPreWrite(reasons),
    };
  }

  return {
    ok: true,
    stage: "research_verify",
    factCount: input.researchFactCount ?? input.researchFacts?.length ?? 0,
  };
}

function userMessageForPreWrite(reasons) {
  if (reasons.includes("missing_axes")) return MESSAGES.missing_axes;
  return MESSAGES.pre_write;
}

/**
 * 조사 직후 1차 검증 (작성 시작 전)
 */
export function verifyPreWriteResearch(parsed, research) {
  const reasons = [];
  if (!parsed?.ok && parsed?.insufficient) {
    reasons.push("research_insufficient");
  }
  if (!parsed?.verified && !parsed?.ok) reasons.push("facts_not_verified");
  const fact = research?.v2Axis?.factVerification || {};
  if (fact.consistent === false && (parsed?.factCount ?? 0) < 2) {
    reasons.push("fact_inconsistent");
  }
  const hasBrief =
    Boolean(String(research?.summary || "").trim()) ||
    Boolean(parsed?.factsPrompt?.trim());
  if (!hasBrief && (parsed?.factCount ?? 0) < 1) {
    reasons.push("empty_summary");
  }

  const pass = reasons.length === 0;
  return {
    pass,
    ok: pass,
    reasons,
    factCount: parsed?.factCount ?? 0,
    verified: pass || parsed?.verified === true,
    depthTier: parsed?.depthTier,
  };
}

/** postProcessLlmBlog에서 이미 V3 후처리된 pack은 재실행하지 않음 */
function resolveV3PostWriteResult(pack, ctx, input) {
  const priorScore = pack?._meta?.v3BrandScore || pack?._meta?.qualityScore?.v3;
  if (pack?._meta?.v3Engine && priorScore) {
    const factCheck = pack._meta?.v3FactCheck;
    return {
      pack,
      score: priorScore,
      factCheck,
      ok: Boolean(priorScore.ok && factCheck?.ok !== false),
      failReasons: [
        ...(priorScore.failReasons || []),
        ...(factCheck?.ok === false ? ["v3_fact_check_fail"] : []),
      ],
    };
  }
  return runV3PostWritePipeline(pack, ctx, input);
}

/**
 * 작성 완료 후 2차 검증 (출력 전)
 */
export function assertPostWriteDeliverable(input = {}, pack) {
  if (!requiresV2ResearchGate(input)) {
    return { ok: true, stage: "output_verify", pack, skipped: true };
  }

  const pre = assertPreWriteVerified(input);
  if (!pre.ok) {
    return {
      ok: false,
      stage: "output_verify",
      reasons: pre.reasons,
      userMessage: pre.userMessage,
    };
  }

  const contentChannel = input.contentChannel || "blog";
  if (!isChannelPackDeliverable(contentChannel, pack)) {
    return {
      ok: false,
      stage: "output_verify",
      reasons: ["empty_pack"],
      userMessage: MESSAGES.post_write,
    };
  }

  const ctx = {
    brandName: input.brandName,
    region: input.region,
    topic: input.topic || input.mainKeyword,
    v2ProductName: input.v2ProductName,
    researchFacts: input.researchFacts,
    researchFactCount: input.researchFactCount ?? input.researchFacts?.length,
    researchDepthTier: input.researchDepthTier,
    v2PreWriteVerified: input.v2PreWriteVerified,
    v2AxisVerified: true,
    v3MasterBrief: input.v3MasterBrief,
    contentChannel,
  };

  const v3Post = input.v3EngineEnforced
    ? resolveV3PostWriteResult(pack, ctx, input)
    : null;

  if (v3Post && !v3Post.ok) {
    return {
      ok: false,
      stage: "output_verify",
      reasons: v3Post.failReasons,
      userMessage: MESSAGES.post_write,
      v3Score: v3Post.score,
      qualityScore: v3Post.score?.total,
    };
  }

  const finalPack = v3Post?.pack || pack;
  const v2Axis =
    v3Post?.score?.v2Axis ||
    evaluateV2Axis(finalPack, ctx, { ...input, contentChannel });
  const qualityScore =
    v3Post?.score?.total ??
    finalPack._meta?.qualityScore?.total ??
    finalPack._meta?.coreQuality?.total ??
    0;

  const reasons = [];
  if (!v2Axis.ok) {
    reasons.push("post_write_quality_failed", ...(v2Axis.failReasons || []));
  }

  if (reasons.length) {
    return {
      ok: false,
      stage: "output_verify",
      reasons,
      userMessage: MESSAGES.post_write,
      v2Axis,
      qualityScore,
    };
  }

  return {
    ok: true,
    stage: "output_verify",
    pack: stampDeliverablePack(finalPack, input, v2Axis, v3Post?.score),
    v2Axis,
    v3Score: v3Post?.score,
    qualityScore,
  };
}

export function stampDeliverablePack(pack, input, v2Axis, v3Score = null) {
  return {
    ...pack,
    _meta: {
      ...pack._meta,
      writtenFromVerifiedResearch: true,
      v2Pipeline: {
        order: V2_PIPELINE_ORDER,
        preWriteVerified: true,
        postWriteVerified: true,
        researchFactCount:
          input.researchFactCount ?? input.researchFacts?.length ?? 0,
        verifiedAt: new Date().toISOString(),
      },
      v3Engine: input.v3EngineEnforced ? "v3" : undefined,
      v3BrandScore: v3Score,
      passOutput:
        Boolean(pack._meta?.passOutput) && Boolean(input.v2PreWriteVerified),
      qualityScore: {
        ...(pack._meta?.qualityScore || {}),
        v2Axis,
      },
    },
  };
}

/** API·오케스트레이터 최종 응답 차단 */
export function blockUnverifiedBlogApiResponse(result, input = {}) {
  if (!requiresV2ResearchGate(input)) return result;
  if (!result?.blogContent) return result;

  const gate = assertPostWriteDeliverable(input, result.blogContent);
  if (gate.ok) {
    return {
      ...result,
      blogContent: gate.pack,
      withheld: false,
      meta: {
        ...(result.meta || {}),
        v2PipelineVerified: true,
        v3PipelineVerified: true,
        passOutput: gate.pack._meta?.passOutput,
      },
    };
  }

  return {
    ok: false,
    blogContent: null,
    withheld: true,
    userMessage: gate.userMessage || MESSAGES.no_research_output,
    userDetail: null,
    mode: "output_verification_failed",
    meta: {
      ...(result.meta || {}),
      v2PipelineVerified: false,
      generationMode: "blocked_no_verified_research",
      failReasons: gate.reasons,
    },
  };
}

export function researchGateBlockedResult(input, gate) {
  return {
    ok: false,
    blogContent: null,
    withheld: true,
    userMessage: gate?.userMessage || MESSAGES.pre_write,
    mode: "research_gate",
    meta: { failReasons: gate?.reasons || [] },
  };
}
