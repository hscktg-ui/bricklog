/**
 * 주제 유형 ↔ 화자 선택 SSOT (UI 안내·배달 게이트 공통)
 */
import { V4_SPEAKER_OPTIONS } from "@/lib/persona/v4Speakers";
import { getSpeakerPersonaFields } from "@/lib/persona/syncSpeakerPersona";
import {
  isInformationalTopicInput,
  isVisitReviewTopicInput,
} from "@/lib/content/topicFacetEngine";

const VISIT_FIT_PERSONAS = new Set(["visit_review", "local_guide"]);
const INFO_FIT_PERSONAS = new Set(["info_intro", "local_guide", "brand_story"]);

const VISIT_PREFERRED_SPEAKERS = new Set([
  "auto",
  "plain_review",
  "real_use",
  "local_blogger",
]);

const INFO_PREFERRED_SPEAKERS = new Set([
  "auto",
  "expert_info",
  "magazine",
  "column",
  "brand_intro",
  "local_blogger",
]);

/**
 * @param {object} input
 */
export function resolveSpeakerTopicKind(input = {}) {
  if (isVisitReviewTopicInput(input)) return "visit";
  if (isInformationalTopicInput(input)) return "informational";
  return "general";
}

/**
 * @param {object} input
 */
export function assessVisitSpeakerAlignment(input = {}) {
  if (!isVisitReviewTopicInput(input)) return { ok: true, kind: "visit" };
  const speaker = String(input.v4Speaker || "auto").trim();
  if (speaker === "auto") return { ok: true, kind: "visit", speaker };
  const linked = getSpeakerPersonaFields(speaker);
  if (!linked) return { ok: true, kind: "visit", speaker };
  const persona = linked.contentPersona;
  return {
    ok: VISIT_FIT_PERSONAS.has(persona),
    kind: "visit",
    speaker,
    persona,
  };
}

/**
 * @param {object} input
 */
export function assessInformationalSpeakerAlignment(input = {}) {
  if (!isInformationalTopicInput(input)) return { ok: true, kind: "informational" };
  const speaker = String(input.v4Speaker || "auto").trim();
  if (speaker === "auto") return { ok: true, kind: "informational", speaker };
  const linked = getSpeakerPersonaFields(speaker);
  if (!linked) return { ok: true, kind: "informational", speaker };
  const persona = linked.contentPersona;
  if (persona === "visit_review") {
    return { ok: false, kind: "informational", speaker, persona };
  }
  return {
    ok: INFO_FIT_PERSONAS.has(persona),
    kind: "informational",
    speaker,
    persona,
  };
}

/**
 * @param {object} input
 */
export function assessSpeakerTopicAlignment(input = {}) {
  const visit = assessVisitSpeakerAlignment(input);
  if (!visit.ok) {
    return { ok: false, code: "visit_speaker_mismatch", ...visit };
  }
  const info = assessInformationalSpeakerAlignment(input);
  if (!info.ok) {
    return {
      ok: false,
      code: info.persona === "visit_review" ? "info_speaker_mismatch" : "info_speaker_weak",
      ...info,
    };
  }
  return { ok: true, kind: resolveSpeakerTopicKind(input) };
}

/**
 * @param {object} input
 */
export function getSpeakerTopicGuidance(input = {}) {
  const kind = resolveSpeakerTopicKind(input);
  const speaker = String(input.v4Speaker || "auto").trim();
  const alignment = assessSpeakerTopicAlignment(input);

  if (kind === "visit") {
    return {
      kind,
      speaker,
      alignmentOk: alignment.ok,
      alignmentCode: alignment.code || null,
      recommended: ["plain_review", "real_use", "local_blogger"],
      warn: ["expert_info", "brand_intro", "magazine", "column", "essay"],
      message: alignment.ok
        ? "방문·체험 후기 주제 — 담백한 후기형·실사용 후기형이 잘 맞아요."
        : "방문 후기 주제인데 정보형·브랜드 소개 화자는 가이드 글처럼 읽힐 수 있어요. 담백한 후기형을 권장합니다.",
    };
  }

  if (kind === "informational") {
    return {
      kind,
      speaker,
      alignmentOk: alignment.ok,
      alignmentCode: alignment.code || null,
      recommended: ["expert_info", "magazine", "column", "brand_intro"],
      warn: ["plain_review", "real_use"],
      message: alignment.ok
        ? "정보·가이드 주제 — 전문 정보형·매거진·칼럼형이 잘 맞아요."
        : "정보형 주제인데 후기형 화자는 방문 톤이 섞일 수 있어요. 전문 정보형을 권장합니다.",
    };
  }

  return {
    kind,
    speaker,
    alignmentOk: true,
    alignmentCode: null,
    recommended: ["auto"],
    warn: [],
    message: "주제에 맞게 화자를 고르거나 「자동추천」을 쓸 수 있어요.",
  };
}

export function isSpeakerRecommendedForTopic(input = {}, speakerValue = "auto") {
  const kind = resolveSpeakerTopicKind(input);
  if (kind === "visit") return VISIT_PREFERRED_SPEAKERS.has(speakerValue);
  if (kind === "informational") return INFO_PREFERRED_SPEAKERS.has(speakerValue);
  return true;
}

export function getSpeakerOptionLabel(value) {
  return V4_SPEAKER_OPTIONS.find((o) => o.value === value)?.label || value;
}
