import { parseOpenAIJson } from "@/lib/prompts/parseResponse";
import { cleanOutputText } from "@/utils/sanitizeInput";
import { buildForbiddenList } from "@/utils/filterForbiddenWords";
import { formatHashtag } from "@/lib/prompts/engine/textUtils";
import { toInstaLineBreaks } from "@/lib/prompts/engine/textUtils";
import { polishPlacePack, polishInstaPack } from "@/lib/korean/writingTrends";

export function parseChannelResponse(channel, raw, ctx = {}) {
  const parsed = parseOpenAIJson(raw);
  if (!parsed) return null;

  const forbidden = buildForbiddenList(ctx);

  if (channel === "place") {
    const sp = parsed.smartplace || parsed.place || parsed;
    if (!sp?.title) return null;
    let pack = {
      title: cleanOutputText(sp.title, forbidden),
      shortNotice: cleanOutputText(sp.shortNotice || "", forbidden),
      detailBody: cleanOutputText(sp.detailBody || "", forbidden),
      tags: (sp.tags || []).map((t) => formatHashtag(t)).filter(Boolean),
    };
    pack = polishPlacePack(pack);
    return pack;
  }

  if (channel === "instagram") {
    const ig = parsed.instagram || parsed.insta || parsed;
    if (!ig?.body && !ig?.hook) return null;
    const body = cleanOutputText(ig.body || "", forbidden);
    let pack = {
      hook: cleanOutputText(ig.hook || "", forbidden),
      body,
      lineBreakBody: toInstaLineBreaks(body),
      ending: cleanOutputText(ig.ending || "", forbidden),
      hashtags: (ig.hashtags || [])
        .map((t) => formatHashtag(t))
        .filter(Boolean),
    };
    pack = polishInstaPack(pack);
    return pack;
  }

  if (channel === "image") {
    const img = parsed.image || parsed;
    if (
      !img?.thumbnailPrompt &&
      !img?.placeImagePrompt &&
      !img?.instagramCardPrompt
    ) {
      return null;
    }
    return {
      thumbnailPrompt: String(img.thumbnailPrompt || "").trim(),
      placeImagePrompt: String(img.placeImagePrompt || "").trim(),
      instagramCardPrompt: String(img.instagramCardPrompt || "").trim(),
      bannerPrompt: String(img.bannerPrompt || "").trim(),
      activePrompt:
        String(img.thumbnailPrompt || img.placeImagePrompt || "").trim(),
    };
  }

  return null;
}
