/**
 * Writer Sovereign Pipeline — GPT Writer 원고 주권 · 로컬은 깎기만
 *
 * 약속: 20년차 파워블로거 / 브랜드 에디터 / 해신기획 실무 톤은 Writer가 쓰고,
 * 로컬은 중복·placeholder·템플릿·스니펫만 제거한다. append·weave·패딩 금지.
 */
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import { isGpt55LlmPack, shouldPreserveGpt55LlmPackBody } from "@/lib/product/gpt55LlmPackGuard";
import { isLlmOriginatedPack, isWriterEngineExpandedPack } from "@/lib/product/llmPackOrigin";
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  applyDuplicateKiller,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import { stripTemplateBoilerplateFromPack } from "@/lib/content/templateBoilerplateEngine";
import { applyRegionColumnNaturalizePass } from "@/lib/content/regionColumnNaturalizeEngine";
import { applyRegionBrandMashRepairToPack } from "@/lib/content/regionBrandMashRepair";
import { stripCatalogContaminationFromBlogPack } from "@/lib/product/catalogContaminationGuard";
import { stripSearchSnippetLeakFromPack } from "@/lib/product/brandJournalistDirective";
import { stripContentGateViolationsFromPack } from "@/lib/product/contentGateSystem";
import { scrubPlaceholderFromPack } from "@/lib/content/placeholderTraceEngine";
import { applyGpt55VoiceFinalPass } from "@/lib/product/gpt55LightDelivery";
import { assessReadAloudHumanGate } from "@/lib/quality/readAloudHumanGate";
import { getChannelHumanVoice } from "@/lib/product/channelHumanVoice";
import { guardPackAgainstShrink } from "@/lib/product/packShrinkGuard";

export const WRITER_SOVEREIGN_VERSION = "writer-sovereign-v1";

/** 채널 → 목표 화자 (고객 약속) */
export const WRITER_PERSONA_BY_CHANNEL = {
  blog: {
    role: "20년차 파워블로거",
    editor: "네이버 칼럼·후기 리듬",
    agency: "해신기획급 브랜드 스토리",
  },
  place: {
    role: "브랜드 에디터",
    editor: "매장 공지·운영 안내",
    agency: "해신기획 실무 기획안",
  },
  instagram: {
    role: "브랜드 SNS 마케터",
    editor: "피드·릴스 캡션",
    agency: "캠페인 카피",
  },
};

export function isWriterSovereignModeEnabled() {
  if (process.env.BRICLOG_WRITER_SOVEREIGN === "false") return false;
  if (process.env.BRICLOG_WRITER_SOVEREIGN === "true") return true;
  return (
    isBriclogResetQualityEnforced() &&
    isGpt55WriterDominant() &&
    !isBriclogMaxQualityEnabled()
  );
}

export function isWriterSovereignPack(pack, input = {}) {
  if (!pack?.sections?.length) return false;
  if (!isWriterSovereignModeEnabled()) return false;
  return (
    shouldPreserveGpt55LlmPackBody(pack, input) ||
    isGpt55LlmPack(pack, input) ||
    isLlmOriginatedPack(pack, input) ||
    isWriterEngineExpandedPack(pack, input) ||
    pack?._meta?.briclogWriterEngine === true
  );
}

/**
 * Writer 원고 — trim-only 송출 (append·weave·tier 패딩 없음)
 * @param {object} pack
 * @param {object} input
 */
export function applyWriterSovereignDeliveryPass(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const inbound = pack;
  const inboundChars = getBlogFullText(pack).replace(/\s/g, "").length;

  let next = scrubPlaceholderFromPack(pack);
  next = stripCatalogContaminationFromBlogPack(next);
  next = stripSearchSnippetLeakFromPack(next, input);
  next = stripContentGateViolationsFromPack(next, input);
  next = applyDuplicateKiller(next, { input }, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = stripTemplateBoilerplateFromPack(next, input);
  next = applyRegionColumnNaturalizePass(next, input);
  next = applyRegionBrandMashRepairToPack(next, input);
  next = applyGpt55VoiceFinalPass(next, input, { force: false });

  next = guardPackAgainstShrink(inbound, next, { stage: "writerSovereign" });

  const readAloud = assessReadAloudHumanGate(next, input);
  const blogVoice = getChannelHumanVoice("blog");
  const persona = WRITER_PERSONA_BY_CHANNEL.blog;

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      writerSovereignPass: true,
      writerSovereignVersion: WRITER_SOVEREIGN_VERSION,
      writerSovereignTrimOnly: true,
      writerSovereignPersona: persona.role,
      writerSovereignChannelVoice: blogVoice.roleLabel,
      readAloudHumanGate: readAloud,
      readAloudOk: readAloud.ok,
      shouldWithhold: readAloud.shouldWithhold,
      passOutput: readAloud.shouldWithhold ? false : next._meta?.passOutput,
      failReasons: readAloud.shouldWithhold
        ? [...new Set([...(next._meta?.failReasons || []), ...readAloud.hardReasons])]
        : next._meta?.failReasons,
      writerSovereignChars: getBlogFullText(next).replace(/\s/g, "").length,
      writerSovereignInboundChars: inboundChars,
    },
  };
}

export function buildWriterSovereignPromptBlock(channel = "blog") {
  const persona = WRITER_PERSONA_BY_CHANNEL[normalizeChannel(channel)] || WRITER_PERSONA_BY_CHANNEL.blog;
  const voice = getChannelHumanVoice(channel);
  return [
    "【WRITER SOVEREIGN · 사람이 쓴 글만 송출】",
    `화자: ${persona.role} + ${voice.role} (${persona.editor})`,
    "금지: 조사 팩트 붙이기·「기준이 달라집니다」·안내 기준으로 정리·체크리스트·백과사전·분량 패딩.",
    "필수: 장면→고민→비교→솔직 정리. 브랜드·지역·주제가 자연스럽게. 한 register 유지.",
    `목표: ${persona.agency} 수준 — GPT/제미나이가 아니라 「이 사람 글」.`,
  ].join("\n");
}

function normalizeChannel(channel = "blog") {
  const ch = String(channel || "blog").toLowerCase();
  return ch === "insta" ? "instagram" : ch;
}
