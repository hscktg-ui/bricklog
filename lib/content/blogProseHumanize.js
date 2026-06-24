/**
 * 블로그 본문 — 접속어(이어서·마지막으로) 제거 · 고립 하이픈 줄 정리 · 주제 무관 잔여문 삭제
 */
import { enrichPipelineInput, resolveChannelBrandName } from "@/lib/content/channelBrandResolve";
import { formatBlogFullCopy } from "@/utils/copyFormatter";

const BLOG_BRIDGE_LINE_RE =
  /^(이어서|그\s*흐름|마지막으로|같은\s*기준으로|정리하면|그다음|솔직히|현장\s*기준으로|독자\s*입장에서)\s*/i;
const BLOG_INLINE_BRIDGE_RE =
  /(?:^|\s)(?:이어서|마지막으로)(?:\s+(?:이어서|마지막으로))+/g;
const ORPHAN_HYPHEN_LINE_RE = /^[\s·]*[-–—]\s*$/;
const BLOG_COPY_LEAK_RE =
  /새\s*브랜드|순간이했습니다|마음에\s*들해요|매장\s*안내를\s*찾게|찾게\s*됐|·\s*쇼룸|프로필\s*확인|왜\s*됐는지|기준부터\s*정리|이야기\s*나누기\s*전에/gi;
const BLOG_INLINE_EMOJI_RE = /[📍🔎✔📌]/g;
const BLOG_CHECKLIST_LINE_RE = /^(?:📍|🔎|✔)\s+/;
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

/** @param {string} text @param {object} [input] */
export function polishBlogProseParagraph(text = "", input = {}) {
  let line = stripBlogBridgeSpam(text);
  line = line
    .replace(BLOG_INLINE_EMOJI_RE, "")
    .replace(BLOG_COPY_LEAK_RE, "")
    .replace(BLOG_CHECKLIST_LINE_RE, "")
    .replace(/\s[-–—]\s*(?=\s|$)/g, " ")
    .replace(/(?:^|\n)\s*[-–—]\s*(?=\n|$)/g, "\n")
    .replace(/\s{2,}/g, " ")
    .trim();
  const brand = resolveChannelBrandName(input);
  if (brand && brand !== "매장") {
    line = line.replace(/새\s*브랜드/g, brand);
  }
  line = line
    .replace(/\s*·\s*·+/g, " ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  return line;
}

/** @param {object} pack @param {object} [input] */
export function humanizeBlogProsePack(pack = {}, input = {}) {
  if (!pack?.sections?.length) return pack;
  input = enrichPipelineInput(input);
  const sections = (pack.sections || []).map((sec) => {
    const heading = polishBlogProseParagraph(String(sec.heading || "").trim(), input);
    const body = polishBlogProseParagraph(String(sec.body || "").trim(), input);
    return {
      ...sec,
      heading: heading || sec.heading,
      body: body || sec.body,
    };
  });
  const filtered = sections.filter((sec) => String(sec.body || "").trim().length > 0);
  const next = {
    ...pack,
    representativeTitle: polishBlogProseParagraph(
      String(pack.representativeTitle || pack.title || "").trim(),
      input
    ) || pack.representativeTitle,
    title: polishBlogProseParagraph(String(pack.title || "").trim(), input) || pack.title,
    conclusion: polishBlogProseParagraph(String(pack.conclusion || "").trim(), input) || pack.conclusion,
    sections: filtered,
    fullCopyText: formatBlogFullCopy(
      { ...pack, sections: filtered },
      { includeSubheadings: pack._meta?.includeSubheadings !== false }
    ),
    _meta: {
      ...(pack._meta || {}),
      blogProseHumanized: true,
    },
  };
  return next;
}
