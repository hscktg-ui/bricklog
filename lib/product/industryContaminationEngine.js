/**
 * INDUSTRY CONTAMINATION ENGINE — 업종 외 문장 유입 차단
 */
import {
  detectIndustryCrossContamination,
  industryForbiddenPhrases,
} from "@/lib/pipeline/v2/industryLock";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { getBlogFullText } from "@/utils/qualityCheck";
export const INDUSTRY_CONTAMINATION_VERSION = "v1";

export function resolveLockedIndustryKey(input = {}) {
  const { flavor } = getIndustryFlavorForInput(input);
  return flavor?.industryKey || input.industryKey || input.industry || "default";
}

/**
 * @returns {{ ok: boolean, violations: object[], foreignHits: string[] }}
 */
export function detectIndustryContamination(textOrPack, input = {}) {
  const text =
    typeof textOrPack === "string"
      ? textOrPack
      : getBlogFullText(textOrPack);
  const lockedKey = resolveLockedIndustryKey(input);
  const cross = detectIndustryCrossContamination(text, lockedKey);

  const violations = (cross.violations || []).map((v) => ({
    type: "cross_industry",
    industry: v.foreignIndustry,
    pattern: v.pattern,
  }));

  return {
    version: INDUSTRY_CONTAMINATION_VERSION,
    ok: violations.length === 0,
    lockedKey,
    violations,
    foreignHits: violations.map((v) => v.pattern || v.sentence).filter(Boolean),
  };
}

export function assertNoIndustryContamination(pack, input = {}) {
  const result = detectIndustryContamination(pack, input);
  return {
    ok: result.ok,
    stage: "industry_contamination",
    reasons: result.ok ? [] : ["industry_contamination"],
    ...result,
    userMessage: result.ok
      ? null
      : "업종과 맞지 않는 표현이 섞였어요. 조사·업종 맥락을 확인한 뒤 다시 작성합니다.",
  };
}

function foreignIndustryPatterns(lockedKey) {
  return industryForbiddenPhrases(lockedKey);
}

function stripForeignIndustryFromText(text, lockedKey) {
  const patterns = foreignIndustryPatterns(lockedKey);
  if (!patterns.length) return String(text || "").trim();

  const parts = String(text || "")
    .split(/(?<=[.!?。])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/\s/g, "").length >= 8);

  const kept = parts.filter(
    (sentence) => !patterns.some((re) => re.test(sentence))
  );
  return kept.length ? kept.join("\n\n").trim() : String(text || "").trim();
}

/** 업종 외 문장 제거 — salvage/display 마지막 정리 */
export function stripIndustryContaminationFromPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const lockedKey = resolveLockedIndustryKey(input);
  const strip = (text) => stripForeignIndustryFromText(text, lockedKey);
  return {
    ...pack,
    sections: (pack.sections || []).map((sec) => ({
      ...sec,
      heading: strip(sec.heading || ""),
      body: strip(sec.body || ""),
    })),
    conclusion: pack.conclusion ? strip(pack.conclusion) : pack.conclusion,
    intro: pack.intro ? strip(pack.intro) : pack.intro,
  };
}
