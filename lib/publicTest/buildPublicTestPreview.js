import { PUBLIC_TEST_PREVIEW_RATIO } from "@/lib/publicTest/publicTestConfig";

function trimParagraph(text = "", maxChars = 280) {
  const t = String(text || "").trim();
  if (t.length <= maxChars) return t;
  const cut = t.slice(0, maxChars);
  const last = cut.lastIndexOf(".");
  if (last > maxChars * 0.55) return `${cut.slice(0, last + 1)}`;
  return `${cut}…`;
}

/**
 * 전체 글의 30~40%만 노출용 구조로 변환 (나머지는 서버에서 제거)
 * @param {object} pack
 */
export function buildPublicTestPreview(pack = {}) {
  const sections = pack.sections || [];
  const title =
    pack.representativeTitle || pack.title || sections[0]?.heading || "편집본";
  const intro = trimParagraph(sections[0]?.body, 320);
  const core = sections.slice(1, 3).map((s) => ({
    heading: String(s.heading || "").trim(),
    body: trimParagraph(s.body, 260),
  }));
  const conclusion = trimParagraph(
    pack.conclusion || sections[sections.length - 1]?.body,
    180
  );
  const hashtags = (pack.hashtags || pack._meta?.hashtags || [])
    .slice(0, 5)
    .map((h) => String(h).replace(/^#/, "").trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : `#${h}`));

  const visibleChars =
    [title, intro, ...core.map((c) => c.body), conclusion].join("").length;
  const fullChars = [
    title,
    ...(sections || []).map((s) => `${s.heading}${s.body}`),
    pack.conclusion,
  ]
    .join("")
    .replace(/\s/g, "").length;
  const ratio = fullChars > 0 ? visibleChars / fullChars : PUBLIC_TEST_PREVIEW_RATIO;

  return {
    title,
    intro,
    sections: core,
    conclusion,
    hashtags,
    previewRatio: Math.min(0.45, Math.max(0.28, ratio)),
    blurred: true,
  };
}
