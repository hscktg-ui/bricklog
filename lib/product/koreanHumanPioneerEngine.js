/**
 * Korean Human Pioneer Engine — 대한민국 브랜드 콘텐츠 선구 SSOT
 *
 * AI Writer가 아닌 「선택한 화자가 조사·설명·관찰까지 쓴 칼럼」.
 * Research-grounded · 네이버 칼럼 리듬 · human belief · experience+opinion
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { applyExplainRepairToPack } from "@/lib/product/briclogExplainEngine";
import { applyExperienceRepairToPack } from "@/lib/product/briclogExperienceOpinionEngine";
import { applyHumanProseDeliveryPass } from "@/lib/content/humanProseDeliveryEngine";
import {
  applyHumanBeliefGate,
  applyLocalEditorBeliefPass,
} from "@/lib/content/humanBeliefGate";
import { applyNarrativeBeliefPass } from "@/lib/content/narrativeBeliefPass";
import { polishNaverBlogVoice } from "@/lib/channel/naverBlogEngineRules";
import { stripGlobalExactDuplicateSentences } from "@/lib/content/duplicateKillerEngine";
import { detectAiWritingPatterns } from "@/lib/product/aiPatternDetector";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import { resolvePersonaEngineProfile } from "@/lib/persona/personaEngineProfile";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { buildResearchFactLines } from "@/lib/content/researchGroundedHumanPack";
import { assessContentEvaluation } from "@/lib/product/contentEvaluationEngine";
import { assessContentTrustReadable } from "@/lib/quality/qualityTrustKpi";

export const KOREAN_HUMAN_PIONEER_VERSION = "korean-human-pioneer-v1";

export const KOREAN_HUMAN_PIONEER_VISION = {
  ko: "세상에 없던 — 대한민국 브랜드 운영에 맞춘, 진짜 사람이 쓴 것 같은 AI 선구 엔진",
  pillars: ["조사 박음", "설명·이유", "관찰·경험", "화자 register", "네이버 칼럼 리듬"],
};

export function isKoreanHumanPioneerEnabled() {
  if (process.env.BRICLOG_KOREAN_HUMAN_PIONEER === "false") return false;
  if (process.env.BRICLOG_KOREAN_HUMAN_PIONEER === "true") return true;
  return isBriclogMissionEnforced() && isBriclogResetQualityEnforced();
}

function polishBody(text = "") {
  return polishNaverBlogVoice(String(text || "").replace(/\s{2,}/g, " ").trim());
}

function personaVoiceAnchor(profile = {}, input = {}) {
  const brand = String(input.brandName || "매장").trim();
  const region = String(input.region || "").trim();
  const { key } = getIndustryFlavorForInput(input);
  const fact = buildResearchFactLines(input, 4)[0]?.replace(/^·\s*/, "") || "";
  const regionBit = region ? `${region} ` : "";

  if (profile.archetype === "field_review") {
    return `${regionBit}${brand}에 직접 들러 보면 ${fact ? fact.slice(0, 36) : "현장 기준이"} 감이 옵니다.`;
  }
  if (profile.archetype === "essay") {
    return `${regionBit}${brand}를 떠올리면 ${fact ? fact.slice(0, 32) : "그날의 분위기"}가 먼저 떠오릅니다.`;
  }
  if (profile.archetype === "expert_column") {
    return `${regionBit}같은 조건을 비교해 보면 ${brand} ${fact ? fact.slice(0, 34) : "운영 기준"}이 기준이 됩니다.`;
  }
  if (key === "education") {
    return `${regionBit}등록 전 ${brand} 커리큘럼을 비교해 보면 선택 기준이 분명해집니다.`;
  }
  if (key === "craft") {
    return `${regionBit}직접 만들어 보면 ${brand} 클래스 난이도 감이 옵니다.`;
  }
  if (key === "salon") {
    return `${regionBit}상담 받아 보면 ${brand} 톤·시술 기준이 분명해집니다.`;
  }
  return `${regionBit}${brand} 기준으로 보면 ${fact ? fact.slice(0, 36) : "현장 안내"}가 납득됩니다.`;
}

function weavePersonaVoiceAnchor(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const full = getBlogFullText(pack);
  const profile = resolvePersonaEngineProfile(input);
  const required = profile.requiredVoice || [];
  if (required.some((re) => re.test(full))) return pack;

  const anchor = personaVoiceAnchor(profile, input);
  if (!anchor || full.includes(anchor.slice(0, 12))) return pack;

  const sections = [...pack.sections];
  const idx = Math.min(1, sections.length - 1);
  const body = String(sections[idx]?.body || "").trim();
  sections[idx] = {
    ...sections[idx],
    body: body ? `${body}\n\n${anchor}`.trim() : anchor,
  };
  return { ...pack, sections };
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function assessKoreanHumanPioneer(pack, input = {}) {
  if (!pack?.sections?.length) {
    return { ok: false, score: 0, reasons: ["empty_pack"], version: KOREAN_HUMAN_PIONEER_VERSION };
  }
  const full = getBlogFullText(pack);
  const belief = pack._meta?.humanBelief || scoreHumanBelief(full, input, pack);
  const ai = detectAiWritingPatterns(pack, input);
  const evalScore = assessContentEvaluation(pack, input);
  const trust = assessContentTrustReadable(pack, input);

  const reasons = [];
  if (!belief.ok || belief.score < HUMAN_BELIEF_MIN_SCORE - 8) {
    reasons.push("human_belief_low");
  }
  if (!ai.ok) reasons.push("ai_pattern_detected");
  if (!evalScore.pass && evalScore.score < 80) reasons.push("content_eval_low");

  let score = Math.round(
    belief.score * 0.42 +
      (ai.ok ? 92 : 68) * 0.18 +
      Math.min(100, evalScore.score || 0) * 0.25 +
      (trust.readable ? 95 : trust.score || 70) * 0.15
  );
  score = Math.max(0, Math.min(100, score));

  return {
    ok: reasons.length === 0 && score >= 82,
    score,
    belief,
    ai,
    evalScore: evalScore.score,
    trustReadable: trust.readable,
    reasons,
    version: KOREAN_HUMAN_PIONEER_VERSION,
  };
}

export function buildKoreanHumanPioneerPromptBlock(input = {}) {
  const profile = resolvePersonaEngineProfile(input);
  return `【KOREAN HUMAN PIONEER · ${KOREAN_HUMAN_PIONEER_VERSION}】
${KOREAN_HUMAN_PIONEER_VISION.ko}
화자: ${profile.label} — 처음부터 끝까지 동일 register.
조사 팩트→이유·설명→관찰·경험→정리. FAQ·체크리스트·「소개합니다」 금지.
네이버 칼럼 리듬: 장면→고민→비교→솔직 정리.`;
}

/**
 * Research-grounded · 로컬 업종 — 사람 칼럼 선구 패스
 */
export function applyKoreanHumanPioneerPass(pack, input = {}, ctx = {}) {
  if (!pack?.sections?.length || !isKoreanHumanPioneerEnabled()) return pack;
  if (pack._meta?.koreanHumanPioneerPass && !ctx.force) return pack;

  const before = assessKoreanHumanPioneer(pack, input);
  let next = applyLocalEditorBeliefPass(pack);
  next = applyExplainRepairToPack(next, input);
  next = applyExperienceRepairToPack(next, input);
  next = applyHumanProseDeliveryPass(next, input);
  next = weavePersonaVoiceAnchor(next, input);

  const beliefProbe = scoreHumanBelief(getBlogFullText(next), input, next);
  if (beliefProbe.score < HUMAN_BELIEF_MIN_SCORE - 6) {
    next = applyNarrativeBeliefPass(next, { input, ...input });
    next = applyLocalEditorBeliefPass(next);
  }

  next = {
    ...next,
    sections: (next.sections || []).map((sec) => ({
      ...sec,
      body: polishBody(sec.body),
    })),
    conclusion: next.conclusion ? polishBody(next.conclusion) : next.conclusion,
  };
  next = stripGlobalExactDuplicateSentences(next);
  next = applyHumanBeliefGate(next, { input, ...input });

  const after = assessKoreanHumanPioneer(next, input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      koreanHumanPioneerPass: true,
      koreanHumanPioneerVersion: KOREAN_HUMAN_PIONEER_VERSION,
      koreanHumanPioneerBefore: {
        score: before.score,
        reasons: before.reasons.slice(0, 6),
      },
      koreanHumanPioneerAfter: {
        score: after.score,
        ok: after.ok,
        reasons: after.reasons.slice(0, 6),
      },
      humanVoiceMet: after.belief?.ok !== false && after.ai?.ok !== false,
    },
  };
}
