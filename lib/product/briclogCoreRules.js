/**
 * BRICLOG 내부 코어 룰 SSOT — 공개 선언·랜딩 문구 아님
 *
 * Core1: 사람이 쓴 것 같은, 잘 쓰인 글 (humanBelief · SQV · humanVoice)
 * Core2: 브랜드별 사용자 피드백·습관 기억 (personalization · feedbackBrief)
 */
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { getBlogFullText } from "@/utils/qualityCheck";
import { getChannelFullText } from "@/lib/content/channelPack";
import { applyBrandTopicInterpretation } from "@/lib/memory/brandTopicMemory";

export const BRICLOG_CORE_RULES_VERSION = "core-rules-v1";

/**
 * humanBeliefEngine HUMAN_BELIEF_MIN_SCORE(85)와 동기 — import 순환 방지용 상수
 * 채널(place/instagram)은 짧은 본문 특성을 반영해 한 단계 완화
 */
export const CORE1_BELIEF_FLOOR_BLOG = 85;
export const CORE1_BELIEF_FLOOR_CHANNEL = 70;

/** @readonly */
export const BRICLOG_CORE_1 = Object.freeze({
  id: "human_written_quality",
  label: "사람이 쓴 것 같은 잘 쓰인 글",
  minSqoScore: 50,
});

/** @readonly */
export const BRICLOG_CORE_2 = Object.freeze({
  id: "brand_feedback_memory",
  label: "브랜드별 사용자 피드백 기억",
});

export function isBriclogCoreRulesEnforced() {
  if (process.env.BRICLOG_CORE_RULES === "false") return false;
  return isBriclogMissionEnforced();
}

function packFullText(pack, channel) {
  if (channel === "blog") return getBlogFullText(pack);
  return getChannelFullText(pack, channel);
}

function beliefFloorForChannel(channel) {
  return channel === "blog" ? CORE1_BELIEF_FLOOR_BLOG : CORE1_BELIEF_FLOOR_CHANNEL;
}

/**
 * Core1 — 송출본이 사람 글처럼 읽히는지 (이미 스탬프된 메타만 사용)
 */
export function assessCore1HumanWriting(pack, input = {}, channel = "blog") {
  if (!pack || !isBriclogCoreRulesEnforced()) {
    return {
      ok: true,
      score: 100,
      reasons: [],
      version: BRICLOG_CORE_RULES_VERSION,
      core: BRICLOG_CORE_1.id,
    };
  }

  const full = packFullText(pack, channel);
  const hasBody = full.replace(/\s/g, "").length >= 40;
  const beliefScore =
    pack._meta?.humanBelief?.score ?? pack._meta?.humanBeliefScore ?? 0;
  const sqvScore = pack._meta?.sqv?.score ?? pack._meta?.contentQualityValue;
  const humanVoiceMet = pack._meta?.humanVoiceMet;

  const reasons = [];
  const beliefFloor = beliefFloorForChannel(channel);

  if (hasBody && beliefScore < beliefFloor) {
    reasons.push("core1_human_belief_low");
  }
  if (typeof sqvScore !== "number") {
    reasons.push("core1_sqv_missing");
  } else if (sqvScore < BRICLOG_CORE_1.minSqoScore) {
    reasons.push("core1_sqv_low");
  }
  if (
    channel === "blog" &&
    humanVoiceMet === false &&
    pack._meta?.deliveryGrade !== "draft" &&
    pack._meta?.outputWithheld !== true
  ) {
    reasons.push("core1_human_voice_pending");
  }

  const hardFail = reasons.some(
    (r) => r !== "core1_human_voice_pending" && !r.endsWith("_pending")
  );

  const score = Math.round(
    (beliefScore || (hasBody ? 50 : 0)) * 0.52 +
      (typeof sqvScore === "number" ? sqvScore : 0) * 0.48
  );

  return {
    version: BRICLOG_CORE_RULES_VERSION,
    core: BRICLOG_CORE_1.id,
    ok: !hardFail,
    score,
    belief: beliefScore,
    sqv: sqvScore,
    humanVoiceMet,
    reasons,
    channel,
  };
}

/**
 * Core2 — 브랜드 스코프에서 피드백·습관이 입력에 실렸는지
 */
export function assessCore2BrandMemoryApplied(input = {}) {
  if (!isBriclogCoreRulesEnforced()) {
    return {
      ok: true,
      score: 100,
      applied: false,
      reasons: [],
      version: BRICLOG_CORE_RULES_VERSION,
      core: BRICLOG_CORE_2.id,
    };
  }

  const brandId = input.brandId || input.brandMemory?.id;
  if (!brandId) {
    return {
      ok: true,
      score: 100,
      applied: false,
      reasons: ["core2_no_brand_scope"],
      version: BRICLOG_CORE_RULES_VERSION,
      core: BRICLOG_CORE_2.id,
    };
  }

  const feedbackBrief = String(
    input.brandFeedbackBrief || input.feedbackBrief || ""
  ).trim();
  const personalization = String(
    input.combinedPersonalizationAddon || input.personalizationAddon || ""
  ).trim();
  const feedbackHints = Array.isArray(input.feedbackHints)
    ? input.feedbackHints.filter(Boolean)
    : [];
  const excludePhrases = String(input.excludePhrases || "").trim();
  const brandMemory = input.brandMemory || {};

  const signals = [
    feedbackBrief.length >= 8,
    personalization.length >= 12,
    feedbackHints.length >= 1,
    excludePhrases.length >= 2,
    Boolean(brandMemory.tone || brandMemory.forbiddenWords),
    Boolean(input.styleContinuityBrief),
    Boolean(input.brandHabitsBrief),
    Boolean(input.brandPhilosophyBrief),
    input.core2Applied === true,
  ].filter(Boolean).length;

  const applied = signals >= 1;

  return {
    version: BRICLOG_CORE_RULES_VERSION,
    core: BRICLOG_CORE_2.id,
    ok: true,
    applied,
    score: applied ? Math.min(100, 58 + signals * 6) : 42,
    signalCount: signals,
    reasons: applied ? [] : ["core2_brand_memory_thin"],
    brandId,
  };
}

/** 생성 입력 — Core2 피드백·금지어 병합 */
export function stampCoreRulesOnInput(input = {}) {
  if (!input) return input;

  const withTopic = applyBrandTopicInterpretation(input);
  if (!isBriclogCoreRulesEnforced()) return withTopic;

  const core2 = assessCore2BrandMemoryApplied(withTopic);
  const mergedFeedbackHints = [
    ...(Array.isArray(withTopic.feedbackHints) ? withTopic.feedbackHints : []),
    ...(Array.isArray(withTopic.brandMemory?.feedbackIntents)
      ? withTopic.brandMemory.feedbackIntents
      : []),
  ].filter(Boolean);
  const uniqHints = [...new Set(mergedFeedbackHints)].slice(0, 12);

  const memoryForbidden = String(
    withTopic.brandMemory?.forbiddenWords || withTopic.brandMemory?.excludePhrases || ""
  ).trim();
  const excludeMerged = [withTopic.excludePhrases, memoryForbidden]
    .filter(Boolean)
    .join(", ")
    .trim();

  return {
    ...withTopic,
    briclogCoreRules: true,
    coreRulesVersion: BRICLOG_CORE_RULES_VERSION,
    core2Applied: core2.applied,
    feedbackHints: uniqHints.length ? uniqHints : withTopic.feedbackHints,
    excludePhrases: excludeMerged || withTopic.excludePhrases,
    _coreRulesInput: {
      core2,
      stampedAt: new Date().toISOString(),
    },
  };
}

/** 송출 pack — Core1·Core2 메타 스탬프 */
export function stampCoreRulesOnDelivery(pack, input = {}, channel = "blog") {
  if (!pack || !isBriclogCoreRulesEnforced()) return pack;

  const core1 = assessCore1HumanWriting(pack, input, channel);
  const core2 = assessCore2BrandMemoryApplied(input);

  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      briclogCoreRules: {
        version: BRICLOG_CORE_RULES_VERSION,
        core1,
        core2,
        core1Pass: core1.ok,
        core2Applied: core2.applied,
        stampedAt: new Date().toISOString(),
      },
    },
  };
}

export function assessCoreRulesDelivery(pack, input = {}, channel = "blog") {
  const core1 = assessCore1HumanWriting(pack, input, channel);
  const core2 = assessCore2BrandMemoryApplied(input);
  const compositeScore = Math.round(core1.score * 0.78 + core2.score * 0.22);

  return {
    version: BRICLOG_CORE_RULES_VERSION,
    channel,
    compositeScore,
    deliveryOk: core1.ok,
    core1,
    core2,
  };
}

/** 배치·회귀 — Core1 SQV 누락 = #1 버그 */
export function assertCore1DeliveryStamped(pack, channel = "blog", label = channel) {
  const assessment = assessCore1HumanWriting(pack, {}, channel);
  if (assessment.reasons.includes("core1_sqv_missing")) {
    throw new Error(`core1_sqv_missing:${label}`);
  }
  return assessment;
}
