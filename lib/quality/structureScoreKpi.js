/**
 * 인용·경험·브랜드·지역 구조 점수 — AI 브리핑·검색용 추출 가능성 KPI
 * (하드 withhold 아님 · 측정·스탬프용)
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  assessSectionLeadAnswer,
  splitExplainSentences,
} from "@/lib/product/briclogExplainEngine";
import { sentenceExperienceOpinionAxes } from "@/lib/product/briclogExperienceOpinionEngine";
import { assessBrandFactPresence } from "@/lib/product/briclogResetQualityGate";

export const STRUCTURE_SCORE_KPI_VERSION = "structure-kpi-v1";
export const STRUCTURE_SCORE_PASS = 70;

/**
 * @param {object} pack
 * @param {object} input
 */
export function assessStructureScore(pack, input = {}) {
  const sections = pack?.sections || [];
  const full = getBlogFullText(pack || {});
  const leadBody = String(sections[0]?.body || full || "").trim();
  const lead = assessSectionLeadAnswer(leadBody, input);

  const experienceHits = sentenceExperienceOpinionAxes(full);
  const experienceSentence = experienceHits.length >= 1;

  const region = String(input.region || input.area || "").trim();
  const regionOk =
    !region ||
    region.length < 2 ||
    full.includes(region) ||
    region.split(/\s+/).some((p) => p.length >= 2 && full.includes(p));

  const brandFact = assessBrandFactPresence(pack, input);
  const brandOk = brandFact.ok || !String(input.brandName || "").trim();

  const parts = {
    leadAnswer: Boolean(lead.ok),
    experienceSentence,
    region: Boolean(regionOk),
    brandFact: Boolean(brandOk),
  };
  const hit = Object.values(parts).filter(Boolean).length;
  const score = Math.round((hit / 4) * 100);
  const ok = score >= STRUCTURE_SCORE_PASS;

  return {
    version: STRUCTURE_SCORE_KPI_VERSION,
    ok,
    score,
    passMin: STRUCTURE_SCORE_PASS,
    parts,
    lead,
    experienceAxes: experienceHits,
    brandFactHits: brandFact.hits?.length ?? 0,
    reasons: [
      !parts.leadAnswer ? "lead_answer_weak" : null,
      !parts.experienceSentence ? "experience_missing" : null,
      !parts.region ? "region_missing" : null,
      !parts.brandFact ? "brand_fact_weak" : null,
    ].filter(Boolean),
  };
}

/**
 * @param {Array<{ pack: object, input: object, label?: string }>} cases
 */
export function measureStructureScoreKpi(cases = []) {
  const results = cases.map((c, i) => {
    const structure = assessStructureScore(c.pack, c.input);
    return {
      index: i,
      label: c.label || `case-${i + 1}`,
      ...structure,
    };
  });
  const total = results.length;
  const passed = results.filter((r) => r.ok).length;
  const rate = total ? passed / total : 0;
  return {
    version: STRUCTURE_SCORE_KPI_VERSION,
    total,
    passed,
    rate,
    target: 0.7,
    targetMet: rate >= 0.7,
    results,
  };
}

/** 플레이스 본문용 — 섹션 팩 없이 텍스트만 */
export function assessPlaceStructureSignals(text = "", input = {}) {
  const t = String(text || "");
  const lead = assessSectionLeadAnswer(t, input);
  const experienceSentence = sentenceExperienceOpinionAxes(t).length >= 1;
  const brand = String(input.brandName || "").trim();
  const region = String(input.region || "").trim();
  const brandOk = !brand || t.includes(brand);
  const regionOk =
    !region ||
    region.length < 2 ||
    t.includes(region) ||
    region.split(/\s+/).some((p) => p.length >= 2 && t.includes(p));
  const hit = [lead.ok, experienceSentence, brandOk, regionOk].filter(Boolean).length;
  return {
    ok: hit >= 3,
    score: Math.round((hit / 4) * 100),
    leadOk: Boolean(lead.ok),
    experienceSentence,
    brandOk,
    regionOk,
  };
}

export { splitExplainSentences };
