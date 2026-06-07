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
  /메모해\s*뒀(?:어|습)/,
];

export function detectFieldReviewSurfaceLeak(text = "") {
  const sample = String(text || "");
  const hits = FIELD_REVIEW_SURFACE_RES.filter((re) => re.test(sample));
  return { leak: hits.length > 0, count: hits.length, hits };
}
