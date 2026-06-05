/**
 * 홈 지역과 맞지 않는 학습·표본 문장 차단 (파주 → 강남 오염 등)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { detectRegionCommonSenseViolations } from "@/lib/product/humanityCommonSenseEngine";

/** 본문에 다른 도시명이 단독으로 끼면 차단 */
const REGION_BRAND_NOISE_RES = [
  /파주(?:미용실|역|운정|야당|일산)?/,
  /운정(?:역|미용)?/,
  /야당(?:역|미용)?/,
  /일산(?:미용|역)?/,
  /해운대(?:꽃|미용)?/,
  /부산(?:미용|꽃)?/,
  /제주(?:펜션|카페)?/,
  /송도(?:내과|병원)?/,
];

/**
 * @param {string} line
 * @param {object} input
 */
export function lineViolatesHomeRegion(line = "", input = {}) {
  const text = String(line || "").trim();
  if (!text || text.replace(/\s/g, "").length < 10) return false;
  const home = String(input.region || "").trim();
  if (!home) return false;

  const regionCheck = detectRegionCommonSenseViolations(text, input);
  if (!regionCheck.ok) return true;

  for (const re of REGION_BRAND_NOISE_RES) {
    if (!re.test(text)) continue;
    const match = text.match(re)?.[0] || "";
    if (match && !home.includes(match.replace(/미용실|역|미용|꽃|펜션|카페|내과|병원/g, ""))) {
      if (!home.includes("파주") && /파주/.test(text)) return true;
      if (!home.includes("운정") && /운정/.test(text)) return true;
      if (!home.includes("야당") && /야당/.test(text)) return true;
      if (!home.includes("일산") && /일산/.test(text)) return true;
      if (!home.includes("해운대") && /해운대/.test(text)) return true;
      if (!home.includes("부산") && /부산/.test(text)) return true;
      if (!home.includes("제주") && /제주/.test(text)) return true;
      if (!home.includes("송도") && /송도/.test(text)) return true;
    }
  }
  return false;
}

/**
 * @param {string} text
 * @param {object} input
 */
export function stripForeignRegionSentences(text = "", input = {}) {
  const kept = [];
  for (const para of String(text || "").split(/\n\n+/)) {
    const t = para.trim();
    if (!t) continue;
    const merged = splitKoreanSentences(t)
      .filter((s) => !lineViolatesHomeRegion(s, input))
      .join(" ")
      .trim();
    if (merged.replace(/\s/g, "").length >= 12) kept.push(merged);
  }
  return kept.join("\n\n").trim();
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function applyRegionVoiceLockToPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const sections = (pack.sections || []).map((sec) => ({
    ...sec,
    body: stripForeignRegionSentences(sec.body, input),
  }));
  let next = {
    ...pack,
    sections: sections.filter((s) => String(s.body || "").replace(/\s/g, "").length >= 20),
    conclusion: pack.conclusion
      ? stripForeignRegionSentences(pack.conclusion, input)
      : pack.conclusion,
  };
  const full = getBlogFullText(next);
  const violations = detectRegionCommonSenseViolations(full, input);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      regionVoiceLock: { ok: violations.ok, issues: violations.issues },
    },
  };
}
