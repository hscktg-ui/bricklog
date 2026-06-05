import {
  V3_INDUSTRY_DRIFT_PHRASES,
  V3_AI_CONTAMINATION_PHRASES,
} from "@/lib/content/v3/constants";
import { findBannedTemplateHits } from "@/lib/content/v2BannedTemplates";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function findIndustryDriftHits(text) {
  const full = normalizeText(text);
  const hits = [
    ...findBannedTemplateHits(full),
    ...V3_INDUSTRY_DRIFT_PHRASES.filter((p) =>
      full.includes(normalizeText(p))
    ),
  ];
  return [...new Set(hits)];
}

export function findAiContaminationHits(text) {
  const full = normalizeText(text);
  return V3_AI_CONTAMINATION_PHRASES.filter((p) =>
    full.includes(normalizeText(p))
  );
}

/**
 * V3 6·10단계 — 업종 무관·AI 오염 문장 제거
 */
export function purgeIndustryAndAiSentences(pack, ctx = {}) {
  if (!pack?.sections?.length) {
    return { pack, removedCount: 0, industryHits: [], aiHits: [] };
  }

  const driftRe = new RegExp(
    [...V3_INDUSTRY_DRIFT_PHRASES, ...V3_AI_CONTAMINATION_PHRASES]
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")
  );

  let removedCount = 0;
  const industryHits = [];
  const aiHits = [];

  const cleanBody = (body) => {
    const sentences = splitKoreanSentences(body);
    const kept = [];
    for (const s of sentences) {
      if (driftRe.test(s)) {
        removedCount += 1;
        if (findIndustryDriftHits(s).length) industryHits.push(s.slice(0, 60));
        if (findAiContaminationHits(s).length) aiHits.push(s.slice(0, 60));
      } else {
        kept.push(s);
      }
    }
    return kept.join("\n\n");
  };

  const sections = pack.sections.map((sec) => ({
    ...sec,
    body: cleanBody(sec.body || ""),
    title: sec.title,
  }));

  let conclusion = pack.conclusion;
  if (conclusion) conclusion = cleanBody(conclusion);

  return {
    pack: { ...pack, sections, conclusion },
    removedCount,
    industryHits: [...new Set(industryHits)],
    aiHits: [...new Set(aiHits)],
  };
}
