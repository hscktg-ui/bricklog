/**
 * v4Speaker ↔ contentPersona 동기화 SSOT (UI·입력 정규화 공통)
 */
import { V4_SPEAKER_OPTIONS } from "@/lib/persona/v4Speakers";
import { CONTENT_PERSONA_OPTIONS } from "@/lib/persona/contentPersona";

export function isSpeakerPersonaLocked(v4Speaker = "auto") {
  const key = String(v4Speaker || "auto").trim();
  return key !== "" && key !== "auto";
}

/**
 * @param {string} v4Speaker
 * @returns {{ contentPersona: string, contentPersonaSubtype: string } | null}
 */
export function getSpeakerPersonaFields(v4Speaker = "auto") {
  if (!isSpeakerPersonaLocked(v4Speaker)) return null;
  const opt = V4_SPEAKER_OPTIONS.find((o) => o.value === v4Speaker);
  if (!opt?.persona) return null;
  return {
    contentPersona: opt.persona,
    contentPersonaSubtype: opt.subtype || "",
  };
}

/**
 * @param {Record<string, unknown>} values
 */
export function applySpeakerPersonaToValues(values = {}) {
  const linked = getSpeakerPersonaFields(values.v4Speaker);
  if (!linked) return values;
  return {
    ...values,
    contentPersona: linked.contentPersona,
    contentPersonaSubtype: linked.contentPersonaSubtype,
  };
}

/**
 * @param {string} v4Speaker
 */
export function describeLinkedPersona(v4Speaker = "auto") {
  const linked = getSpeakerPersonaFields(v4Speaker);
  if (!linked) return null;
  const speaker = V4_SPEAKER_OPTIONS.find((o) => o.value === v4Speaker);
  const personaDef = CONTENT_PERSONA_OPTIONS.find(
    (o) => o.value === linked.contentPersona
  );
  const subtypeDef = personaDef?.subtypes?.find(
    (s) => s.value === linked.contentPersonaSubtype
  );
  return {
    speakerLabel: speaker?.label || v4Speaker,
    personaLabel: personaDef?.label || linked.contentPersona,
    subtypeLabel: subtypeDef?.label || linked.contentPersonaSubtype || "기본",
    engineHint: speaker?.engineHint,
  };
}
