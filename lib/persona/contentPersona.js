/**
 * Content Persona Engine — 작성 관점(1인칭·문체·구조)
 */
import { resolveWritingContract } from "@/lib/content/writingContract";

export const CONTENT_PERSONA_OPTIONS = [
  {
    value: "auto",
    label: "자동추천",
    desc: "브랜드와 주제에 맞게 선택",
  },
  {
    value: "brand_story",
    label: "브랜드 이야기",
    desc: "브랜드가 직접 말하는 관점",
    subtypes: [
      { value: "product", label: "상품 소개" },
      { value: "philosophy", label: "브랜드 철학" },
      { value: "event", label: "행사 안내" },
      { value: "new_open", label: "신규 오픈" },
    ],
  },
  {
    value: "visit_review",
    label: "방문 후기",
    desc: "실제 방문자가 쓰는 관점",
    subtypes: [
      { value: "experience", label: "체험" },
      { value: "review", label: "후기" },
      { value: "recommend", label: "추천" },
    ],
  },
  {
    value: "info_intro",
    label: "정보 소개",
    desc: "정보형 블로그 관점",
    subtypes: [
      { value: "guide", label: "가이드" },
      { value: "compare", label: "비교" },
      { value: "explain", label: "설명" },
    ],
  },
  {
    value: "local_guide",
    label: "지역 추천",
    desc: "지역 주민이 추천하는 관점",
    subtypes: [
      { value: "area", label: "지역 정보" },
      { value: "life", label: "생활 정보" },
      { value: "local", label: "로컬 콘텐츠" },
    ],
  },
];

function hashPick(seed, arr) {
  if (!arr?.length) return arr?.[0];
  return arr[Math.abs(seed) % arr.length];
}

/** 자동추천 — writingContract SSOT */
export function recommendContentPersona(input = {}) {
  const contract = resolveWritingContract(input);
  return {
    persona: contract.persona,
    subtype: contract.personaSubtype,
    contractType: contract.type,
  };
}

export function resolveContentPersona(input = {}) {
  const requested = input.contentPersona || "auto";
  const seed = `${input.region}|${input.topic}|${input.brandName}`;

  if (requested !== "auto") {
    const def = CONTENT_PERSONA_OPTIONS.find((o) => o.value === requested);
    const subtypes = def?.subtypes || [];
    const subtype =
      input.contentPersonaSubtype &&
      subtypes.some((s) => s.value === input.contentPersonaSubtype)
        ? input.contentPersonaSubtype
        : hashPick(seed.length, subtypes)?.value || subtypes[0]?.value;
    return {
      persona: requested,
      subtype,
      label: def?.label || requested,
      source: "user",
    };
  }

  const rec = recommendContentPersona(input);
  const def = CONTENT_PERSONA_OPTIONS.find((o) => o.value === rec.persona);
  return {
    persona: rec.persona,
    subtype: rec.subtype,
    label: def?.label || rec.persona,
    source: "auto",
  };
}

export function getPersonaOption(value) {
  return CONTENT_PERSONA_OPTIONS.find((o) => o.value === value);
}
