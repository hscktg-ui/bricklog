/**
 * LLM·송출 직전 — 사람 칼럼 말투 마감 (템플릿 패딩 없음)
 */
import { applyHumanColumnPolish } from "@/lib/content/humanColumnPolishEngine";
import { applyMagazineArcPolish } from "@/lib/content/columnMagazineArchetype";
import { applyNarrativeArcShape } from "@/lib/product/narrativeArcShapeEngine";
import { polishNaverBlogVoice } from "@/lib/channel/naverBlogEngineRules";
import { GLOBAL_AI_PATTERN_PHRASES } from "@/lib/product/aiPatternDetector";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { isFieldReviewSpeaker } from "@/lib/persona/speakerVoiceLock";
import {
  applyGpt55VoiceFinalPass,
  shouldUseGpt55LightDelivery,
} from "@/lib/product/gpt55LightDelivery";

function stripAiClicheLines(text = "") {
  let out = String(text || "");
  for (const phrase of GLOBAL_AI_PATTERN_PHRASES.slice(0, 24)) {
    if (phrase.length >= 4 && out.includes(phrase)) {
      out = out.replace(
        new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ""
      );
    }
  }
  return out.replace(/\n{3,}/g, "\n\n").replace(/\s{2,}/g, " ").trim();
}

function polishSectionBody(body = "") {
  const stripped = stripAiClicheLines(body);
  return polishNaverBlogVoice(stripped);
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function applyHumanVoiceDeliveryPass(pack, input = {}, options = {}) {
  if (!pack?.sections?.length) return pack;
  if (!isBriclogMissionEnforced()) return pack;
  if (!options.force && pack._meta?.humanVoiceDeliveryPass) return pack;
  if (shouldUseGpt55LightDelivery(pack, input)) {
    return applyGpt55VoiceFinalPass(pack, input, options);
  }

  const industryColumnBrandEditor =
    pack?._meta?.industryHumanColumnEditorial &&
    !isFieldReviewSpeaker(input);
  if (industryColumnBrandEditor) {
    const sections = (pack.sections || []).map((sec) => ({
      ...sec,
      body: polishSectionBody(sec.body),
    }));
    return {
      ...pack,
      sections,
      conclusion: polishSectionBody(pack.conclusion),
      _meta: {
        ...(pack._meta || {}),
        humanVoiceDeliveryPass: true,
        humanVoiceLightPolish: true,
      },
    };
  }

  let next = applyNarrativeArcShape(pack, input, options);
  next = applyHumanColumnPolish(next, input);
  next = applyMagazineArcPolish(next, input);
  const sections = (next.sections || []).map((sec) => ({
    ...sec,
    body: polishSectionBody(sec.body),
  }));
  next = {
    ...next,
    sections,
    conclusion: polishSectionBody(next.conclusion),
    _meta: {
      ...(next._meta || {}),
      humanVoiceDeliveryPass: true,
    },
  };
  return next;
}

export function buildHumanVoiceWriterBrief() {
  return `【사람이 직접 쓴 칼럼 — 필수】
정보 나열·백과사전·FAQ·「확인하세요」 금지. 솔직히·다녀왔어요·생각보다·직접·처음엔…했는데 등 경험 구어 3회 이상.
브로슈어·「소개해 드립니다」·「많은 분들이」·「도움이 되시길」 금지. 장면→고민→비교→정리 흐름.`;
}
