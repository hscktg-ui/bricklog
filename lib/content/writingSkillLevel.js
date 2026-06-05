/**
 * 고객 약속 글쓰기 숙련도 — 일반인 < 전문가 < 프로
 * UI·폼의 proficiency와 병행; writingSkillLevel이 있으면 proficiency에 매핑한다.
 */
import { resolveProficiency } from "@/lib/constitution/writingConstitutionV2";

/** @type {{ value: string, label: string, proficiency: string, hint: string }[]} */
export const WRITING_SKILL_LEVEL_OPTIONS = [
  {
    value: "civilian",
    label: "일반인",
    proficiency: "general",
    hint:
      "친구에게 말하듯 직접 쓴 톤. 짧은 문장·일상 어휘. 설명·수식·보고서체 금지. 감정은 장면으로.",
  },
  {
    value: "expert",
    label: "전문가",
    proficiency: "marketer",
    hint:
      "업종·이용 맥락을 알고 쓰는 실무 톤. 정보와 공감 균형. 광고·AI 관용구·나열 금지.",
  },
  {
    value: "pro",
    label: "프로",
    proficiency: "writer_pro",
    hint:
      "에디터·작가급 리듬·여운. 문장 밀도 높음. 군더더기·반복·분량 늘리기용 문장 금지.",
  },
];

const ALIASES = {
  일반인: "civilian",
  일반: "civilian",
  general_public: "civilian",
  beginner: "civilian",
  전문가: "expert",
  expert: "expert",
  marketer: "expert",
  editor_pro: "expert",
  프로: "pro",
  pro: "pro",
  writer_pro: "pro",
};

/**
 * @param {Record<string, unknown>} input
 */
export function resolveWritingSkillLevel(input = {}) {
  const raw =
    input.writingSkillLevel ||
    input.skillTier ||
    input.writingLevel ||
    null;
  if (!raw) {
    const prof = resolveProficiency(input);
    const fromProf = WRITING_SKILL_LEVEL_OPTIONS.find(
      (o) => o.proficiency === prof.value
    );
    if (fromProf) return { ...fromProf, source: "proficiency" };
    return { ...WRITING_SKILL_LEVEL_OPTIONS[1], source: "default" };
  }
  const key = ALIASES[String(raw).trim()] || String(raw).trim();
  const opt =
    WRITING_SKILL_LEVEL_OPTIONS.find((o) => o.value === key) ||
    WRITING_SKILL_LEVEL_OPTIONS[1];
  return { ...opt, source: "explicit" };
}

/**
 * proficiency 필드에 숙련도 매핑 반영
 * @param {Record<string, unknown>} input
 */
export function applyWritingSkillToInput(input = {}) {
  const skill = resolveWritingSkillLevel(input);
  if (input.writingSkillLevel || input.skillTier || input.writingLevel) {
    return { ...input, proficiency: skill.proficiency, writingSkillLevel: skill.value };
  }
  return input;
}

/**
 * @param {Record<string, unknown>} input
 */
export function getWritingSkillPromptLine(input = {}) {
  const s = resolveWritingSkillLevel(input);
  return `【글쓰기 숙련도 · ${s.label}】 ${s.hint} 분량 채우기·AI 티·감정 나열 문장 금지.`;
}
