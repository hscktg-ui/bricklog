import {
  removeBannedMechanicalLines,
  stripRegionDigitArtifacts,
  dedupeParagraphs,
} from "@/lib/integrity/blogSanitizer";
import { scrubMechanicalSeoPhrases } from "@/lib/keywords/naturalKeywordWeave";
import { fixBrandJosa } from "@/lib/korean/josaFix";

export function sanitizeChannelText(text, ctx = {}) {
  let s = String(text || "");
  s = removeBannedMechanicalLines(s);
  s = scrubMechanicalSeoPhrases(s);
  s = stripRegionDigitArtifacts(s, ctx.region);
  s = dedupeParagraphs(s);
  if (ctx.brandName) s = fixBrandJosa(s, ctx.brandName);
  return s.trim();
}

export function sanitizePlacePack(pack, ctx = {}) {
  if (!pack) return pack;
  const fields = ["title", "shortNotice", "shortBody", "detailBody", "cta"];
  const next = { ...pack };
  for (const key of fields) {
    if (next[key]) next[key] = sanitizeChannelText(next[key], ctx);
  }
  return next;
}

export function sanitizeInstaPack(pack, ctx = {}) {
  if (!pack) return pack;
  const fields = ["hook", "body", "ending", "lineBreakBody"];
  const next = { ...pack };
  for (const key of fields) {
    if (next[key]) next[key] = sanitizeChannelText(next[key], ctx);
  }
  return next;
}
