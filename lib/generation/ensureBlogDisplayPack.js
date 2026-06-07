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
  applyBrandContentTitles,
  isMechanicalListingTitle,
} from "@/lib/content/brandContentEngine";
import { assertBlogLengthTier } from "@/lib/content/blogLengthDelivery";
import {
  applyDuplicateKiller,
  detectDuplicateKillerIssues,
  stripGlobalExactDuplicateSentences,
} from "@/lib/content/duplicateKillerEngine";
import { scoreInformationYield } from "@/lib/content/informationEngine";
import { weaveTopicDominanceIntoPack } from "@/lib/content/v13ContentGate";
import {
  applyEditorV95Pass,
  assertEditorV95ForOutput,
  polishEditorV95Delivery,
} from "@/lib/product/briclogEditorEngineV95";
import {
  ensureEditorDeliveryStructure,
  sanitizeEditorLeakPack,
} from "@/lib/content/editorQualityEngine";
import { assertEditorPreOutput } from "@/lib/content/editorPreOutputGate";
import {
  detectVerbatimTopicUsage,
  ensureVerbatimTopicCompliance,
  sanitizeVerbatimTopicInPack,
} from "@/lib/content/informationUnitEngine";
import { scoreGiSeungJeonGyeol } from "@/lib/content/editorQualityEngine";
import { ensureMinBlogSections } from "@/lib/content/blogLengthControl";
import { deepenPackBodiesToMin } from "@/lib/content/blogLengthDeepen";
import { resolveBlogLengthTier } from "@/lib/constants";
import { countBlogBodyCharsWithSpaces } from "@/lib/prompts/engine/textUtils";

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
  const editor = assertEditorV95ForOutput(pack, ctx, input);
  if (editor.editorV95?.editorPass) {
    next = next.filter(
      (r) =>
        r !== "editor_editor_v95" &&
        r !== "editor_v95_fail" &&
        r !== "first_delivery_editor_v95"
    );
  }
  if (detectVerbatimTopicUsage(pack, input).ok) {
    next = next.filter((r) => r !== "editor_verbatim_topic_dump" && r !== "verbatim_topic_repeat");
  }
  const flow = scoreGiSeungJeonGyeol(pack);
  if (flow.ok) {
    next = next.filter(
      (r) =>
        !r.startsWith("structure_") &&
        r !== "editor_structure_flow"
    );
  }
  const editorPre = assertEditorPreOutput(pack, ctx, input);
  if (editorPre.ok) {
    next = next.filter(
      (r) =>
        !r.startsWith("editor_") &&
        !r.startsWith("structure_") &&
        r !== "duplicate_content" &&
        r !== "editor_tone_weak"
    );
  }
  return [...new Set(next)];
}

/** 화면 표시용 — 메타 문장 제거 + fullCopyText 생성 */
export function ensureBlogDisplayPack(blog, input = {}) {
  if (!blog?.sections?.length) return blog;

  const salvageFinalized = Boolean(blog._meta?.salvageDeliveryFinalized);
  let pack = salvageFinalized ? blog : applyBrandContentEngine(blog, { input }, input);

  if (salvageFinalized) {
    pack = applyBrandContentTitles(pack, { input }, input);
    pack = ensureVerbatimTopicCompliance(pack, input, "blog");
    pack = ensureMinBlogSections(pack, { input }, input);
    pack = polishEditorV95Delivery(pack, { input }, input);
    pack = sanitizeEditorLeakPack(pack);
    pack = sanitizeBlogPackMetaLayer(pack);
  } else {
    pack = weaveTopicDominanceIntoPack(pack, { input });
    pack = applyDuplicateKiller(pack, { input }, "blog");
    pack = stripGlobalExactDuplicateSentences(pack);
    pack = ensureMinBlogSections(pack, { input }, input);
    pack = ensureEditorDeliveryStructure(pack, input);
    pack = sanitizeEditorLeakPack(pack);
    pack = sanitizeVerbatimTopicInPack(pack, input, "blog");
    pack = applyEditorV95Pass(pack, { input }, input);
    pack = sanitizeBlogPackMetaLayer(pack);
  }

  const primaryTitle = String(
    pack.representativeTitle || pack.title || blog.representativeTitle || blog.title || ""
  ).trim();
  if (primaryTitle) {
    pack = {
      ...pack,
      title: primaryTitle,
      representativeTitle: primaryTitle,
      titles: [primaryTitle],
    };
  }

  const tier = resolveBlogLengthTier(input.blogLengthTier || "medium");
  if (countBlogBodyCharsWithSpaces(pack) < tier.min) {
    pack = deepenPackBodiesToMin(pack, tier.min, { input, _salvageForce: true }, input);
    pack = applyDuplicateKiller(pack, { input }, "blog");
    pack = stripGlobalExactDuplicateSentences(pack);
    pack = ensureMinBlogSections(pack, { input }, input);
    pack = sanitizeBlogPackMetaLayer(pack);
  }
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
  const editorPre = assertEditorPreOutput(pack, { input }, input);
  const failReasons = pruneResolvedFailReasons(
    pack,
    input,
    editorPre.ok ? [] : editorPre.reasons
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
