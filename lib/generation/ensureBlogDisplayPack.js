import { formatBlogFullCopy } from "@/utils/copyFormatter";
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  detectOutlineLeak,
  rewriteOutlinePackToProse,
} from "@/lib/content/outlinePackGuard";
import {
  hasMetaPhilosophyLeak,
  sanitizeBlogPackMetaLayer,
} from "@/lib/content/metaLayerSeparation";
import { assessCompletionReadiness } from "@/lib/product/completionStandard";
import { assessHumanWritingDelivery } from "@/lib/product/humanWritingDeliveryGate";

/** 화면 표시용 — 메타 문장 제거 + fullCopyText 생성 */
export function ensureBlogDisplayPack(blog, input = {}) {
  if (!blog?.sections?.length) return blog;

  let pack = sanitizeBlogPackMetaLayer(blog);
  const outline = detectOutlineLeak(pack);
  if (outline.isOutline) {
    pack = sanitizeBlogPackMetaLayer(rewriteOutlinePackToProse(pack, input));
  }

  const metaClean = !hasMetaPhilosophyLeak(getBlogFullText(pack), input);
  const readiness = assessCompletionReadiness(pack, input);
  const humanWriting = assessHumanWritingDelivery(pack, input);
  const completeDraft =
    metaClean && readiness.displayReady && humanWriting.humanReady;
  const meta = {
    ...pack._meta,
    isBriefOnly: false,
    outlineDisplayRewritten: outline.isOutline || undefined,
    metaLayerScrubbed: metaClean || pack._meta?.metaLayerScrubbed,
    completeDraft: completeDraft || pack._meta?.completeDraft,
    displayReady: completeDraft || pack._meta?.displayReady,
    completionReadiness: readiness,
    humanWritingDelivery: {
      humanReady: humanWriting.humanReady,
      displayReady: humanWriting.displayReady,
      reasons: (humanWriting.reasons || []).slice(0, 6),
    },
  };
  if (completeDraft) {
    meta.deliveryPreview = false;
    meta.deliveryPreviewMessage = undefined;
    meta.displayReady = true;
  }

  const existing = String(pack.fullCopyText || "").trim();
  if (
    existing.length > 40 &&
    !detectOutlineLeak({ ...pack, fullCopyText: existing }).isOutline &&
    !hasMetaPhilosophyLeak(existing, input)
  ) {
    return { ...pack, _meta: meta };
  }
  return {
    ...pack,
    fullCopyText: formatBlogFullCopy(pack, {
      includeSubheadings: pack._meta?.includeSubheadings !== false,
    }),
    _meta: meta,
  };
}
