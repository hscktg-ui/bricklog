/**
 * 편집 반영도 — 화자·시의성·주제 (UI 칩·맥락 점수 공용)
 */
import { buildSpeakerToneAppliedSummary } from "@/lib/product/speakerToneAppliedDisplay";

const ARCHETYPE_LABEL_KO = {
  brand_editor: "브랜드 소개 톤",
  field_review: "직접 방문 후기",
  expert_column: "전문 칼럼",
  local_note: "동네 이야기",
  magazine: "매거진 톤",
  essay: "에세이",
};

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function buildEditorialReflectionSnapshot(pack = {}, input = {}) {
  const meta = pack._meta || {};
  const tone = buildSpeakerToneAppliedSummary(pack, input);
  const archetype = meta.personaArchetype || tone.applied.archetype || null;
  const topic =
    String(meta.editorialTopic || input.topic || input.mainKeyword || "").trim() ||
    null;
  const season = String(meta.editorialSeason || "").trim() || null;

  return {
    speaker: tone.selected.userPicked
      ? tone.selected.label
      : tone.applied.label,
    selectedSpeaker: tone.selected.label,
    appliedSpeaker: tone.applied.label,
    speakerArchetype: ARCHETYPE_LABEL_KO[archetype] || archetype || null,
    speechStyle: tone.speechStyle.label,
    emotion: tone.emotion.label,
    brandToneBrief: tone.brandToneBrief || null,
    personaAligned: tone.alignment.personaOk,
    speakerMismatch: tone.alignment.mismatch,
    topic,
    season,
    reflected: Boolean(
      topic || season || tone.selected.userPicked || tone.applied.reflected
    ),
  };
}

/**
 * @param {object} pack
 * @param {object} [input]
 * @returns {{ id: string, label: string }[]}
 */
export function buildEditorialReflectionChips(pack = {}, input = {}) {
  const snap = buildEditorialReflectionSnapshot(pack, input);
  const chips = [];
  if (snap.topic) chips.push({ id: "topic", label: `주제 · ${snap.topic}` });
  if (snap.season) chips.push({ id: "season", label: `시의 · ${snap.season}` });

  if (snap.selectedSpeaker && snap.selectedSpeaker !== "추천") {
    chips.push({
      id: "speaker-selected",
      label: `선택 · ${snap.selectedSpeaker}`,
    });
  }
  chips.push({
    id: "speaker-applied",
    label:
      snap.selectedSpeaker && snap.selectedSpeaker !== "추천"
        ? `적용 · ${snap.appliedSpeaker || snap.speaker}`
        : `화자 · ${snap.appliedSpeaker || snap.speaker}`,
    warn: snap.speakerMismatch === true,
  });

  if (snap.speechStyle) {
    chips.push({ id: "speech-style", label: `문체 · ${snap.speechStyle}` });
  }
  if (snap.emotion && snap.emotion !== "자동") {
    chips.push({ id: "emotion", label: `감정 · ${snap.emotion}` });
  }
  if (snap.brandToneBrief) {
    chips.push({ id: "brand-tone", label: `브랜드 톤 · ${snap.brandToneBrief}` });
  }

  if (snap.personaAligned === false) {
    chips.push({ id: "persona-adjust", label: "화자 톤 맞춤 중", warn: true });
  } else if (snap.selectedSpeaker && snap.selectedSpeaker !== "추천") {
    chips.push({ id: "persona-ok", label: "화자 반영됨" });
  }

  if (pack._meta?.industryHumanColumnEditorial) {
    chips.push({ id: "human", label: "사람 칼럼형" });
  }
  if (pack._meta?.researchFactsWoven || pack._meta?.researchGroundedHumanPack) {
    chips.push({ id: "research", label: "조사 반영" });
  }
  return chips;
}
