/**
 * Launch Publish-First Mode — 정식 출시 Phase 0 delivery
 */
import { scrubPlaceholderFromPack } from "@/lib/content/placeholderTraceEngine";
import { scrubCustomerForbiddenSurfaceInPack } from "@/lib/copy/customerFacing";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";
import { finalizeCustomerFacingBlogPack } from "@/lib/product/customerFacingSanitize";

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
  let next = pack;
  if ((next.sections || []).length < 2) {
    next = ensureMinBlogSections(next, { input }, input, 2);
  }
  next = scrubPlaceholderFromPack(next, input);
  next = scrubCustomerForbiddenSurfaceInPack(next, input);
  next = finalizeCustomerFacingBlogPack(next, input);
  return {
    ...next,
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
    },
  };
}
