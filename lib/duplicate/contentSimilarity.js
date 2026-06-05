/** 콘텐츠 유사도 — 최근 생성본과 비교 */

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function shingles(tokens, size = 3) {
  const set = new Set();
  for (let i = 0; i <= tokens.length - size; i++) {
    set.add(tokens.slice(i, i + size).join(" "));
  }
  return set;
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export function computeTextSimilarity(textA, textB) {
  const sa = shingles(tokenize(textA));
  const sb = shingles(tokenize(textB));
  return Math.round(jaccard(sa, sb) * 100);
}

export function checkRecentSimilarity(newText, archives = []) {
  let max = 0;
  let matchedAt = null;
  for (const item of archives) {
    const score = computeTextSimilarity(newText, item.text || "");
    if (score > max) {
      max = score;
      matchedAt = item.at;
    }
  }
  return {
    percent: max,
    isHigh: max >= 70,
    warning: max >= 70 ? `최근 콘텐츠와 유사도 ${max}%` : null,
    matchedAt,
  };
}

export function extractBlogPlainText(blog) {
  if (!blog) return "";
  return [
    blog.representativeTitle || blog.title,
    ...(blog.sections || []).map((s) => `${s.heading} ${s.body}`),
    blog.conclusion,
  ].join("\n");
}

/** 섹션 제목·순서만으로 구조 시그니처 (본문 제외) */
export function extractStructureSignature(pack = {}) {
  const headings = (pack.sections || [])
    .map((s) =>
      String(s?.heading || "")
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
  return headings.join(" | ");
}

/**
 * @param {object} pack
 * @param {Array<{ signature?: string, structure?: string, at?: string }>} archives
 * @param {{ threshold?: number }} [opts]
 */
export function checkRecentStructureSimilarity(pack, archives = [], opts = {}) {
  const threshold = opts.threshold ?? 70;
  const signature = extractStructureSignature(pack);
  if (!signature) {
    return { percent: 0, isHigh: false, signature, warning: null, matchedAt: null };
  }

  let max = 0;
  let matchedAt = null;
  for (const item of archives) {
    const other =
      item.signature ||
      item.structure ||
      extractStructureSignature(item.pack || item);
    if (!other) continue;
    const score = computeTextSimilarity(signature, other);
    if (score > max) {
      max = score;
      matchedAt = item.at || item.created_at || null;
    }
  }

  return {
    percent: max,
    isHigh: max >= threshold,
    signature,
    warning: max >= threshold ? `최근 글과 구조 유사도 ${max}%` : null,
    matchedAt,
    threshold,
  };
}
