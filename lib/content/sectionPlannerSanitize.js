/**
 * Section Planner 내부 ID·번호 복제 소제목 차단
 */
import { isSubstantiveSectionBody } from "@/lib/content/sectionWriterBodies";
import { normalizeHeadingKey } from "@/lib/content/knowledgeCoverageEngine";

const INTERNAL_HEADING_ID_RE =
  /\s*\(([a-z][a-z0-9]*)(?:_x\d+)?\)\s*$/gi;
const INTERNAL_INLINE_ID_RE = /\(([a-z][a-z0-9]+)_x\d+\)/gi;
const INTERNAL_BRACKET_UNIT_RE = /\[[^\]]*?(lineup|feature|buy|promo|install|as|visit|faq|compare)[^\]]*?\]/gi;

export const NUMBERED_DUPLICATE_HEADING_RE = /\s*\(\d+\)\s*$/;

export function isNumberedDuplicateHeading(heading) {
  return NUMBERED_DUPLICATE_HEADING_RE.test(String(heading || "").trim());
}

export function stripInternalPlannerIds(text) {
  return String(text || "")
    .replace(INTERNAL_INLINE_ID_RE, "")
    .replace(INTERNAL_HEADING_ID_RE, "")
    .replace(NUMBERED_DUPLICATE_HEADING_RE, "")
    .replace(INTERNAL_BRACKET_UNIT_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 중복 시 null — (2)(3) 번호 증가 금지
 * @param {string} heading
 * @param {Set<string>} used
 */
export function resolvePublishHeading(heading, used) {
  let h = stripInternalPlannerIds(heading);
  if (!h || isNumberedDuplicateHeading(h)) return null;
  const key = normalizeHeadingKey(h);
  if (!key || used.has(key)) return null;
  used.add(key);
  return h;
}

/** @deprecated use resolvePublishHeading — never assigns (2)(3) */
export function disambiguatePublishHeading(heading, used) {
  return resolvePublishHeading(heading, used) || null;
}

export function sanitizeBlogPackPlannerLeak(pack) {
  if (!pack?.sections?.length) return pack;
  const used = new Set();
  const sections = [];
  for (const sec of pack.sections) {
    if (!isSubstantiveSectionBody(sec.body)) continue;
    const heading = resolvePublishHeading(sec.heading || "", used);
    if (!heading) continue;
    sections.push({
      ...sec,
      heading,
      body: stripInternalPlannerIds(sec.body),
    });
  }
  return {
    ...pack,
    title: stripInternalPlannerIds(pack.title),
    representativeTitle: stripInternalPlannerIds(pack.representativeTitle),
    conclusion: stripInternalPlannerIds(pack.conclusion),
    sections,
    _meta: pack._meta
      ? {
          ...pack._meta,
          sectionPlan: undefined,
          topicUnits: undefined,
        }
      : pack._meta,
  };
}

