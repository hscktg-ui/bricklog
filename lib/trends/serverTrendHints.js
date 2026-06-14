/**
 * Server-only trend snapshot merge (API / orchestrator — not client bundle)
 */
import { createRequire } from "node:module";
import { resolveBrandIndustryContext } from "@/lib/brand/brandContext";

const requireServer = createRequire(import.meta.url);

/** @param {Record<string, unknown>} input */
export function attachServerTrendSnapshot(input = {}) {
  if (typeof window !== "undefined") return input;
  try {
    const { loadSnapshot } = requireServer("../trends/storage.js");
    const { trendHintsFromSnapshot } = requireServer("../trends/clientSnapshot.js");
    const snapshot = loadSnapshot();
    if (!snapshot?.hasVerifiedData) return input;
    const flavor = resolveBrandIndustryContext(input).flavor;
    const industryKey = flavor?.industryKey || input.industryKey || "flower";
    const mergeHints = (channel, field) => {
      const collected = trendHintsFromSnapshot(snapshot, industryKey, channel);
      const existing = String(input[field] || "").trim();
      return [...collected, existing].filter(Boolean).join(" · ").slice(0, 520);
    };
    return {
      ...input,
      trendSnapshot: snapshot,
      trendSnapshotSource: "collected_server",
      trendHintsBlog: mergeHints("blog", "trendHintsBlog"),
      trendHintsPlace: mergeHints("place", "trendHintsPlace"),
      trendHintsInstagram: mergeHints("instagram", "trendHintsInstagram"),
    };
  } catch {
    return input;
  }
}
