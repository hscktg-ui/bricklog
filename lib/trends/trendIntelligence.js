/**
 * Trend Intelligence — 실제 스냅샷만 사용 (가짜 트렌드 금지)
 */
import {
  getCachedSnapshot,
  trendHintsFromSnapshot,
} from "./clientSnapshot";

export function getCachedTrendSnapshot() {
  return getCachedSnapshot();
}

export function getTrendIntelligenceProfile(brandId = null, industryKey = "flower") {
  const snapshot = getCachedTrendSnapshot();
  return {
    source: snapshot?.hasVerifiedData ? "collected_snapshot" : "none",
    snapshot,
    brandId,
    industryKey,
    searchApiReady: Boolean(snapshot?.collectorStatus?.naver?.ok),
    performanceApiReady: false,
  };
}

export function getTrendHintsForChannel(channel, brandId = null, industryKey = "flower") {
  const snapshot = getCachedTrendSnapshot();
  if (snapshot?.hasVerifiedData) {
    return trendHintsFromSnapshot(snapshot, industryKey, channel);
  }
  return [];
}
