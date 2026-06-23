/**
 * Brand Content Customer Gate — 모든 채널 고객 노출 SSOT
 *
 * 원칙: 조사 완료 시 고객에게 보이는 산문 = GPT Writer 또는 North Star 파생만.
 * Mission·humanity·weave 스팸 경로는 송출 전 차단.
 */
import { applyHumanityFinishPass } from "@/lib/content/humanityFinishPass";
import { applyChannelStoryGate } from "@/lib/content/channelStoryEngine";
import { weaveResearchFactsIntoChannelPack } from "@/lib/content/researchGroundedHumanPack";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import { assessChannelVisitNorthStar } from "@/lib/product/channelVisitNorthStar";
import { assessColumnVisitNorthStar } from "@/lib/product/columnVisitNorthStar";
import {
  buildWriterFirstWithholdMessage,
  isWriterFirstRescueBlocked,
} from "@/lib/product/writerFirstDelivery";
import {
  finalizeWriterFirstChannelDelivery,
  shouldUseWriterFirstChannelPostProcess,
} from "@/lib/product/channelWriterFirst";
import { deriveChannelFromVerifiedBlog } from "@/lib/product/deriveChannelFromVerifiedBlog";
import {
  finalizeCustomerFacingBlogPack,
  hasCustomerInstructionLeak,
} from "@/lib/product/customerFacingSanitize";
import {
  isLaunchPublishFirstMode,
  finalizeLaunchPublishBlogPack,
} from "@/lib/config/launchPublishMode";

export const BRAND_CONTENT_CUSTOMER_GATE_VERSION = "brand-content-customer-gate-v1";

/** Mission·로컬 엔진 구제를 UI에 올릴지 — 기본 OFF (명령어·템플릿 유출 방지) */
export function shouldAllowMissionUiRescue(input = {}) {
  if (process.env.BRICLOG_UI_MISSION_RESCUE === "true") {
    return !isWriterFirstRescueBlocked(input);
  }
  return false;
}

export function isCustomerSafeChannelPack(pack, channel = "place") {
  if (!pack) return false;
  if (pack._meta?.channelNorthStarPack || pack._meta?.derivedFromVerifiedBlog) {
    return true;
  }
  if (pack._meta?.llmGenerated || pack._meta?.gpt55LlmPack) {
    return true;
  }
  if (pack._meta?.missionProseFallback || pack._meta?.draftFallback) {
    return false;
  }
  return !pack._meta?.researchGroundedHumanPack;
}

/** LLM/파생 전 heavy 패스 생략 */
export function applyCustomerChannelHygienePass(pack, channel, input = {}, opts = {}) {
  if (!pack || (channel !== "place" && channel !== "instagram")) return pack;

  const writerFirst =
    shouldUseWriterFirstChannelPostProcess(input, pack, channel) ||
    pack?._meta?.channelNorthStarPack ||
    pack?._meta?.derivedFromVerifiedBlog ||
    opts.fromVerifiedBlog;

  if (writerFirst) return pack;

  let next = applyChannelStoryGate(pack, channel, { input, ...input });
  next = applyHumanityFinishPass(next, { input, ...input }, channel);
  if (!next?._meta?.channelNorthStarPack) {
    next = weaveResearchFactsIntoChannelPack(next, channel, input);
  }
  return next;
}

export function enforceCustomerChannelOutput(pack, channel, input = {}) {
  if (!pack) {
    return {
      ok: false,
      withheld: true,
      pack: null,
      userMessage: buildWriterFirstWithholdMessage(input),
    };
  }

  if (isLaunchPublishFirstMode()) {
    return { ok: true, withheld: false, pack, northStar: null };
  }

  const north = assessChannelVisitNorthStar(pack, channel, input);
  const research = hasUsableResearchFacts(input);
  const safePack = isCustomerSafeChannelPack(pack, channel);

  if (research && isWriterFirstRescueBlocked(input) && !safePack) {
    return {
      ok: false,
      withheld: true,
      pack: null,
      userMessage: buildWriterFirstWithholdMessage(input),
      reason: "unsafe_channel_pack",
    };
  }

  if (north.shouldWithhold && research && !pack?._meta?.channelNorthStarPack) {
    return {
      ok: false,
      withheld: true,
      pack: null,
      userMessage: buildWriterFirstWithholdMessage(input),
      reason: "channel_north_star",
      northStar: north,
    };
  }

  let next = finalizeWriterFirstChannelDelivery(pack, channel, input, {
    allowSoftPreview: !research,
  });

  if (next?._meta?.outputWithheld && research) {
    return {
      ok: false,
      withheld: true,
      pack: null,
      userMessage: buildWriterFirstWithholdMessage(input),
      reason: "channel_writer_first",
    };
  }

  return { ok: true, withheld: false, pack: next, northStar: north };
}

export function enforceCustomerBlogOutput(pack, input = {}) {
  if (!pack?.sections?.length) {
    return {
      ok: false,
      withheld: true,
      pack: null,
      userMessage: buildWriterFirstWithholdMessage(input),
    };
  }

  if (isLaunchPublishFirstMode()) {
    const cleaned = finalizeLaunchPublishBlogPack(pack, input);
    return {
      ok: true,
      withheld: false,
      pack: cleaned,
      northStar: assessColumnVisitNorthStar(pack, input),
    };
  }

  if (
    pack._meta?.writerFirstOrchestratorEscape &&
    pack._meta?.publishReady
  ) {
    const cleaned = finalizeCustomerFacingBlogPack(pack, input);
    return {
      ok: true,
      withheld: false,
      pack: cleaned,
      northStar: assessColumnVisitNorthStar(pack, input),
    };
  }

  if (
    hasUsableResearchFacts(input) &&
    isWriterFirstRescueBlocked(input) &&
    (pack._meta?.missionProseFallback ||
      pack._meta?.draftFallback ||
      pack._meta?.deliveryRescue)
  ) {
    return {
      ok: false,
      withheld: true,
      pack: null,
      userMessage: buildWriterFirstWithholdMessage(input),
      reason: "mission_rescue_blocked",
    };
  }

  const north = assessColumnVisitNorthStar(pack, input);
  if (
    hasUsableResearchFacts(input) &&
    isWriterFirstRescueBlocked(input) &&
    (north.shouldWithhold || !north.spam.ok)
  ) {
    return {
      ok: false,
      withheld: true,
      pack: null,
      userMessage: buildWriterFirstWithholdMessage(input),
      reason: "blog_north_star",
      northStar: north,
    };
  }

  let cleaned = finalizeCustomerFacingBlogPack(pack, input);
  if (cleaned._meta?.outputWithheld || hasCustomerInstructionLeak(getBlogFullText(cleaned))) {
    return {
      ok: false,
      withheld: true,
      pack: null,
      userMessage: buildWriterFirstWithholdMessage(input),
      reason: "customer_instruction_leak",
    };
  }

  return { ok: true, withheld: false, pack: cleaned, northStar: north };
}

/** 블로그가 검증됐으면 채널 LLM 호출 전 빠른 파생 시도 */
export function tryFastChannelFromVerifiedBlog(channel, sourceBlog, input = {}) {
  return deriveChannelFromVerifiedBlog(
    channel,
    sourceBlog,
    input,
    input.instaTone || "emotional"
  );
}
