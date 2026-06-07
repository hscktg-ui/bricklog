/**
 * V4 화자 선택 → contentPersona + Editor/Humanity/Quality 엔진 프로필
 */
import { buildPersonaEnginePromptBlock } from "@/lib/persona/personaEngineProfile";
import { getSpeakerPersonaFields } from "@/lib/persona/syncSpeakerPersona";

export const V4_SPEAKER_OPTIONS = [
  {
    value: "auto",
    label: "추천",
    engineHint: "주제·브랜드에 맞는 화자를 골라 드려요. 어색하면 다른 화자를 고르세요.",
  },
  {
    value: "plain_review",
    label: "담백한 후기형",
    persona: "visit_review",
    subtype: "review",
    engineHint: "현장 후기 · 담백 · Editor V95 맥락 도입",
  },
  {
    value: "local_blogger",
    label: "동네 블로거형",
    persona: "local_guide",
    subtype: "local",
    engineHint: "동네 블로거 · 지역 생활권 · 브랜드 자연 연결",
  },
  {
    value: "brand_intro",
    label: "브랜드 소개형",
    persona: "brand_story",
    subtype: "philosophy",
    engineHint: "브랜드 에디터 · 방문자 톤 금지",
  },
  {
    value: "expert_info",
    label: "전문 정보형",
    persona: "info_intro",
    subtype: "guide",
    engineHint: "가이드 칼럼 · 비교·기준 · FAQ 나열 금지",
  },
  {
    value: "essay",
    label: "감성 에세이형",
    persona: "brand_story",
    subtype: "product",
    engineHint: "에세이 · 느낌·선택 이유 · 브랜드명 최소",
  },
  {
    value: "real_use",
    label: "실사용 후기형",
    persona: "visit_review",
    subtype: "experience",
    engineHint: "실사용·체험 · 생각·관찰 · 광고 톤 금지",
  },
  {
    value: "magazine",
    label: "매거진형",
    persona: "info_intro",
    subtype: "explain",
    engineHint: "브랜드 매거진 칼럼 · 맥락 우선",
  },
  {
    value: "interview",
    label: "인터뷰형",
    persona: "brand_story",
    subtype: "event",
    engineHint: "대화·인터뷰 리듬 · 브로슈어 금지",
  },
  {
    value: "column",
    label: "칼럼형",
    persona: "info_intro",
    subtype: "compare",
    engineHint: "판단·비교 칼럼 · 분석형 혼합",
  },
];

export function applyV4SpeakerToInput(input = {}) {
  const linked = getSpeakerPersonaFields(input.v4Speaker || "auto");
  if (!linked) return input;
  return {
    ...input,
    contentPersona: linked.contentPersona,
    contentPersonaSubtype:
      linked.contentPersonaSubtype || input.contentPersonaSubtype,
  };
}

export function getV4SpeakerPromptLine(input = {}) {
  const key = input.v4Speaker || "auto";
  if (key === "auto") {
    return [
      "화자: 브랜드·주제에 맞게 1인칭·문체를 일관 유지. 본문 처음부터 끝까지 동일 화자.",
      buildPersonaEnginePromptBlock(input),
    ].join("\n");
  }
  const opt = V4_SPEAKER_OPTIONS.find((o) => o.value === key);
  return [
    `화자: ${opt?.label || key}. 처음부터 끝까지 동일한 관점·말투 유지.`,
    opt?.engineHint ? `엔진: ${opt.engineHint}` : "",
    buildPersonaEnginePromptBlock(input),
  ]
    .filter(Boolean)
    .join("\n");
}
