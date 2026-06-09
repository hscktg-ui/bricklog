/**
 * Golden Dataset — 업종 적합도 (해신기획 Industry DNA 연동)
 */
import { INDUSTRY_CONTENT_DNA } from "@/lib/golden/haeshinContentDnaSeed";
import { resolveGoldenIndustryKey } from "@/lib/golden/goldenIndustryKeys";

/**
 * @param {string} full
 * @param {object} input
 */
export function scoreGoldenIndustryFit(full = "", input = {}) {
  const key = resolveGoldenIndustryKey(input);
  const dna = INDUSTRY_CONTENT_DNA[key] || INDUSTRY_CONTENT_DNA.etc;
  const text = String(full || "");

  const foreignHits = [];
  for (const re of dna.forbiddenWords || []) {
    if (re.test(text)) foreignHits.push(re.source);
  }

  let score = 100;
  score -= Math.min(50, foreignHits.length * 18);

  const mustHit = (dna.mustInclude || []).filter((m) => {
    const w = String(m).split(/\s/)[0];
    return w.length >= 2 && text.includes(w);
  }).length;
  score += Math.min(20, mustHit * 5);

  const preferred = (dna.preferredLines || []).filter((l) => text.includes(l.slice(0, 10))).length;
  score += Math.min(10, preferred * 4);

  return {
    score: Math.max(0, Math.min(100, score)),
    ok: foreignHits.length === 0 && score >= 75,
    industryKey: key,
    dnaLabel: dna.label,
    foreignHits,
    mustHit,
    preferred,
  };
}
