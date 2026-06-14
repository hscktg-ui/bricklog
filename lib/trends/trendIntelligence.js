/**
 * Trend Intelligence — 수집 스냅샷 + 2026–2027 플랫폼 SSOT 병합
 * (fs 기반 storage는 API route 전용 — 클라이언트 번들 금지)
 */
import {
  getCachedSnapshot,
  trendHintsFromSnapshot,
} from "./clientSnapshot";
import {
  getPlatformTrendBrief,
  isPlatformTrendsActive,
  PLATFORM_TRENDS_VERSION,
} from "./platformTrends2026";

function platformTrendHintsForChannel(channel = "blog") {
  if (!isPlatformTrendsActive()) return [];
  const brief = getPlatformTrendBrief(channel);
  return brief ? [`[${PLATFORM_TRENDS_VERSION}] ${brief}`] : [];
}

export function getCachedTrendSnapshot() {
  return getCachedSnapshot();
}

export function getTrendIntelligenceProfile(brandId = null, industryKey = "flower") {
  const snapshot = getCachedTrendSnapshot();
  const platformActive = isPlatformTrendsActive();
  const hasCollected = Boolean(snapshot?.hasVerifiedData);

  return {
    source: hasCollected
      ? "collected_snapshot"
      : platformActive
        ? "platform_trends_2026"
        : "none",
    snapshot,
    platformTrends2026: platformActive,
    brandId,
    industryKey,
    searchApiReady: Boolean(snapshot?.collectorStatus?.naver?.ok),
    performanceApiReady: false,
  };
}

export function getTrendHintsForChannel(channel, brandId = null, industryKey = "flower") {
  const snapshot = getCachedTrendSnapshot();
  const collected = snapshot?.hasVerifiedData
    ? trendHintsFromSnapshot(snapshot, industryKey, channel)
    : [];
  const platform = platformTrendHintsForChannel(channel);

  if (collected.length && platform.length) {
    return [...collected, ...platform].slice(0, 6);
  }
  return collected.length ? collected : platform;
}
