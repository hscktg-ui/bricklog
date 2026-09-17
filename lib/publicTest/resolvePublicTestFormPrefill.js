import { loadPublicTestFormCache } from "@/lib/publicTest/publicTestFormCache";
import { pickPublicTestSampleForSession } from "@/lib/publicTest/pickPublicTestSample";
import {
  findPublicTestSampleIndex,
  getPublicTestSampleByIndex,
} from "@/lib/publicTest/publicTestSamples";

function readSearchOverrides() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const brandName = params.get("brandName") || "";
  const region = params.get("region") || "";
  const topic = params.get("topic") || params.get("trendContext") || "";

  if (!brandName && !region && !topic) return null;
  return {
    brandName: brandName.trim(),
    region: region.trim(),
    topic: topic.trim(),
  };
}

/**
 * 첫 화면 폼 prefill — 우선순위: 브라우저 입력 캐시 → 세션 로테이션
 * @returns {{ source: "query" | "cache" | "rotation", brandName: string, region: string, topic: string, sampleId?: string, index: number }}
 */
export function resolvePublicTestFormPrefill() {
  const queryOverride = readSearchOverrides();
  const cached = loadPublicTestFormCache();
  const base = cached
    ? {
        source: "cache",
        brandName: cached.brandName,
        region: cached.region,
        topic: cached.topic,
        sampleId: cached.sampleId,
        index: cached.sampleId ? findPublicTestSampleIndex(cached.sampleId) : 0,
      }
    : null;

  if (queryOverride) {
    const resolvedBase =
      base || (() => {
        const picked = pickPublicTestSampleForSession();
        return {
          source: "rotation",
          brandName: picked.brandName,
          region: picked.region,
          topic: picked.topic,
          sampleId: picked.id,
          index: picked.index ?? 0,
        };
      })();
    return {
      ...resolvedBase,
      source: "query",
      brandName: queryOverride.brandName || resolvedBase.brandName,
      region: queryOverride.region || resolvedBase.region,
      topic: queryOverride.topic || resolvedBase.topic,
    };
  }

  if (cached) {
    const byId = cached.sampleId
      ? findPublicTestSampleIndex(cached.sampleId)
      : -1;
    return {
      source: "cache",
      brandName: cached.brandName,
      region: cached.region,
      topic: cached.topic,
      sampleId: cached.sampleId,
      index: byId >= 0 ? byId : 0,
    };
  }

  const picked = pickPublicTestSampleForSession();
  return {
    source: "rotation",
    brandName: picked.brandName,
    region: picked.region,
    topic: picked.topic,
    sampleId: picked.id,
    index: picked.index ?? 0,
  };
}

/** 캐시에 없는 커스텀 입력인지 (가상 샘플과 필드가 다름) */
export function isCustomPublicTestDraft(draft = {}, sampleIndex = 0) {
  const sample = getPublicTestSampleByIndex(sampleIndex);
  if (!sample?.brandName) return true;
  return (
    String(draft.brandName || "").trim() !== sample.brandName ||
    String(draft.region || "").trim() !== sample.region ||
    String(draft.topic || "").trim() !== sample.topic
  );
}
