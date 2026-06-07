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
import {
  applyBrandContentEngine,
  isMechanicalListingTitle,
} from "@/lib/content/brandContentEngine";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import {
  applyDuplicateKiller,
  detectDuplicateKillerIssues,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import { scoreInformationYield } from "@/lib/content/informationEngine";

function pruneResolvedFailReasons(pack, input = {}, reasons = []) {
  const ctx = { ...input, input };
  const full = getBlogFullText(pack);
  const title = pack?.representativeTitle || pack?.title || "";
  let next = [...reasons];
  if (title && !isMechanicalListingTitle(title, ctx, input)) {
    next = next.filter(
      (r) =>
        r !== "mechanical_title" &&
        r !== "brand_mechanical_title" &&
        r !== "perspective_mechanical_title" &&
        r !== "editor_mechanical_title"
    );
  }
  const length = assertBlogLengthTier(input, pack);
  if (length.ok) {
    next = next.filter((r) => r !== "length_tier_under" && r !== "length_tier_over");
  }
  const dup = detectDuplicateKillerIssues(full, { sameInfoMax: 2, similarityPercent: 72 });
  if (dup.ok) {
    next = next.filter(
      (r) =>
        r !== "duplicate_killer_fail" &&
        r !== "duplicate_content" &&
        !String(r).startsWith("coverage_duplicate")
    );
  }
  const info = scoreInformationYield(full, ctx, "blog");
  if (info.ok) {
    next = next.filter(
      (r) =>
        r !== "information_yield_low" &&
        r !== "information_units_low" &&
        r !== "topic_dominance_low"
    );
  }
  return [...new Set(next)];
}

/** 화면 표시용 — 메타 문장 제거 + fullCopyText 생성 */
export function ensureBlogDisplayPack(blog, input = {}) {
  if (!blog?.sections?.length) return blog;

  let pack = applyBrandContentEngine(blog, { input }, input);
  pack = applyDuplicateKiller(pack, { input }, "blog");
  pack = stripGlobalExactDuplicateSentences(pack);
  pack = sanitizeBlogPackMetaLayer(pack);
  const outline = detectOutlineLeak(pack);
  if (outline.isOutline) {
    pack = sanitizeBlogPackMetaLayer(rewriteOutlinePackToProse(pack, input));
  }

  const metaClean = !hasMetaPhilosophyLeak(getBlogFullText(pack), input);
  const readiness = assessCompletionReadiness(pack, input);
  const humanWriting = assessHumanWritingDelivery(pack, input);
  const completeDraft =
    metaClean && readiness.displayReady && humanWriting.humanReady;
  const deliveryReady = humanWriting.displayReady;
  const failReasons = pruneResolvedFailReasons(
    pack,
    input,
    pack._meta?.failReasons || []
  );
  const meta = {
    ...pack._meta,
    failReasons,
    isBriefOnly: false,
    outlineDisplayRewritten: outline.isOutline || undefined,
    metaLayerScrubbed: metaClean || pack._meta?.metaLayerScrubbed,
    completeDraft: completeDraft || undefined,
    displayReady: deliveryReady,
    publishReady: completeDraft ? true : false,
    completionReadiness: {
      ...readiness,
      displayReady: deliveryReady,
    },
    humanWritingDelivery: {
      humanReady: humanWriting.humanReady,
      displayReady: deliveryReady,
      reasons: (humanWriting.reasons || []).slice(0, 6),
    },
  };
  if (completeDraft) {
    meta.deliveryPreview = false;
    meta.deliveryPreviewMessage = undefined;
    meta.displayReady = true;
    meta.publishReady = true;
    meta.humanWritingDelivery.humanReady = true;
    meta.humanWritingDelivery.displayReady = true;
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
