/**
 * Content Persona Engine — 작성 관점(1인칭·문체·구조)
 */

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

function textBlob(input) {
  return [
    input.topic,
    input.includePhrases,
    input.mainKeyword,
    input.brandDescription,
    input.storeFeatures,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** 자동추천 — 브랜드·주제·목적 기반 */
export function recommendContentPersona(input = {}) {
  const t = textBlob(input);
  const purpose = input.purposeType || input.purpose || "";

  if (/체험단|체험\s*후기|제공받|협찬|솔직\s*후기/.test(t)) {
    return { persona: "visit_review", subtype: "experience" };
  }
  if (/기자단|취재|리뷰\s*기사|보도|기사/.test(t)) {
    return { persona: "visit_review", subtype: "review" };
  }
  if (/인플루언서|협업|릴스|인스타\s*후기|콘텐츠\s*제작/.test(t)) {
    return { persona: "visit_review", subtype: "recommend" };
  }
  if (/블로거|블로그\s*후기|포스팅|서포터즈/.test(t)) {
    return { persona: "visit_review", subtype: "review" };
  }
  if (/후기|방문해|다녀|체험|써봤|느꼈|추천해|솔직히/.test(t)) {
    return { persona: "visit_review", subtype: /추천/.test(t) ? "recommend" : "review" };
  }
  if (
    /동네|일대|살면|근처|주민|로컬|맛집|꽃집\s*추천|카페\s*추천/.test(t) ||
    input.contentObjective === "localSeo"
  ) {
    return { persona: "local_guide", subtype: /생활|육아|공원/.test(t) ? "life" : "area" };
  }
  if (/가이드|비교|방법|설명|알아보|전에\s*확인|체크|꿀팁|정리/.test(t)) {
    return {
      persona: "info_intro",
      subtype: /비교/.test(t) ? "compare" : /설명/.test(t) ? "explain" : "guide",
    };
  }
  if (
    purpose === "newOpen" ||
    /오픈|신규|그랜드|리뉴얼|오픈했/.test(t)
  ) {
    return { persona: "brand_story", subtype: "new_open" };
  }
  if (/행사|이벤트|가정의달|어버이|시즌\s*한정|프로모/.test(t)) {
    return { persona: "brand_story", subtype: "event" };
  }
  if (/철학|이야기|브랜드\s*소개|우리는|지향/.test(t)) {
    return { persona: "brand_story", subtype: "philosophy" };
  }
  if (purpose === "visitDrive" || /방문|들러|예약/.test(t)) {
    return { persona: "brand_story", subtype: "product" };
  }
  if (purpose === "review") {
    return { persona: "visit_review", subtype: "experience" };
  }
  if (purpose === "info") {
    return { persona: "info_intro", subtype: "guide" };
  }

  return { persona: "brand_story", subtype: "product" };
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
