/**
 * V14 WRITE 후처리 — 반복·업종·지역 밀도 보정 (PLAN 출력 아님)
 */
import { applyRepetitionControl } from "@/lib/content/repetitionEngine";
import {
  injectIndustryDensity,
  buildIndustryDensityPad,
} from "@/lib/content/industryDensityEngine";
import { enrichRegionDensity } from "@/lib/content/regionDensityEngine";
import {
  detectOutlineLeak,
  rewriteOutlinePackToProse,
  scrubOutlineHeadingsFromPack,
} from "@/lib/content/outlinePackGuard";
import { sanitizeBlogPackMetaLayer } from "@/lib/content/metaLayerSeparation";

function dedupeIdenticalSectionBodies(pack, ctx = {}, input = {}, channel = "blog") {
  if (!pack?.sections?.length || channel !== "blog") return pack;
  const seen = new Set();
  let dupSlot = 0;
  const sections = pack.sections.map((sec) => {
    const sig = String(sec.body || "").trim().slice(0, 100);
    if (!sig || sig.length < 40) return sec;
    if (seen.has(sig)) {
      dupSlot += 1;
      return {
        ...sec,
        body: buildIndustryDensityPad(ctx, input, dupSlot).trim(),
      };
    }
    seen.add(sig);
    return sec;
  });
  return { ...pack, sections };
}

/**
 * @param {object} pack
 * @param {object} ctx
 * @param {string} channel
 */
export function applyV14PostWritePack(pack, ctx = {}, channel = "blog") {
  if (!pack) return pack;
  const input = ctx.input || ctx;
  let next = { ...pack };

  const outline = detectOutlineLeak(next, channel);
  if (outline.isOutline) {
    if (channel === "blog") {
      next = rewriteOutlinePackToProse(next, input);
    }
    next = scrubOutlineHeadingsFromPack(next, input);
  }

  if (channel === "blog") {
    next = sanitizeBlogPackMetaLayer(next);
  }

  next = applyRepetitionControl(next, channel);
  next = dedupeIdenticalSectionBodies(next, ctx, input, channel);
  next = injectIndustryDensity(next, { ...ctx, input }, channel);
  next = enrichRegionDensity(next, { ...ctx, input }, channel);

  return next;
}
