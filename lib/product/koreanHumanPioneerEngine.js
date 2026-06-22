/**
 * Korean Human Pioneer Engine — 대한민국 브랜드 콘텐츠 선구 SSOT
 *
 * AI Writer가 아닌 「선택한 화자가 조사·설명·관찰까지 쓴 칼럼」.
 * Research-grounded · 네이버 칼럼 리듬 · human belief · experience+opinion
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isBriclogResetQualityEnforced } from "@/lib/config/resetLaunchFlags";
import { applyHumanProseDeliveryPass } from "@/lib/content/humanProseDeliveryEngine";
import {
  applyHumanBeliefGate,
  applyLocalEditorBeliefPass,
} from "@/lib/content/humanBeliefGate";
import { applyNarrativeBeliefPass } from "@/lib/content/narrativeBeliefPass";
import { polishNaverBlogVoice } from "@/lib/channel/naverBlogEngineRules";
import {
  applyEditorDuplicateSweep,
  stripGlobalExactDuplicateSentences,
  stripNearDuplicateSentencesGlobally,
} from "@/lib/content/duplicateKillerEngine";
import {
  detectAiWritingPatterns,
  GLOBAL_AI_PATTERN_PHRASES,
} from "@/lib/product/aiPatternDetector";
import { scoreHumanBelief, HUMAN_BELIEF_MIN_SCORE } from "@/lib/product/humanBeliefEngine";
import {
  resolvePersonaEngineProfile,
  scorePersonaEngineAlignment,
} from "@/lib/persona/personaEngineProfile";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { buildResearchFactLines } from "@/lib/content/researchGroundedHumanPack";
import { applyHaeyoConsistencyToPack } from "@/lib/content/haeyoConsistencyGate";
import { sanitizeChecklistForbiddenHeadingsOnPack } from "@/lib/product/checklistVoiceEngine";
import { enrichLlmPackDnaAnchors } from "@/lib/golden/llmDeliveryPolish";
import { assessContentEvaluation } from "@/lib/product/contentEvaluationEngine";
import { assessContentTrustReadable } from "@/lib/quality/qualityTrustKpi";
import { assessGoldenQualityGate } from "@/lib/golden/goldenQualityGate";

export const KOREAN_HUMAN_PIONEER_VERSION = "korean-human-pioneer-v2";

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

function stripAiClicheFromText(text = "") {
  let out = String(text || "");
  for (const phrase of GLOBAL_AI_PATTERN_PHRASES.slice(0, 28)) {
    if (phrase.length >= 4 && out.includes(phrase)) {
      out = out.replace(
        new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    }
  }
  return out.replace(/\n{3,}/g, "\n\n").replace(/\s{2,}/g, " ").trim();
}

function polishPioneerDuplicates(pack, input = {}) {
  let next = stripNearDuplicateSentencesGlobally(pack, 0.58);
  next = applyEditorDuplicateSweep(next, { input }, "blog");
  next = stripGlobalExactDuplicateSentences(next);
  next = stripNearDuplicateSentencesGlobally(next, 0.62);
  return next;
}

/** 송출 직전 — golden·duplicate killer용 글로벌 중복 정리 */
export function applyPioneerDuplicatePolish(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  return polishPioneerDuplicates(pack, input);
}

function personaAnchorPool(profile = {}, input = {}) {
  const brand = String(input.brandName || "매장").trim();
  const region = String(input.region || "").trim();
  const regionBit = region ? `${region} ` : "";
  const fact = buildResearchFactLines(input, 6)
    .map((l) => l.replace(/^·\s*/, "").trim())
    .filter(Boolean);
  const f0 = fact[0]?.slice(0, 36) || "운영 기준";
  const f1 = fact[1]?.slice(0, 32) || "상담 조건";

  if (profile.archetype === "essay") {
    return [
      `${regionBit}${brand}를 떠올리면 그날 분위기가 먼저 떠오릅니다.`,
      `직접 만들어 보면 ${f0} 느낌이 손끝에 남습니다.`,
      `생각해 보면 ${brand}만의 결을 고르는 이유가 보입니다.`,
      `${regionBit}순간 ${f1}이 기억에 남더라구요.`,
    ];
  }
  if (profile.archetype === "expert_column") {
    return [
      `${regionBit}등록 전 ${brand} 기준을 비교해 보면 고민이 덜어집니다.`,
      `살펴보면 ${f0} 차이가 분명해집니다.`,
      `같은 조건에서 체크 포인트를 나눠 보면 기준이 보입니다.`,
      `${regionBit}${brand} ${f1} — 알아두면 이야기가 짧아집니다.`,
    ];
  }
  if (profile.archetype === "field_review") {
    return [
      `${regionBit}${brand}에 직접 들러 보면 ${f0} 감이 옵니다.`,
      `솔직히 상담 받아 보면 고민이 정리됩니다.`,
      `비교해 보면 ${brand} 톤·시술 기준이 분명해집니다.`,
      `직접 확인해 보면 ${f1}이 현장과 맞는지 알 수 있습니다.`,
    ];
  }
  const { key } = getIndustryFlavorForInput(input);
  if (key === "education") {
    return [
      `${regionBit}등록 전 ${brand} 커리큘럼을 비교해 보면 기준이 분명해집니다.`,
      `확인해 보면 ${f0} 차이가 보입니다.`,
    ];
  }
  if (key === "craft") {
    return [
      `${regionBit}직접 만들어 보면 ${brand} 클래스 난이도 감이 옵니다.`,
      `체험해 보면 ${f0} 손맛이 느껴집니다.`,
    ];
  }
  return [
    `${regionBit}${brand} 기준으로 보면 ${f0}가 납득됩니다.`,
    `확인해 보면 ${f1}이 현장과 맞습니다.`,
  ];
}

function weavePersonaRegister(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const profile = resolvePersonaEngineProfile(input);
  let next = pack;
  let alignment = scorePersonaEngineAlignment(next, input, profile);
  if (alignment.ok) return next;

  const pool = personaAnchorPool(profile, input);
  const sections = [...(next.sections || [])];
  const used = new Set();

  for (let i = 0; i < sections.length && pool.length; i += 1) {
    alignment = scorePersonaEngineAlignment({ ...next, sections }, input, profile);
    if (alignment.ok) break;

    for (let p = 0; p < pool.length; p += 1) {
      const line = pool[(i + p) % pool.length];
      const stem = line.slice(0, 12);
      if (used.has(stem)) continue;
      const body = String(sections[i]?.body || "").trim();
      if (body.includes(stem)) continue;
      sections[i] = {
        ...sections[i],
        body: body ? `${body}\n\n${line}`.trim() : line,
      };
      used.add(stem);
      break;
    }
  }

  next = { ...next, sections };
  alignment = scorePersonaEngineAlignment(next, input, profile);
  if (!alignment.ok && profile.introStyle === "scene_first" && sections[0]) {
    const opener = pool[0];
    const body0 = String(sections[0].body || "").trim();
    if (opener && !body0.includes(opener.slice(0, 10))) {
      sections[0] = {
        ...sections[0],
        body: `${opener}\n\n${body0}`.trim(),
      };
      next = { ...next, sections };
    }
  }
  return next;
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
  const golden = assessGoldenQualityGate(pack, input);
  const persona = scorePersonaEngineAlignment(pack, input);

  const reasons = [];
  if (!belief.ok || belief.score < HUMAN_BELIEF_MIN_SCORE - 8) {
    reasons.push("human_belief_low");
  }
  if (!ai.ok) reasons.push("ai_pattern_detected");
  if (!persona.ok) reasons.push("persona_misaligned");
  if (!evalScore.pass && evalScore.score < 80) reasons.push("content_eval_low");
  if (golden.score < 90) reasons.push("golden_below_90");

  let score = Math.round(
    belief.score * 0.32 +
      (ai.ok ? 92 : 65) * 0.14 +
      Math.min(100, evalScore.score || 0) * 0.22 +
      golden.score * 0.22 +
      (trust.readable ? 95 : trust.score || 70) * 0.1
  );
  score = Math.max(0, Math.min(100, score));

  return {
    ok: reasons.length === 0 && score >= 88 && golden.score >= 90,
    score,
    belief,
    ai,
    persona,
    golden: golden.score,
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
네이버 칼럼 리듬: 장면→고민→비교→솔직 정리. 유사 문장·템플릿 반복 금지.`;
}

/**
 * Research-grounded · 로컬 업종 — 사람 칼럼 선구 패스
 */
export function applyKoreanHumanPioneerPass(pack, input = {}, ctx = {}) {
  if (!pack?.sections?.length || !isKoreanHumanPioneerEnabled()) return pack;

  const before = assessKoreanHumanPioneer(pack, input);
  let   next = sanitizeChecklistForbiddenHeadingsOnPack(pack, input);
  next = applyLocalEditorBeliefPass(next);
  next = applyHumanProseDeliveryPass(next, input);
  next = weavePersonaRegister(next, input);

  for (let round = 0; round < 2; round += 1) {
    const beliefProbe = scoreHumanBelief(getBlogFullText(next), input, next);
    const aiProbe = detectAiWritingPatterns(next, input);
    if (beliefProbe.score >= HUMAN_BELIEF_MIN_SCORE - 4 && aiProbe.ok) break;
    next = applyNarrativeBeliefPass(next, { input, ...input });
    next = applyLocalEditorBeliefPass(next);
    next = weavePersonaRegister(next, input);
  }

  next = {
    ...next,
    sections: (next.sections || []).map((sec) => ({
      ...sec,
      body: polishBody(stripAiClicheFromText(sec.body)),
    })),
    conclusion: next.conclusion
      ? polishBody(stripAiClicheFromText(next.conclusion))
      : next.conclusion,
  };
  next = applyHaeyoConsistencyToPack(next);
  next = enrichLlmPackDnaAnchors(next, input);
  next = polishPioneerDuplicates(next, input);
  next = applyHumanBeliefGate(next, { input, ...input });
  next = sanitizeChecklistForbiddenHeadingsOnPack(next, input);
  next = polishPioneerDuplicates(next, input);

  const after = assessKoreanHumanPioneer(next, input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      koreanHumanPioneerPass: true,
      koreanHumanPioneerVersion: KOREAN_HUMAN_PIONEER_VERSION,
      koreanHumanPioneerBefore: {
        score: before.score,
        golden: before.golden,
        reasons: before.reasons.slice(0, 6),
      },
      koreanHumanPioneerAfter: {
        score: after.score,
        golden: after.golden,
        ok: after.ok,
        reasons: after.reasons.slice(0, 6),
      },
      humanVoiceMet:
        after.belief?.ok !== false &&
        after.ai?.ok !== false &&
        after.persona?.ok !== false,
      personaAligned: after.persona?.ok,
    },
  };
}
