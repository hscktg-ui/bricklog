/**
 * 사람이 쓴 글처럼 — 구어·감정·고민→결과 (네이버 표본 학습 프로필 기반)
 */
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { shouldApplyExperienceVoiceEnhancement } from "@/lib/persona/speakerVoiceLock";
import { getBlogFullText } from "@/utils/qualityCheck";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import {
  buildExperienceVoiceLines,
  buildExperienceVoicePromptBlock,
  scoreExperienceVoice,
  EXPERIENCE_VOICE_MARKERS,
} from "@/lib/content/experienceVoiceProfile";
import { lineViolatesHomeRegion } from "@/lib/content/regionVoiceLock";
import { isDisplayBodyForbidden } from "@/lib/content/displayBodyGuards";

export { EXPERIENCE_VOICE_MARKERS as CONVERSATIONAL_HUMAN_MARKERS };
export { buildExperienceVoicePromptBlock as buildConversationalVoicePromptBlock };
export { scoreExperienceVoice as scoreConversationalHumanVoice };

function shouldSkipConversationalVoice(input = {}) {
  /** Speaker Voice Lock — field_review 화자만 후기형 구어 주입 */
  return !shouldApplyExperienceVoiceEnhancement(input);
}

function paragraphKey(text) {
  return String(text || "")
    .replace(/\s/g, "")
    .slice(0, 56);
}

/** 기·승·전·결 구간에 학습 기반 구어 1줄씩 */
export function applyHumanConversationalVoice(pack, input = {}) {
  if (!pack?.sections?.length || !isBriclogMissionEnforced()) return pack;
  if (pack._meta?.humanConversationalVoice) return pack;
  if (shouldSkipConversationalVoice(input)) return pack;

  const p = deriveTopicWritingContext(input);
  const lines = buildExperienceVoiceLines(p, input);
  const used = new Set();
  const full = getBlogFullText(pack);

  const pickLine = (idx) => {
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[(idx + i) % lines.length];
      const key = paragraphKey(line);
      if (used.has(key)) continue;
      if (full.includes(line.slice(0, 20))) continue;
      if (lineViolatesHomeRegion(line, input)) continue;
      if (isDisplayBodyForbidden(line, input)) continue;
      used.add(key);
      return line;
    }
    return null;
  };

  const sectionCount = (pack.sections || []).length;
  /** 도입(0)은 Human Story 전용 — 학습 문장 prepend 금지 */
  const targetSections = [2, sectionCount - 2].filter(
    (i) => i >= 0 && i < sectionCount
  );
  const sections = (pack.sections || []).map((sec, i) => {
    const slotIdx = targetSections.indexOf(i);
    if (slotIdx < 0) return sec;
    const line = pickLine(slotIdx);
    if (!line) return sec;
    const body = String(sec.body || "").trim();
    const insertAt = slotIdx === 0 ? "prepend" : "append";
    if (body.includes(line.slice(0, 16))) return sec;
    return {
      ...sec,
      body:
        insertAt === "prepend"
          ? `${line}\n\n${body}`.trim()
          : `${body}\n\n${line}`.trim(),
    };
  });

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      humanConversationalVoice: true,
      conversationalVoice: scoreExperienceVoice(
        getBlogFullText({ ...pack, sections })
      ),
    },
  };
}

/** 압축 후에도 남아야 하는 구어 마무리 */
export function ensureHumanConversationalBookends(pack, input = {}) {
  if (!pack || !isBriclogMissionEnforced()) return pack;
  if (shouldSkipConversationalVoice(input)) return pack;

  const p = deriveTopicWritingContext(input);
  const lines = buildExperienceVoiceLines(p, input);
  const reliefLine = lines[3];
  const closeLine = lines[4];
  const full = getBlogFullText(pack);
  let conclusion = String(pack.conclusion || "").trim();

  if (reliefLine && !/(?:다행이에요|미리\s*.+?(?:걸|할\s*걸))/.test(full)) {
    if (!isDisplayBodyForbidden(reliefLine, input)) {
      conclusion = conclusion ? `${conclusion}\n\n${reliefLine}`.trim() : reliefLine;
    }
  }
  if (closeLine && !/(?:헷갈렸는데|누워보니\s*감)/.test(full)) {
    if (!isDisplayBodyForbidden(closeLine, input)) {
      conclusion = conclusion ? `${conclusion}\n\n${closeLine}`.trim() : closeLine;
    }
  }

  return {
    ...pack,
    conclusion,
    _meta: {
      ...(pack._meta || {}),
      conversationalBookends: true,
      conversationalVoice: scoreExperienceVoice(
        getBlogFullText({ ...pack, conclusion })
      ),
    },
  };
}
