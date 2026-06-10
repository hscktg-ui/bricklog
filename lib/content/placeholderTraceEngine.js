/**
 * Placeholder 추적 — 파이프라인 단계별 오염 SSOT
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  countPlaceholderContamination,
  scrubPlaceholderPatternsFromText,
} from "@/lib/content/placeholderContaminationEngine";

export const PLACEHOLDER_TRACE_VERSION = "trace-v1";

function scrubPlaceholderPatterns(text = "") {
  return scrubPlaceholderPatternsFromText(text);
}

/** 단계별 placeholder 스냅샷을 _meta.placeholderTrace에 누적 */
export function tracePlaceholderAtStage(pack, input = {}, stage = "unknown") {
  if (!pack) return pack;
  const full = getBlogFullText(pack);
  const counts = countPlaceholderContamination(full);
  const entry = {
    stage,
    at: new Date().toISOString(),
    total: counts.total,
    hits: counts.hits,
  };
  const prev = pack._meta?.placeholderTrace || [];
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      placeholderTrace: [...prev, entry],
      placeholderContaminationLatest: counts,
    },
  };
}

/** 본문에서 placeholder 패턴 제거 (재생성 없음) */
export function scrubPlaceholderFromPack(pack) {
  if (!pack?.sections?.length) return pack;
  const sections = pack.sections.map((sec) => ({
    ...sec,
    heading: scrubPlaceholderPatterns(sec.heading),
    body: scrubPlaceholderPatterns(sec.body),
  }));
  const conclusion = pack.conclusion
    ? scrubPlaceholderPatterns(pack.conclusion)
    : pack.conclusion;
  return {
    ...pack,
    title: scrubPlaceholderPatterns(pack.title),
    representativeTitle: scrubPlaceholderPatterns(pack.representativeTitle),
    sections,
    conclusion,
    _meta: {
      ...(pack._meta || {}),
      placeholderScrubbed: true,
    },
  };
}
