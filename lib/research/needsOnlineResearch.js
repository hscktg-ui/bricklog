/** Heuristics: unfamiliar terms → auto online research before blog generation */

const TECH_OR_NICHE =
  /특허|성분|(?:^|\s)API(?:\s|$)|SaaS|시술|학명|임상|병기|프로토콜|규제|인허가|원료|추출물|펩타이드|레티놀|히알루론|보톡스|필러|레이저|초음파|HIFU|줄기세포|유전자|마이크로바이옴|프로바이오틱|오메가-?\d|비타민\s*[A-Z]\d*|GMP|ISO\s*\d|임상시험|식약처|FDA|CE\s*인증/i;

const LATIN_WORD = /\b[A-Za-z]{4,}\b/;

const MIXED_SCRIPT =
  /(?:[\u3040-\u30ff\u4e00-\u9fff]|[가-힣]).*(?:[A-Za-z]{3,})|(?:[A-Za-z]{3,}).*(?:[\u3040-\u30ff\u4e00-\u9fff]|[가-힣])/;

/** Long compound token without spaces (niche product / chemical names) */
const NICHE_COMPOUND = /[가-힣A-Za-z]{12,}/;

function collectText(input) {
  return [
    input?.topic,
    input?.mainKeyword,
    input?.subKeyword,
    input?.brandName,
    input?.region,
  ]
    .map((s) => String(s || "").trim())
    .filter(Boolean);
}

export function buildAutoResearchQuery(input) {
  const parts = collectText(input);
  const seen = new Set();
  const unique = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }
  return unique.join(" ").trim();
}

export function defaultAutoResearchTypes() {
  return ["latest", "keyword"];
}

/**
 * @param {import('@/lib/constants').BlogInput | Record<string, unknown>} input
 */
export function needsOnlineResearch(input) {
  if (!input || input.researchEnabled) return false;
  const query = buildAutoResearchQuery(input);
  if (!query || query.length < 4) return false;

  if (LATIN_WORD.test(query)) return true;
  if (TECH_OR_NICHE.test(query)) return true;
  if (MIXED_SCRIPT.test(query)) return true;

  const tokens = query.split(/[\s,，·/|]+/).filter(Boolean);
  if (tokens.some((t) => NICHE_COMPOUND.test(t) && t.length >= 10)) return true;

  const digitAlpha = /\d+[A-Za-z가-힣]|[A-Za-z가-힣]+\d{2,}/;
  if (digitAlpha.test(query)) return true;

  return false;
}
