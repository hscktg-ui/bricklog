export function parseList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

export function countChars(text) {
  return (text || "").replace(/\s/g, "").length;
}

export function countCharsWithSpaces(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .length;
}

function koreanLastHasBatchim(text) {
  const last = String(text || "").trim().slice(-1);
  if (!/[가-힣]/.test(last)) return false;
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

/** 한국어 목적격 조사: 을/를 (예: 모션베드 특별할인 → 모션베드 특별할인을) */
export function koreanObjectParticle(phrase) {
  const text = String(phrase || "").trim();
  if (!text) return "를";
  if (!/[가-힣]/.test(text.slice(-1))) return `${text}를`;
  return koreanLastHasBatchim(text) ? `${text}을` : `${text}를`;
}

/** 한국어 주격 조사: 이/가 */
export function koreanSubjectParticle(phrase) {
  const text = String(phrase || "").trim();
  if (!text) return "가";
  if (!/[가-힣]/.test(text.slice(-1))) return `${text}가`;
  return koreanLastHasBatchim(text) ? `${text}이` : `${text}가`;
}

export function formatHashtag(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const core = s.replace(/^#+/, "").replace(/[^\w가-힣]/g, "");
  return core ? `#${core}` : "";
}

export function clampByChars(text, min, max) {
  let t = (text || "").trim();
  if (countChars(t) > max) {
    while (countChars(t) > max && t.length > 0) t = t.slice(0, -1);
    t = t.trim();
  }
  return t;
}

/** 인스타 업로드용 줄바꿈 (2~3문장마다 빈 줄) */
export function toInstaLineBreaks(paragraphs) {
  const blocks = (Array.isArray(paragraphs) ? paragraphs : [paragraphs])
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  return blocks.join("\n\n");
}

export function regionCompact(region) {
  return (region || "").replace(/\s+/g, "");
}

export function countKeywordOccurrences(text, keyword) {
  if (!keyword || keyword.length < 2) return 0;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "g");
  return (String(text || "").match(re) || []).length;
}

/** 모바일 가독: 3문장마다 빈 줄 */
export function toMobileParagraphs(text) {
  const sentences = String(text || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks = [];
  for (let i = 0; i < sentences.length; i += 3) {
    chunks.push(sentences.slice(i, i + 3).join(" "));
  }
  return chunks.join("\n\n");
}

export function countBlogBodyChars(blog) {
  // Legacy alias: customer-facing length contract now uses spaces-included counting.
  return countBlogBodyCharsWithSpaces(blog);
}

export function countBlogBodyCharsWithSpaces(blog) {
  if (!blog?.sections) return 0;
  const sections = blog.sections.reduce(
    (n, s) => n + countCharsWithSpaces(s.body),
    0
  );
  return sections + countCharsWithSpaces(blog.conclusion);
}

const MAIN_KW_TEMPLATES = [
  (r, m) => `${r}에서 ${m}을(를) 처음 알아보실 때, 사진과 리뷰만으로는 부족한 정보가 있습니다.`,
  (r, m) => `검색창에 ${m}을(를) 입력하신 분들이 가장 많이 비교하는 항목은 위치, 가격, 분위기 세 가지입니다.`,
  (r, m) => `${m} 키워드는 ${r} 상권에서 자주 쓰이지만, 매장마다 강점이 다릅니다.`,
  (r, m) => `${r} 근처에서 ${m} 관련 후기를 읽다 보면 ‘기대와 다른 점’이 반복해서 나옵니다.`,
  (r, m) => `이번 글에서는 ${m}을(를) 중심에 두고, ${r}에서 방문할 때의 기준을 정리했습니다.`,
  (r, m) => `${m}으로 찾아오시는 분들께 도움이 되도록, 과장 없이 경험에 가까운 정보를 담았습니다.`,
  (r, m) => `${r} 일대에서 ${m}을(를) 고를 때 헷갈리는 포인트를 질문 형태로도 정리해 보았습니다.`,
  (r, m) => `현장에서 ${m}을(를) 확인할 때 체크리스트로 삼으면 좋은 항목을 나눠 적었습니다.`,
];

/** 메인키워드를 섹션마다 다른 문장으로 1회씩 삽입 */
export function weaveMainKeyword(paragraph, region, main, usedIndices) {
  const available = MAIN_KW_TEMPLATES.map((_, i) => i).filter(
    (i) => !usedIndices.has(i)
  );
  const pick =
    available.length > 0
      ? available[0]
      : usedIndices.size % MAIN_KW_TEMPLATES.length;
  usedIndices.add(pick);
  const sentence = MAIN_KW_TEMPLATES[pick](region, main);
  return `${paragraph}\n\n${sentence}`;
}

export function weaveSubKeyword(paragraph, region, sub) {
  if (!sub || sub.length < 2) return paragraph;
  return `${paragraph}\n\n${region}에서 '${sub}' 조합으로 검색하시는 경우, 메뉴·가격·대기 시간을 함께 비교해 보시면 선택이 수월합니다.`;
}
