import { cleanOutputText } from "./sanitizeInput";

/** UI·폼 라벨이 본문에 섞였을 때 전체 복사에서 제거 */
const COPY_LABEL_LINE_RE =
  /^(?:말투|금지어|기본\s*말투|기본\s*이모지|메모|KPI|목표|주제|지역|브랜드명|메인\s*키워드|보조\s*키워드|업종|브랜드\s*유형|포함\s*문구|제외\s*문구)\s*[:：]/i;

function stripFormLabelLines(text) {
  if (!text) return "";
  return text
    .split("\n")
    .filter((line) => !COPY_LABEL_LINE_RE.test(line.trim()))
    .join("\n");
}

function formatHashtags(tags) {
  return (tags || [])
    .map((t) => {
      const s = String(t).trim().replace(/^#/, "");
      return s ? `#${s}` : "";
    })
    .filter(Boolean)
    .join(" ");
}

/** 네이버 블로그 붙여넣기용 — 제목·소제목·문단 사이 빈 줄 */
export function formatBlogFullCopy(blog, opts = {}) {
  if (!blog) return "";
  const title = cleanOutputText(
    blog.representativeTitle || blog.title || ""
  );
  const sections = blog.sections || [];
  const includeSubheadings =
    opts.includeSubheadings ??
    (blog._meta?.includeSubheadings !== false);
  const parts = [];

  if (title) parts.push(title, "");

  if (!includeSubheadings) {
    for (const sec of sections) {
      const body = cleanOutputText(sec.body || "");
      if (body) parts.push(body, "");
    }
  } else {
    for (const sec of sections) {
      const heading = cleanOutputText(sec.heading || "");
      const body = cleanOutputText(sec.body || "");
      if (!heading && !body) continue;
      if (heading) parts.push(heading, "");
      if (body) parts.push(body, "");
    }
  }

  const conclusion = cleanOutputText(blog.conclusion || "");
  if (conclusion) parts.push(conclusion, "");

  const tags = formatHashtags(blog.hashtags);
  if (tags) parts.push(tags);

  return stripFormLabelLines(
    parts.join("\n").replace(/\n{3,}/g, "\n\n").trim()
  );
}

/** 스마트플레이스 공지 */
export function formatPlaceFullCopy(place) {
  if (!place) return "";
  const short = place.shortNotice || place.shortBody || "";
  const detail = place.detailBody || "";
  const parts = [place.title, "", short];
  if (detail && detail !== short) parts.push("", detail);
  parts.push("", place.cta, "", formatHashtags(place.hashtags));
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** 인스타 업로드용 — 줄바꿈 유지 */
export function formatInstaFullCopy(insta) {
  if (!insta) return "";
  const body = insta.lineBreakBody || insta.body || "";
  const parts = [
    insta.hook,
    "",
    body,
    insta.ending && !body.includes(insta.ending) ? `\n\n${insta.ending}` : "",
    "",
    formatHashtags(insta.hashtags),
  ];
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** 이미지 프롬프트 전체 */
export function formatImageFullCopy(pack) {
  if (!pack) return "";
  const items = [
    ["블로그 썸네일", pack.thumbnailPrompt],
    ["플레이스 이미지", pack.placeImagePrompt],
    ["인스타 카드", pack.instagramCardPrompt],
    ["배너", pack.bannerPrompt],
  ];
  return items
    .filter(([, v]) => v)
    .map(([label, v]) => `[${label}]\n${v}`)
    .join("\n\n");
}
