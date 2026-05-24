import { computeFinalQualityScore } from "@/lib/pipeline/v2/finalQualityScore";
import { runV4CoreAudit } from "@/lib/quality/v4ContentAudit";
import { getBlogFullText } from "@/utils/qualityCheck";
import { checkPlaceQuality, checkInstaQuality } from "@/utils/qualityCheck";
import { countBlogBodyChars } from "@/lib/prompts/engine/textUtils";
import { TRAINING_BLOG_MIN_CHARS } from "./constants";
import { packFullContent } from "@/lib/memory/contentStore";
import { USER_QUALITY_GOAL } from "@/lib/quality/qualityTargets";

export function scoreTrainingContent(pack, ctx = {}, channel = "blog") {
  if (!pack) {
    return { total: 0, blockers: ["empty"], pass: false };
  }

  if (channel === "blog") {
    const quality = computeFinalQualityScore(pack, ctx);
    const core = runV4CoreAudit(pack, ctx);
    const charCount = countBlogBodyChars(pack);
    const blockers = [...new Set([...core.blockers, ...(quality.pass ? [] : ["quality_score"])])];
    if (charCount < TRAINING_BLOG_MIN_CHARS) blockers.push("length");
    let total = Math.round((quality.total + core.humanityScore) / 2);
    if (charCount < TRAINING_BLOG_MIN_CHARS) total = Math.min(total, 75);
    return {
      total,
      blockers,
      pass: total >= 90 && !blockers.includes("placeholder"),
      breakdown: quality.breakdown,
    };
  }

  const channelPassMin = USER_QUALITY_GOAL;
  const text = packFullContent(channel, pack);
  let total = 80;
  const blockers = [];
  if (channel === "place") {
    const q = checkPlaceQuality(pack, ctx);
    if (!q.ok) {
      total -= 15;
      blockers.push("place_quality");
    }
  }
  if (channel === "instagram") {
    const q = checkInstaQuality(pack, ctx);
    if (!q.ok) {
      total -= 15;
      blockers.push("insta_quality");
    }
  }
  if (!text || text.length < 80) {
    total -= 20;
    blockers.push("length");
  }
  if (/\b(undefined|null)\b/i.test(text)) {
    total -= 30;
    blockers.push("placeholder");
  }
  total = Math.max(0, Math.min(100, total));
  return {
    total,
    blockers,
    pass: total >= channelPassMin && !blockers.includes("placeholder"),
  };
}

export function serializePackForStorage(pack, channel) {
  if (!pack) return "";
  if (channel === "blog") return getBlogFullText(pack).slice(0, 12000);
  return packFullContent(channel, pack).slice(0, 8000);
}
