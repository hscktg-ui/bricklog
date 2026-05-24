import {
  formatBlogFullCopy,
  formatPlaceFullCopy,
  formatInstaFullCopy,
} from "@/utils/copyFormatter";
import { enrichBlogPack, enrichPlacePack, enrichInstaPack } from "@/lib/prompts/engine/enrichOutput";
import { scrubGptToneDeep } from "@/utils/gptToneScrubber";
import { cleanOutputText } from "@/utils/sanitizeInput";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";

function scrubPackText(obj) {
  if (typeof obj === "string") return scrubGptToneDeep(obj);
  if (Array.isArray(obj)) return obj.map(scrubPackText);
  if (obj && typeof obj === "object") {
    const next = {};
    for (const [k, v] of Object.entries(obj)) next[k] = scrubPackText(v);
    return next;
  }
  return obj;
}

export function reapplyBlogEdits(pack, ctx, input) {
  let next = scrubPackText({ ...pack });
  next.title = next.representativeTitle || next.title;
  next.representativeTitle = cleanOutputText(
    next.representativeTitle || next.title || ""
  );
  next.sections = (next.sections || [])
    .map((s) => ({
      heading: cleanOutputText(s.heading),
      body: cleanOutputText(s.body),
    }))
    .filter((s) => s.body && s.body.length > 10);
  next.conclusion = cleanOutputText(next.conclusion || "");
  next.hashtags = (next.hashtags || [])
    .map((t) => cleanOutputText(String(t).replace(/^#/, "")))
    .filter(Boolean);
  next._edited = true;
  next._editedAt = new Date().toISOString();
  return enrichBlogPack(next, ctx, input);
}

export function reapplyPlaceEdits(pack, ctx, input) {
  let next = scrubPackText({ ...pack });
  next.title = cleanOutputText(next.title);
  next.shortNotice = cleanOutputText(next.shortNotice || next.shortBody);
  next.shortBody = next.shortNotice;
  next.detailBody = cleanOutputText(next.detailBody || "");
  next.body = [next.shortNotice, next.detailBody].filter(Boolean).join("\n\n");
  next.cta = cleanOutputText(next.cta || "");
  next._edited = true;
  next._editedAt = new Date().toISOString();
  return enrichPlacePack(next, ctx, input);
}

export function reapplyInstaEdits(pack, ctx, input) {
  let next = scrubPackText({ ...pack });
  next.hook = cleanOutputText(next.hook);
  next.body = cleanOutputText(next.body);
  next.ending = cleanOutputText(next.ending);
  const parts = [next.hook, next.body, next.ending].filter(Boolean);
  next.lineBreakBody = parts.join("\n\n");
  next._edited = true;
  next._editedAt = new Date().toISOString();
  return enrichInstaPack(next, ctx, input);
}

export function parseHashtagsInput(raw) {
  return String(raw || "")
    .split(/[\s,#]+/)
    .map((t) => t.replace(/^#/, "").trim())
    .filter((t) => t.length > 1);
}

export function quickBlogCharCount(pack) {
  return countBlogBodyChars(pack);
}
