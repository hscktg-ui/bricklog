/**
 * Launch Publish-First Mode — 정식 출시 Phase 0 delivery
 */
import { scrubPlaceholderFromPack } from "@/lib/content/placeholderTraceEngine";
import { scrubCustomerForbiddenSurfaceInPack } from "@/lib/copy/customerFacing";
import { finalizeCustomerFacingBlogPack } from "@/lib/product/customerFacingSanitize";
import { BRICLOG_QUALITY_DEFAULTS } from "@/lib/config/briclogDefaults";
import { applyGpt55VoiceFinalPass } from "@/lib/product/gpt55LightDelivery";
import { humanizeBlogProsePack } from "@/lib/content/blogProseHumanize";
import {
  hasUsableResearchFacts,
  weaveResearchFactsIntoPack,
} from "@/lib/content/researchGroundedHumanPack";
import {
  ensureVerbatimTopicCompliance,
  sanitizeVerbatimTopicInPack,
} from "@/lib/content/informationUnitEngine";
import { stripGlobalExactDuplicateSentences } from "@/lib/content/duplicateKillerEngine";
import { formatBlogFullCopy } from "@/utils/copyFormatter";
import { enrichPipelineInput } from "@/lib/content/channelBrandResolve";

export {
  LAUNCH_PUBLISH_TIME_BUDGET_MS,
  LAUNCH_PUBLISH_MAX_LLM_ATTEMPTS,
  LAUNCH_PUBLISH_CLIENT_FETCH_MS,
  isLaunchPublishFirstMode,
  getLaunchPublishTimeBudgetMs,
  getLaunchPublishMaxAttempts,
  shouldWithholdCustomerDelivery,
} from "@/lib/config/launchPublishFlags";

/**
 * 최소 후처리만 — 슬롯 패딩·mission deepen·belief boost 생략
 */
export function finalizeLaunchPublishBlogPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  input = enrichPipelineInput(input);
  let next = pack;
  next = scrubPlaceholderFromPack(next, input);
  next = scrubCustomerForbiddenSurfaceInPack(next, input);
  next = humanizeBlogProsePack(next, input);
  if (hasUsableResearchFacts(input)) {
    next = weaveResearchFactsIntoPack(next, input);
  }
  next = ensureVerbatimTopicCompliance(next, input, "blog");
  next = sanitizeVerbatimTopicInPack(next, input, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = finalizeCustomerFacingBlogPack(next, input);
  if (BRICLOG_QUALITY_DEFAULTS.applyGpt55VoiceFinal) {
    next = applyGpt55VoiceFinalPass(next, input, { force: true });
  }
  next = humanizeBlogProsePack(next, input);
  if (!next?.sections?.length) {
    return {
      ...next,
      _meta: {
        ...(next._meta || {}),
        outputWithheld: true,
        completeDraft: false,
        displayReady: false,
        publishReady: false,
      },
    };
  }
  const fullCopyText =
    String(next.fullCopyText || "").trim() ||
    formatBlogFullCopy(next, {
      includeSubheadings: next._meta?.includeSubheadings !== false,
    });
  return {
    ...next,
    fullCopyText,
    _meta: {
      ...(next._meta || {}),
      launchPublishFirst: true,
      publishReady: true,
      passOutput: true,
      completeDraft: true,
      displayReady: true,
      writerFirstDelivery: true,
      contentQualityDelivered: true,
      skipHeavyDeliveryPolish: true,
      outputWithheld: false,
      withheld: false,
      withholdReason: undefined,
    },
  };
}
