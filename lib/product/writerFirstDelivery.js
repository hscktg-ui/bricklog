/**
 * Writer-First Delivery — 조사 → GPT Writer 1회 → 로컬 trim만
 *
 * 약속: 고객에게 보이는 산문은 Writer만 쓴다. 로컬은 중복·placeholder·템플릿·지역붙임 제거만.
 * 조사가 있는데 LLM이 실패하면 Mission 템플릿 대신 withhold + 다시 받기.
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { isBriclogFastPipelineEnabled } from "@/lib/config/briclogFastPipeline";
import { isBriclogMaxQualityEnabled } from "@/lib/config/briclogMaxQuality";
import { isGpt55WriterDominant } from "@/lib/llm/llmProvider";
import { isGpt55LlmPack, shouldPreserveGpt55LlmPackBody } from "@/lib/product/gpt55LlmPackGuard";
import { isLlmOriginatedPack, isWriterEngineExpandedPack } from "@/lib/product/llmPackOrigin";
import { hasUsableResearchFacts } from "@/lib/content/researchGroundedHumanPack";
import {
  applyWriterSovereignDeliveryPass,
  isWriterSovereignModeEnabled,
} from "@/lib/product/writerSovereignPipeline";
import { assessReadAloudHumanGate } from "@/lib/quality/readAloudHumanGate";
import { assessPackRegionBrandMash } from "@/lib/content/regionBrandMashRepair";
import { assessTemplateBoilerplateSpam } from "@/lib/content/templateBoilerplateEngine";
import { assessColumnVisitNorthStar, buildColumnVisitNorthStarPromptBlock } from "@/lib/product/columnVisitNorthStar";
import {
  buildInstagramNorthStarPromptBlock,
  buildPlaceNorthStarPromptBlock,
} from "@/lib/product/channelVisitNorthStar";
import {
  finalizeWriterFirstChannelDelivery,
  shouldUseWriterFirstChannelPostProcess,
} from "@/lib/product/channelWriterFirst";
import { stampDeliveryGradeMeta } from "@/lib/product/deliveryGrade";
import { computeContentQualityValue } from "@/lib/product/contentQualityValue";
import { buildWriterSovereignPromptBlock } from "@/lib/product/writerSovereignPipeline";
import {
  buildNorthStarBrandGrowthBrief,
  buildNorthStarReferencePromptBlock,
} from "@/lib/product/northStarReferenceExamples";
import { stampFirstDeliveryPerfectMeta } from "@/lib/product/customerFacingSanitize";

export const WRITER_FIRST_DELIVERY_VERSION = "writer-first-v1";

export function isWriterFirstDeliveryEnabled() {
  if (process.env.BRICLOG_WRITER_FIRST === "false") return false;
  if (process.env.BRICLOG_WRITER_FIRST === "true") return true;
  return (
    isBriclogResetQualityEnforced() &&
    isBriclogFastPipelineEnabled() &&
    isGpt55WriterDominant() &&
    !isBriclogMaxQualityEnabled()
  );
}

export function isWriterFirstDeliveryPack(pack, input = {}) {
  if (!pack?.sections?.length || !isWriterFirstDeliveryEnabled()) return false;
  return (
    shouldPreserveGpt55LlmPackBody(pack, input) ||
    isGpt55LlmPack(pack, input) ||
    isLlmOriginatedPack(pack, input) ||
    isWriterEngineExpandedPack(pack, input) ||
    pack?._meta?.llmGenerated === true ||
    pack?._meta?.briclogWriterEngine === true
  );
}

/** 조사 완료 상태에서 Mission·draft 템플릿을 고객 UI에 노출하지 않음 */
export function shouldWithholdCustomerMissionPack(pack, input = {}) {
  if (!isWriterFirstDeliveryEnabled() || !hasUsableResearchFacts(input)) {
    return false;
  }
  if (pack?._meta?.llmGenerated === true || isGpt55LlmPack(pack, input)) {
    return false;
  }
  const localProseRoute = Boolean(
    pack?._meta?.missionProseFallback ||
      pack?._meta?.draftFallback ||
      pack?._meta?.deliveryRescue ||
      pack?._meta?.forcedMissionProseRoute ||
      pack?._meta?.researchGroundedHumanPack ||
      pack?._meta?.humanProseFallbackFinish ||
      pack?._meta?.missionProseEngine
  );
  return localProseRoute;
}

export function buildWriterFirstWithholdMessage(input = {}) {
  const brand = String(input.brandName || "매장").trim();
  return `${brand} 조사는 반영됐지만, 이번 초안이 블로그 품질 기준에 못 미쳐요. 「다시 받기」를 눌러 주세요.`;
}

/**
 * LLM 원고 송출 — sovereign trim + read-aloud gate (append·weave·tier 패딩 없음)
 */
export function finalizeWriterFirstBlogDelivery(pack, input = {}, opts = {}) {
  if (!pack?.sections?.length) return pack;

  let next = applyWriterSovereignDeliveryPass(pack, input);
  const readAloud = assessReadAloudHumanGate(next, input);
  const mash = assessPackRegionBrandMash(next, input, "blog");
  const template = assessTemplateBoilerplateSpam(next);
  const northStar = assessColumnVisitNorthStar(next, input);
  const chars = countBlogBodyCharsWithSpaces(next);

  const hardFail =
    readAloud.shouldWithhold ||
    !mash.ok ||
    !template.ok ||
    !northStar.spam.ok ||
    northStar.shouldWithhold ||
    chars < 400;

  const sqv = computeContentQualityValue(next, input);

  next = stampDeliveryGradeMeta(
    {
      ...next,
      _meta: {
        ...(next._meta || {}),
        writerFirstDelivery: true,
        writerFirstDeliveryVersion: WRITER_FIRST_DELIVERY_VERSION,
        writerSovereignBypassHeavyPolish: true,
        contentQualityDelivered: true,
        contentQualityDeliveredAt: new Date().toISOString(),
      readAloudHumanGate: readAloud,
      regionBrandMashOk: mash.ok,
      templateBoilerplateOk: template.ok,
      columnVisitNorthStar: northStar,
      columnVisitNorthStarOk: northStar.publishOk,
        outputWithheld: hardFail && !opts.allowSoftPreview,
        withholdReason: hardFail
          ? readAloud.hardReasons?.[0] ||
            mash.issues?.[0]?.type ||
            "writer_first_quality"
          : undefined,
        sqv,
        contentQualityValue: sqv.score,
        publishReady: !hardFail && sqv.publishReady,
        humanVoiceDeliveryPass: true,
        generationMode: next._meta?.generationMode || "llm_writer_first",
      },
    },
    input
  );

  if (hardFail) return next;
  return stampFirstDeliveryPerfectMeta(next, input);
}

/** postProcessLlmBlog — Writer-first 시 prose 주입 패스 생략 */
export function shouldUseWriterFirstPostProcess(input = {}, pack = {}) {
  if (!isWriterFirstDeliveryEnabled()) return false;
  return (
    isGpt55WriterDominant() ||
    pack?._meta?.llmGenerated ||
    isLlmOriginatedPack(pack, input)
  );
}

export {
  finalizeWriterFirstChannelDelivery,
  shouldUseWriterFirstChannelPostProcess,
} from "@/lib/product/channelWriterFirst";

export function isWriterFirstChannelPack(pack, channel, input = {}) {
  if (!pack || !isWriterFirstDeliveryEnabled()) return false;
  if (channel !== "place" && channel !== "instagram") return false;
  return (
    pack?._meta?.llmGenerated === true ||
    isGpt55LlmPack(pack, input) ||
    isLlmOriginatedPack(pack, input) ||
    pack?._meta?.channelNorthStarPack === true
  );
}

export function buildChannelWriterFirstOrchestratorHint(channel, input = {}) {
  if (!isWriterFirstDeliveryEnabled()) return "";
  const placeBlock = channel === "place" ? buildPlaceNorthStarPromptBlock() : "";
  const instaBlock = channel === "instagram" ? buildInstagramNorthStarPromptBlock() : "";
  const reference = buildNorthStarReferencePromptBlock(channel);
  const growth = buildNorthStarBrandGrowthBrief();
  const block = buildWriterSovereignPromptBlock(channel);
  const facts = (input.researchFacts || [])
    .slice(0, 6)
    .map((f) => f?.fact)
    .filter(Boolean);
  const factLines = facts.length
    ? `\n【조사 팩트 — 문장에 녹일 것, 불릿·템플릿 tail 금지】\n${facts.map((f) => `- ${f}`).join("\n")}`
    : "";
  return `${growth}\n${reference}\n${placeBlock}${instaBlock}\n${block}${factLines}`;
}

export function buildWriterFirstOrchestratorHint(input = {}) {
  if (!isWriterFirstDeliveryEnabled()) return "";
  const block = buildWriterSovereignPromptBlock("blog");
  const northStar = buildColumnVisitNorthStarPromptBlock();
  const reference = buildNorthStarReferencePromptBlock("blog");
  const growth = buildNorthStarBrandGrowthBrief();
  const facts = (input.researchFacts || [])
    .slice(0, 8)
    .map((f) => f?.fact)
    .filter(Boolean);
  const factLines = facts.length
    ? `\n【조사 팩트 — 문장에 자연스럽게 녹일 것, 나열·템플릿 금지】\n${facts.map((f) => `- ${f}`).join("\n")}`
    : "";
  const lengthContract = `【발행 분량 — 바로 복사·붙여넣기】
- 소제목 4~5개, 각 본문 공백 포함 350~900자 (한 줄·불릿·outline 금지)
- 전체 공백 포함 약 3,600~4,400자 — 20년차 파워블로거 칼럼 밀도
- 제목·소제목에 주제 3회 반복 금지, "— 이어서" 접미 금지`;
  return `${growth}\n${reference}\n${northStar}\n${lengthContract}\n${block}${factLines}`;
}

export function isWriterFirstRescueBlocked(input = {}) {
  return isWriterFirstDeliveryEnabled() && hasUsableResearchFacts(input);
}

/** sovereign과 동기화 — Writer-first면 sovereign도 ON */
export function isWriterFirstSovereignActive() {
  return isWriterFirstDeliveryEnabled() && isWriterSovereignModeEnabled();
}
