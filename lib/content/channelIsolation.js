/**
 * 채널 간 문장 복사 방지
 */
function normalizeSentence(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 80);
}

export function extractSentenceSet(text) {
  const set = new Set();
  String(text || "")
    .split(/[.!?]\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 14)
    .forEach((s) => set.add(normalizeSentence(s)));
  return set;
}

export function overlapsChannelText(newText, forbiddenSet, threshold = 0.85) {
  if (!forbiddenSet?.size) return false;
  const candidates = String(newText || "")
    .split(/[.!?]\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 14);

  for (const c of candidates) {
    const n = normalizeSentence(c);
    if (forbiddenSet.has(n)) return true;
    for (const f of forbiddenSet) {
      if (n.length > 20 && f.length > 20 && (n.includes(f) || f.includes(n))) {
        return true;
      }
    }
  }
  return false;
}

export function blogTextFingerprint(blog) {
  if (!blog) return new Set();
  const parts = [
    blog.representativeTitle,
    ...(blog.sections || []).flatMap((s) => [s.heading, s.body]),
    blog.conclusion,
  ];
  return extractSentenceSet(parts.join("\n"));
}
