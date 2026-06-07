/**
 * Speaker Voice Lock — v4Speaker × personaEngineProfile SSOT
 * 생성·후처리·humanBelief·프롬프트가 같은 화자 register를 따른다.
 */
import { V4_SPEAKER_OPTIONS } from "@/lib/persona/v4Speakers";
import { resolveContentPersona } from "@/lib/persona/contentPersona";
import {
  resolvePersonaEngineProfile,
} from "@/lib/persona/personaEngineProfile";
import { HUMAN_EDITOR_NARRATIVE_STEPS } from "@/lib/product/humanityCommonSenseEngine";

/** UI v4Speaker → doctrine·프롬프트용 표시 라벨 */
export function resolveSpeakerDisplayLabel(input = {}) {
  const v4 = String(input.v4Speaker || "").trim();
  if (v4 && v4 !== "auto") {
    const opt = V4_SPEAKER_OPTIONS.find((o) => o.value === v4);
    if (opt?.label) return opt.label;
  }
  const persona = resolveContentPersona(input);
  return (
    input.contentPersonaLabel ||
    persona.label ||
    "균형 에디터"
  );
}

export function resolveSpeakerEngineProfile(input = {}) {
  return resolvePersonaEngineProfile(input);
}

/** 방문·체험 후기 register — experience voice·field smell 적용 대상 */
export function isFieldReviewSpeaker(input = {}) {
  return resolvePersonaEngineProfile(input).archetype === "field_review";
}

/** 후기형 구어 주입(experience voice lines) — field_review만 */
export function shouldApplyExperienceVoiceEnhancement(input = {}) {
  return isFieldReviewSpeaker(input);
}

/** Human Story problem-opening 강제 — scene-first 화자 */
export function shouldApplyHumanStoryOpeningRewrite(input = {}) {
  const archetype = resolvePersonaEngineProfile(input).archetype;
  return archetype === "field_review" || archetype === "local_note";
}

const NARRATIVE_BY_ARCHETYPE = {
  field_review:
    "기(왜 찾게 됐는지) → 승(직접 방문·체험) → 전(비교·기준) → 결(본인 정리)",
  brand_editor:
    "맥락(브랜드·이야기) → 준비·지향 → 독자에게 맞는 설명 → 정리 (방문자 후기 톤 금지)",
  expert_column:
    "질문·헷갈림 → 기준·비교 → 확인 가능한 정보 → 선택 정리 (FAQ·체크리스트 금지)",
  local_note:
    "동네 맥락 → 생활 장면 → 브랜드·장소 연결 → 정리",
  magazine:
    "맥락 → 흐름 설명 → 핵심 정리 → 마무리",
  essay: "느낌·상황 → 선택 이유 → 인상 → 정리",
};

/** LLM user prompt — 화자별 서사 (방문 후기 고정 금지) */
export function buildPersonaNarrativeFlowBrief(input = {}) {
  const profile = resolvePersonaEngineProfile(input);
  const fixed = NARRATIVE_BY_ARCHETYPE[profile.archetype];
  if (fixed) return fixed;
  const arc = (profile.narrativeEmphasis || [])
    .map(
      (id) =>
        HUMAN_EDITOR_NARRATIVE_STEPS.find((s) => s.id === id)?.label || id
    )
    .join(" → ");
  return arc || "맥락 → 정보 → 비교·기준 → 정리";
}
