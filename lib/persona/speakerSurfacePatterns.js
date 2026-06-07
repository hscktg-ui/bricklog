/** field_review 화자 전용 — 제목·도입 surface leak 패턴 (순환 import 방지) */

export const FIELD_REVIEW_SURFACE_RES = [
  /직접\s*다녀(?:온|와)/,
  /다녀(?:온|와)\s*후기/,
  /보러\s*다녀(?:온|와)/,
  /솔직\s*후기/,
  /방문\s*후기/,
  /내돈내산/,
  /쇼룸에서\s*직접\s*본\s*점/,
  /현장\s*후기/,
  /다녀(?:왔|온)\s*느낌/,
  /직접\s*보(?:니|고)/,
  /직접\s*확인(?:했|해)/,
  /메모(?:해|한)\s*뒀/,
  /직접\s*확인(?:했|해)\s*봤/,
  /쇼룸(?:에서|)\s*.{0,56}직접/,
  /에\s*가서\s*.{0,24}직접/,
  /들(?:었|으며)\s*메모/,
];

/** 네이버 스니펫·크롤 잔재 — 비-field 도입에서 제거 */
export const OPENING_CONTAMINATION_RES = [
  /…\s*[가-힣A-Za-z0-9()]{6,}/,
  /:\s*[가-힣A-Za-z0-9()\-]{8,80}…/,
  /신혼부부를\s*위한\s*프리미엄/,
  /많은\s*고객님이\s*추천/,
  /국내\s*1위/,
  /프리미엄\s*침대\s*브랜드로\s*자리/,
  /있는데요/,
  /여기\s*관련해서/,
  /RA\d{2,4}/i,
  /FAVOLA|파보라/i,
  /템바보드|헤드보드가\s*헤드/,
  /\[.{4,48}매장/,
  /신세계\s*스타필드/,
  /당일\s*매장\s*설명과\s*맞춰/,
  /산뜻한\s*침대추천/,
];

/** brand_intro 등 — 약한 체험·현장 시점 (도입에서 문장 단위 제거) */
export const NON_FIELD_SOFT_EXPERIENCE_RES = [
  /쇼룸(?:에서|)\s*.{0,40}보(?:니|고|면|아)/,
  /누워\s*보(?:니|고|면)/,
  /분\s*넘게\s*누워/,
  /메모(?:를|)\s*.{0,20}(?:다시\s*)?(?:읽|적)/,
  /하루\s*두고\s*메모/,
  /감이\s*왔/,
  /체험(?:·|\/)?\s*시연/,
  /뒤척임/,
  /지지감.*(?:달랐|느껴)/,
  /현장\s*(?:에서|)\s*(?:본|확인|이번)/,
  /에\s*가서\s*.{0,48}(?:보니|확인|메모|누워)/,
  /.{0,16}관련해서\s*.{0,40}(?:막히|고민|분위기|누워)/,
  /바로\s*결정하지\s*않고/,
];

export const OPENING_STRIP_RES = [
  ...FIELD_REVIEW_SURFACE_RES,
  ...NON_FIELD_SOFT_EXPERIENCE_RES,
];

export function detectFieldReviewSurfaceLeak(text = "") {
  const sample = String(text || "");
  const hits = FIELD_REVIEW_SURFACE_RES.filter((re) => re.test(sample));
  return { leak: hits.length > 0, count: hits.length, hits };
}

export function detectOpeningContamination(text = "") {
  const sample = String(text || "");
  const field = detectFieldReviewSurfaceLeak(sample);
  const soft = NON_FIELD_SOFT_EXPERIENCE_RES.filter((re) => re.test(sample));
  const extra = OPENING_CONTAMINATION_RES.filter((re) => re.test(sample));
  const hits = [...(field.hits || []), ...soft, ...extra];
  return { leak: hits.length > 0, count: hits.length, hits };
}

export function isOpeningSentenceContaminated(sentence = "") {
  const s = String(sentence || "").trim();
  if (!s || s.replace(/\s/g, "").length < 6) return true;
  return detectOpeningContamination(s).leak;
}
