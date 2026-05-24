import { findForeignRegions } from "@/lib/integrity/templateIntegrity";

export function detectLocationLeak(text, region) {
  const leaks = findForeignRegions(text, region);
  return {
    hasLeak: leaks.length > 0,
    regions: leaks,
    score: leaks.length ? 45 : 92,
  };
}
