/**
 * Editor V95 · Persona 공용 — 도입부 금지/맥락 마커
 */
export const INTRO_CONTEXT_MARKERS =
  /왜|고민|궁금|찾게|알아보|필요|생각보다|키우|고를\s*때|결국|먼저\s*보|상황|계기/;

export const FORBIDDEN_INTRO_PATTERNS = [
  /^안녕하세요/m,
  /^여러분[,，]?\s/m,
  /^이번에는\s/m,
  /^이번\s*글(에서는|은)\s/m,
  /^오늘은\s/m,
  /소개해\s*드리(?:겠|리|)습니다/m,
  /^[\w가-힣]+\s*(?:을|를)\s*소개(?:합니다|해\s*드립)/m,
];

export function detectForbiddenIntro(text = "") {
  const t = String(text || "").trim();
  if (!t) return { ok: true, hits: [] };
  const hits = FORBIDDEN_INTRO_PATTERNS.filter((re) => re.test(t)).map(
    (re) => re.source
  );
  return { ok: hits.length === 0, hits };
}
