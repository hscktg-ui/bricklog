/**
 * 편집 반영도 — 화자·시의성·주제 (UI 칩·맥락 점수 공용)
 */
import { getSpeakerOptionLabel } from "@/lib/persona/speakerTopicGuide";

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
  const archetype = meta.personaArchetype || null;
  const topic =
    String(meta.editorialTopic || input.topic || input.mainKeyword || "").trim() ||
    null;
  const season = String(meta.editorialSeason || "").trim() || null;
  const speaker = getSpeakerOptionLabel(
    input.v4Speaker || meta.v4Speaker || "auto"
  );

  return {
    speaker,
    speakerArchetype: ARCHETYPE_LABEL_KO[archetype] || archetype || null,
    topic,
    season,
    reflected: Boolean(topic || season || speaker !== "균형 에디터"),
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
  if (snap.speaker && snap.speaker !== "균형 에디터") {
    chips.push({ id: "speaker", label: `화자 · ${snap.speaker}` });
  } else if (snap.speakerArchetype) {
    chips.push({ id: "archetype", label: snap.speakerArchetype });
  }
  if (pack._meta?.industryHumanColumnEditorial) {
    chips.push({ id: "human", label: "사람 칼럼형" });
  }
  if (pack._meta?.researchFactsWoven || pack._meta?.researchGroundedHumanPack) {
    chips.push({ id: "research", label: "조사 반영" });
  }
  return chips;
}
