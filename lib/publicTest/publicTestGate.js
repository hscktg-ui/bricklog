/**
 * 가입 전 테스트 — 미통과 시 노출 금지 (fallback 초안 없음)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  scoreContentRelevance,
  detectForeignIndustrySignals,
  lockGenerationContext,
} from "@/lib/content/contextLockEngine";
import { isPublishableBlogPack } from "@/lib/content/outlinePackGuard";
import { detectVerbatimTopicUsage } from "@/lib/content/informationUnitEngine";
import { scoreGroundedSpecificity } from "@/lib/content/groundedSpecificityGate";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import { collectMergedResearchFacts } from "@/lib/product/researchReadiness";
import { assessSpeakerTopicAlignment } from "@/lib/persona/speakerTopicGuide";
import { isInformationalTopicInput } from "@/lib/content/topicFacetEngine";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import {
  PUBLIC_TEST_GATE_FAIL,
  PUBLIC_TEST_MIN_INFO_UNITS,
  PUBLIC_TEST_MIN_RELEVANCE,
} from "@/lib/publicTest/publicTestConfig";

function countDistinctInfoSignals(input = {}, pack = {}) {
  const units = input.informationUnits?.units?.length || 0;
  const mergedFacts = collectMergedResearchFacts(input);
  const facts = mergedFacts.length || input.researchFactCount || 0;
  const sections = (pack.sections || []).filter(
    (s) => String(s.body || "").replace(/\s/g, "").length >= 40
  ).length;
  return Math.max(units, facts, sections);
}

function hasFictionVoice(pack = {}) {
  const full = getBlogFullText(pack);
  return /누워\s*보니|직접\s*체험해\s*보니|앉아\s*보니|누워보니|솔직히\s*말하면\s*가보니까/.test(
    full
  );
}

/**
 * @param {Record<string, unknown>} input
 * @param {object|null} pack
 */
export function assertPublicTestSampleGate(input = {}, pack = null) {
  if (!pack?.sections?.length) {
    return { ok: false, userMessage: PUBLIC_TEST_GATE_FAIL, reasons: ["empty_pack"] };
  }

  const lockResult = lockGenerationContext(input);
  const lock = lockResult.lock;
  const relevance = scoreContentRelevance(pack, input, lock);
  if (!relevance.ok || relevance.rate < PUBLIC_TEST_MIN_RELEVANCE) {
    return {
      ok: false,
      userMessage: PUBLIC_TEST_GATE_FAIL,
      reasons: ["brand_topic_mismatch", ...(relevance.reasons || [])],
    };
  }

  const foreign = detectForeignIndustrySignals(getBlogFullText(pack), lock);
  if (!foreign.ok) {
    return {
      ok: false,
      userMessage: PUBLIC_TEST_GATE_FAIL,
      reasons: ["industry_contamination"],
    };
  }

  const verbatim = detectVerbatimTopicUsage(pack, input);
  if (!verbatim?.ok) {
    return {
      ok: false,
      userMessage: PUBLIC_TEST_GATE_FAIL,
      reasons: ["verbatim_topic_repeat"],
    };
  }

  if (hasFictionVoice(pack)) {
    return {
      ok: false,
      userMessage: PUBLIC_TEST_GATE_FAIL,
      reasons: ["fiction_detected"],
    };
  }

  const infoCount = countDistinctInfoSignals(input, pack);
  if (infoCount < PUBLIC_TEST_MIN_INFO_UNITS) {
    return {
      ok: false,
      userMessage: PUBLIC_TEST_GATE_FAIL,
      reasons: ["insufficient_information_units"],
    };
  }

  if (!isPublishableBlogPack(pack)) {
    return {
      ok: false,
      userMessage: PUBLIC_TEST_GATE_FAIL,
      reasons: ["not_publishable"],
    };
  }

  const speakerAlign = assessSpeakerTopicAlignment(input);
  if (!speakerAlign.ok) {
    return {
      ok: false,
      userMessage: PUBLIC_TEST_GATE_FAIL,
      reasons: [speakerAlign.code || "speaker_topic_mismatch"],
    };
  }

  if (isInformationalTopicInput(input)) {
    const infoYield = scoreInformationYield(getBlogFullText(pack), { input }, "blog");
    if (!infoYield.ok) {
      return {
        ok: false,
        userMessage: PUBLIC_TEST_GATE_FAIL,
        reasons: ["information_yield_low"],
      };
    }
  }

  const mergedFacts = collectMergedResearchFacts(input);
  const grounded = scoreGroundedSpecificity(pack, input, mergedFacts);
  if (mergedFacts.length >= 2 && !grounded.ok) {
    return {
      ok: false,
      userMessage: PUBLIC_TEST_GATE_FAIL,
      reasons: ["grounded_specificity_low"],
    };
  }

  const length = assertBlogLengthTier(
    { ...input, blogLengthTier: "short" },
    pack
  );
  if (!length.ok && length.chars < 400) {
    return {
      ok: false,
      userMessage: PUBLIC_TEST_GATE_FAIL,
      reasons: length.reasons || ["length_tier_under"],
    };
  }

  return {
    ok: true,
    relevance,
    grounded,
    infoCount,
    lock,
  };
}
