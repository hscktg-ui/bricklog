import { kstDateString } from "./collectors/base";
import { collectNewsRss } from "./collectors/newsRss";
import {
  collectNaver,
  collectGoogle,
  collectInstagram,
  collectYoutube,
} from "./collectors/pendingApis";
import { classifySignals } from "./industryClassifier";
import {
  analyzeIndustryPatterns,
  buildBestPatterns,
} from "./patternAnalyzer";

export async function runTrendCollection() {
  const dateKst = kstDateString();
  const results = await Promise.all([
    collectNewsRss(),
    collectNaver(),
    collectGoogle(),
    collectInstagram(),
    collectYoutube(),
  ]);

  const collectorStatus = {};
  const signals = [];

  for (const r of results) {
    collectorStatus[r.source] = {
      ok: r.ok,
      count: r.items?.length || 0,
      error: r.error,
      pending: r.meta?.pending === true,
      fetchedAt: r.fetchedAt,
    };
    if (r.ok && r.items?.length) {
      for (const item of r.items) {
        signals.push({
          ...item,
          fetchedAt: r.fetchedAt,
        });
      }
    }
  }

  const buckets = classifySignals(signals);
  const industries = buckets.map(analyzeIndustryPatterns);
  const bestPatterns = buildBestPatterns(industries);
  const hasVerifiedData = signals.some((s) => s.verified);

  return {
    dateKst,
    collectedAt: new Date().toISOString(),
    status: hasVerifiedData ? "partial" : "pending",
    signals: signals.slice(0, 120),
    industries,
    bestPatterns,
    collectorStatus,
    hasVerifiedData,
    disclaimer:
      hasVerifiedData
        ? "수집된 공개 데이터만 반영 · 원문 미제공"
        : "검증된 수집 데이터 없음 · API 연동 후 06:00 KST 자동 수집",
  };
}
