/**
 * 블로그 본문 — 접속어(이어서·마지막으로) 제거 · 고립 하이픈 줄 정리 · 주제 무관 잔여문 삭제
 */
const BLOG_BRIDGE_LINE_RE =
  /^(이어서|그\s*흐름|마지막으로|같은\s*기준으로|정리하면|그다음|솔직히|현장\s*기준으로|독자\s*입장에서)\s*/i;
const BLOG_INLINE_BRIDGE_RE =
  /(?:^|\s)(?:이어서|마지막으로)(?:\s+(?:이어서|마지막으로))+/g;
const ORPHAN_HYPHEN_LINE_RE = /^[\s·]*[-–—]\s*$/;
const LEADING_HYPHEN_FRAGMENT_RE = /^[\s·]*[-–—]\s+(?=[가-힣A-Za-z0-9])/;

/** @param {string} text */
export function stripBlogBridgeSpam(text = "") {
  let t = String(text || "").trim();
  if (!t) return t;

  for (let round = 0; round < 6; round += 1) {
    const prev = t;
    t = t
      .replace(/(?:이어서\s*){2,}/gi, "")
      .replace(/(?:마지막으로\s*){2,}/gi, "마지막으로 ")
      .replace(BLOG_INLINE_BRIDGE_RE, " ")
      .split(/\n+/)
      .map((line) =>
        line
          .replace(BLOG_BRIDGE_LINE_RE, "")
          .replace(LEADING_HYPHEN_FRAGMENT_RE, "")
          .replace(/\s{2,}/g, " ")
          .trim()
      )
      .filter((line) => line && !ORPHAN_HYPHEN_LINE_RE.test(line))
      .join("\n\n");
    t = t.replace(/\n{3,}/g, "\n\n").trim();
    if (t === prev) break;
  }
  return t;
}

/** @param {string} text */
export function polishBlogProseParagraph(text = "") {
  let line = stripBlogBridgeSpam(text);
  line = line
    .replace(/\s[-–—]\s*(?=\s|$)/g, " ")
    .replace(/(?:^|\n)\s*[-–—]\s*(?=\n|$)/g, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();
  return line;
}

/** @param {object} pack */
export function humanizeBlogProsePack(pack = {}, _input = {}) {
  if (!pack?.sections?.length) return pack;
  const sections = (pack.sections || []).map((sec) => {
    const heading = polishBlogProseParagraph(String(sec.heading || "").trim());
    const body = polishBlogProseParagraph(String(sec.body || "").trim());
    return {
      ...sec,
      heading: heading || sec.heading,
      body: body || sec.body,
    };
  });
  return {
    ...pack,
    sections: sections.filter((sec) => String(sec.body || "").trim().length > 0),
    _meta: {
      ...(pack._meta || {}),
      blogProseHumanized: true,
    },
  };
}
