/** 샘플 본문을 문단 단위로 분리 */
export function splitParagraphs(text) {
  return String(text || "")
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

/** 플레이스 상세 — 줄 단위(· 불릿 유지) */
export function splitPlaceDetailLines(text) {
  return String(text || "")
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** 인스타 — 줄 단위 본문 + 해시태그 분리 */
export function splitInstaCaption(text) {
  const bodyLines = [];
  const tagLines = [];
  for (const line of String(text || "").split(/\n/)) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith("#")) tagLines.push(t);
    else bodyLines.push(t);
  }
  return { paragraphs: bodyLines, hashtags: tagLines.join(" ") };
}
