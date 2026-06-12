/**
 * Knowledge Coverage Gate — 섹션 복제·번호 증가·중복 의미 실패 처리
 */
import { detectDuplicateKillerIssues } from "@/lib/content/duplicateKillerEngine";
import {
  buildKnowledgeCoverageMap,
  scoreCoverageInPack,
  normalizeHeadingKey,
  MIN_COVERAGE_AREAS,
} from "@/lib/content/knowledgeCoverageEngine";
import { isSubstantiveSectionBody } from "@/lib/content/sectionWriterBodies";
import { getChannelFullText } from "@/lib/content/channelPack";
import {
  isNumberedDuplicateHeading,
  NUMBERED_DUPLICATE_HEADING_RE,
  stripInternalPlannerIds,
} from "@/lib/content/sectionPlannerSanitize";

export function detectCoverageGateFailures(pack, input = {}) {
  const failures = [];
  const sections = pack?.sections || [];
  const headingKeys = new Map();

  for (const sec of sections) {
    const heading = String(sec.heading || "").trim();
    if (isNumberedDuplicateHeading(heading)) {
      failures.push({
        type: "numbered_duplicate_heading",
        heading,
        message: "번호 증가 소제목 — 섹션 복제 실패",
      });
    }
    const key = normalizeHeadingKey(heading);
    if (key) {
      headingKeys.set(key, (headingKeys.get(key) || 0) + 1);
    }
    if (!isSubstantiveSectionBody(sec.body)) {
      failures.push({
        type: "thin_section",
        heading,
        message: "정보 3문장 미만 — 섹션 생성 실패",
      });
    }
  }

  for (const [key, count] of headingKeys) {
    if (count >= 2) {
      failures.push({
        type: "duplicate_heading",
        heading: key,
        count,
        message: "동일 소제목 복제",
      });
    }
  }

  const full = getChannelFullText(pack, "blog");
  const dup = detectDuplicateKillerIssues(full, {
    sameInfoMax: 2,
    similarityPercent: 70,
  });
  if (!dup.ok) {
    for (const issue of dup.issues.slice(0, 6)) {
      failures.push({ type: issue.type, ...issue, message: "중복 문단·의미·CTA" });
    }
  }

  const map = input.knowledgeCoverage || buildKnowledgeCoverageMap(input);
  const coverage = scoreCoverageInPack(map, pack);
  if (sections.length >= 4 && coverage.covered.length < Math.min(8, map.areas.length * 0.35)) {
    failures.push({
      type: "low_coverage",
      covered: coverage.covered.length,
      total: map.areas.length,
      message: "정보 영역 커버리지 부족",
    });
  }

  return { ok: failures.length === 0, failures, coverage, map };
}

export function shouldTriggerCoverageReresearch(failures = []) {
  return failures.some((f) =>
    ["duplicate_heading", "numbered_duplicate_heading", "low_coverage"].includes(f.type)
  );
}

/**
 * 번호 복제·얇은 섹션·중복 소제목 제거
 */
export function enforceKnowledgeCoverageRules(pack, input = {}) {
  if (!pack?.sections?.length) return pack;

  const seenHeadings = new Set();
  const sections = [];

  for (let i = 0; i < pack.sections.length; i += 1) {
    const sec = pack.sections[i];
    const heading = stripInternalPlannerIds(sec.heading || "");
    if (isNumberedDuplicateHeading(heading)) continue;

    let key = normalizeHeadingKey(heading);
    if (!key) key = `__body_${i}`;
    if (seenHeadings.has(key)) continue;
    if (!isSubstantiveSectionBody(sec.body)) continue;

    seenHeadings.add(key);
    const cleanedHeading = heading.replace(NUMBERED_DUPLICATE_HEADING_RE, "").trim();
    sections.push({
      ...sec,
      heading: cleanedHeading || `안내 ${sections.length + 1}`,
      body: stripInternalPlannerIds(sec.body),
    });
  }

  if (!sections.length && (pack.sections || []).length) {
    const fallback = (pack.sections || [])
      .map((sec, i) => ({
        ...sec,
        heading: String(sec.heading || "").trim() || `안내 ${i + 1}`,
        body: stripInternalPlannerIds(sec.body || ""),
      }))
      .filter((sec) => sec.body.replace(/\s/g, "").length >= 60);
    if (fallback.length) {
      return {
        ...pack,
        sections: fallback,
        _meta: {
          ...(pack._meta || {}),
          knowledgeCoverageGate: true,
          coverageGateSoftKeep: true,
          coverageAreas: (input.knowledgeCoverage || buildKnowledgeCoverageMap(input)).coverageCount,
        },
      };
    }
  }

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      knowledgeCoverageGate: true,
      coverageAreas: (input.knowledgeCoverage || buildKnowledgeCoverageMap(input)).coverageCount,
    },
  };
}

export function applyKnowledgeCoverageGate(pack, ctx = {}, channel = "blog") {
  if (channel !== "blog" || !pack) return pack;
  const input = ctx.input || ctx;
  let next = enforceKnowledgeCoverageRules(pack, input);
  const gate = detectCoverageGateFailures(next, input);
  next._meta = {
    ...(next._meta || {}),
    coverageGate: gate,
    coverageMinAreas: MIN_COVERAGE_AREAS,
    suggestCoverageReresearch: shouldTriggerCoverageReresearch(gate.failures),
  };
  return next;
}
