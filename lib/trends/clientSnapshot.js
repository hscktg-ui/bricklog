import { kstDateString } from "./collectors/base";

const CACHE_KEY = "briclog-trend-snapshot-cache";

export async function fetchTodaySnapshot() {
  const dateKst = kstDateString();
  try {
    const res = await fetch(`/api/trends/snapshot?date=${dateKst}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (data.snapshot) {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ at: Date.now(), snapshot: data.snapshot })
        );
      }
      return data.snapshot;
    }
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) return JSON.parse(raw).snapshot;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export function getIndustryInsight(snapshot, industryKey) {
  if (!snapshot?.industries) return null;
  return (
    snapshot.industries.find((i) => i.industryKey === industryKey) ||
    snapshot.industries.find((i) => i.key === industryKey) ||
    null
  );
}

export function getCachedSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw).snapshot : null;
  } catch {
    return null;
  }
}

export function trendHintsFromSnapshot(snapshot, industryKey, channel) {
  if (!snapshot?.hasVerifiedData) return [];
  const ind = getIndustryInsight(snapshot, industryKey);
  if (!ind) return [];
  const lines = [...(ind.risingThemes || [])].slice(0, 3);
  if (channel === "instagram" && ind.patterns?.sceneHints?.length) {
    lines.push(`장면: ${ind.patterns.sceneHints.join(", ")}`);
  }
  return lines;
}
