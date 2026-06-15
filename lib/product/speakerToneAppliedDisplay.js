/**
 * 화자·톤앤매너 — 선택 vs 실제 적용 (작업실·상태 카드 SSOT)
 */
import { getSpeakerOptionLabel } from "@/lib/persona/speakerTopicGuide";
import { resolveSpeakerDisplayLabel } from "@/lib/persona/speakerVoiceLock";
import { V4_SPEAKER_OPTIONS } from "@/lib/persona/v4Speakers";
import {
  resolveSpeechStyle,
  resolveProficiency,
  V2_EMOTION_OPTIONS,
} from "@/lib/constitution/writingConstitutionV2";
import { assessSpeakerTopicAlignment } from "@/lib/persona/speakerTopicGuide";

const EMOTION_AUTO = { value: "auto", label: "자동" };

function resolveEmotionLabel(value = "auto") {
  const key = String(value || "auto").trim();
  if (!key || key === "auto") return EMOTION_AUTO.label;
  return V2_EMOTION_OPTIONS.find((o) => o.value === key)?.label || key;
}

function trimBrief(text = "", max = 48) {
  const t = String(text || "").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

/**
 * @param {object} pack
 * @param {Record<string, unknown>} input
 */
export function buildSpeakerToneAppliedSummary(pack = {}, input = {}) {
  const meta = pack._meta || {};
  const selectedValue = String(
    input.v4Speaker || meta.v4Speaker || meta.selectedV4Speaker || "auto"
  ).trim();
  const selectedLabel =
    selectedValue === "auto"
      ? "추천"
      : getSpeakerOptionLabel(selectedValue) ||
        V4_SPEAKER_OPTIONS.find((o) => o.value === selectedValue)?.label ||
        selectedValue;

  const profileMeta = meta.personaEngineProfile || {};
  const alignment = meta.personaEngineAlignment || {};
  const speakerSurface = meta.speakerSurfaceAlignment || {};

  const appliedLabel =
    profileMeta.label ||
    alignment.profile?.label ||
    resolveSpeakerDisplayLabel(input) ||
    "균형 에디터";

  const appliedV4 =
    profileMeta.v4Speaker ||
    alignment.profile?.v4Speaker ||
    (selectedValue !== "auto" ? selectedValue : "auto");

  const appliedArchetype = meta.personaArchetype || profileMeta.archetype || null;

  const speechStyle = resolveSpeechStyle(input);
  const proficiency = resolveProficiency(input);
  const emotionLabel = resolveEmotionLabel(input.emotionTemperature);

  const brandToneBrief = trimBrief(
    input.styleContinuityBrief ||
      input.brandPhilosophyBrief ||
      input.brandMemory?.tone ||
      input.brandMemory?.brandPhilosophy
  );

  const topicAlignment = assessSpeakerTopicAlignment(input);
  const personaOk = alignment.ok !== false && meta.personaAligned !== false;
  const speakerOk = speakerSurface.ok !== false;
  const personaScore =
    typeof alignment.score === "number" ? alignment.score : null;
  const speakerScore =
    typeof speakerSurface.score === "number" ? speakerSurface.score : null;

  const userPickedSpeaker = selectedValue !== "auto";
  const appliedMatchesSelection =
    !userPickedSpeaker ||
    appliedV4 === selectedValue ||
    selectedLabel === appliedLabel ||
    getSpeakerOptionLabel(appliedV4) === selectedLabel;

  const mismatch =
    userPickedSpeaker &&
    !appliedMatchesSelection &&
    (personaOk === false || !topicAlignment.ok);

  const displayParts = [];
  if (userPickedSpeaker) {
    displayParts.push(`선택 화자 · ${selectedLabel}`);
  } else {
    displayParts.push(`적용 화자 · ${appliedLabel}`);
  }
  if (userPickedSpeaker && appliedLabel && appliedLabel !== selectedLabel) {
    displayParts.push(`적용 · ${appliedLabel}`);
  }
  displayParts.push(`문체 · ${speechStyle.label}`);
  if (input.emotionTemperature && input.emotionTemperature !== "auto") {
    displayParts.push(`감정 · ${emotionLabel}`);
  }
  if (brandToneBrief) {
    displayParts.push(`브랜드 톤 · ${brandToneBrief}`);
  }

  let statusHint = "";
  if (mismatch) {
    statusHint = "선택하신 화자와 본문 톤이 어긋날 수 있어요. 화자를 바꾸거나 다시 받아 보세요.";
  } else if (!personaOk) {
    statusHint = "화자 톤을 본문에 더 맞추는 중이에요.";
  } else if (userPickedSpeaker && personaOk) {
    statusHint = `「${selectedLabel}」 톤으로 맞춰 반영했어요.`;
  } else if (personaOk) {
    statusHint = `「${appliedLabel}」 톤으로 맞춰 반영했어요.`;
  }

  return {
    selected: {
      value: selectedValue,
      label: selectedLabel,
      userPicked: userPickedSpeaker,
    },
    applied: {
      profileId: profileMeta.id || alignment.profile?.id || null,
      label: appliedLabel,
      v4Speaker: appliedV4,
      archetype: appliedArchetype,
      reflected: Boolean(meta.personaEngineProfile || alignment.profile),
    },
    speechStyle: {
      value: input.speechStyle || speechStyle.value,
      label: speechStyle.label,
    },
    proficiency: {
      value: input.proficiency || proficiency.value,
      label: proficiency.label,
    },
    emotion: {
      value: input.emotionTemperature || "auto",
      label: emotionLabel,
    },
    brandToneBrief: brandToneBrief || null,
    alignment: {
      personaOk,
      speakerOk,
      topicOk: topicAlignment.ok !== false,
      personaScore,
      speakerScore,
      mismatch,
      appliedMatchesSelection,
      topicKind: topicAlignment.kind || null,
    },
    displayLine: displayParts.join(" · "),
    statusHint,
  };
}

/**
 * @param {object} pack
 * @param {Record<string, unknown>} input
 * @returns {{ id: string, label: string, warn?: boolean }[]}
 */
export function buildSpeakerToneAppliedChips(pack = {}, input = {}) {
  const summary = buildSpeakerToneAppliedSummary(pack, input);
  const chips = [];

  if (summary.selected.userPicked) {
    chips.push({
      id: "speaker-selected",
      label: `선택 · ${summary.selected.label}`,
    });
  }

  chips.push({
    id: "speaker-applied",
    label: summary.selected.userPicked
      ? `적용 · ${summary.applied.label}`
      : `화자 · ${summary.applied.label}`,
    warn: summary.alignment.mismatch,
  });

  chips.push({
    id: "speech-style",
    label: `문체 · ${summary.speechStyle.label}`,
  });

  if (summary.emotion.value && summary.emotion.value !== "auto") {
    chips.push({
      id: "emotion",
      label: `감정 · ${summary.emotion.label}`,
    });
  }

  if (summary.brandToneBrief) {
    chips.push({
      id: "brand-tone",
      label: `브랜드 톤 · ${summary.brandToneBrief}`,
    });
  }

  if (summary.alignment.personaOk === false) {
    chips.push({ id: "persona-adjust", label: "화자 톤 맞춤 중", warn: true });
  } else if (summary.selected.userPicked && summary.alignment.personaOk) {
    chips.push({ id: "persona-ok", label: "화자 반영됨" });
  }

  return chips;
}

export function stampSpeakerToneAppliedMeta(pack, input = {}) {
  if (!pack || typeof pack !== "object") return pack;
  const summary = buildSpeakerToneAppliedSummary(pack, input);
  return {
    ...pack,
    _meta: {
      ...(pack._meta || {}),
      selectedV4Speaker: summary.selected.value,
      appliedSpeakerLabel: summary.applied.label,
      appliedV4Speaker: summary.applied.v4Speaker,
      speakerToneApplied: {
        version: "v1",
        ...summary,
        stampedAt: new Date().toISOString(),
      },
    },
  };
}
