import { cleanOutputText, parsePhraseList, sanitizeText } from "./sanitizeInput";

const HOSPITAL_DEFAULT_FORBIDDEN = [
  "치료 보장",
  "효과 보장",
  "부작용 없음",
  "최고",
  "1위",
  "1등",
  "완치",
  "확실한 효과",
  "무조건",
];

const GLOBAL_FORBIDDEN_OPENERS = [
  /^오늘은\s+.+\s*소개/,
  /^안녕하세요\s*오늘은/,
  /검색창에\s+입력하신/,
  /체크리스트로\s+삼으면/,
  /해당\s+브랜드는/,
  /브랜드가\s+지향하는\s+가치/,
];

const REPLACEMENTS = {
  최고: "괜찮은",
  "1등": "",
  "1위": "",
  무조건: "",
  저렴한: "부담 없는",
  확실한: "",
  완벽한: "",
  보장: "",
  완치: "회복",
};

export function buildForbiddenList(ctx) {
  const user = parsePhraseList(ctx.excludePhrases || ctx.excludeList);
  const industryKey = ctx.industryKey || ctx.legacyIndustryKey || "";
  const hospital =
    industryKey === "hospital" || /병원|의원/.test(ctx.industryLabel || "")
      ? HOSPITAL_DEFAULT_FORBIDDEN
      : [];

  return [...new Set([...user, ...hospital, "undefined", "null"])]
    .map((w) => sanitizeText(w))
    .filter(Boolean);
}

function replaceForbiddenInSentence(sentence, forbidden) {
  let s = sentence;
  for (const word of forbidden) {
    if (!word || word.length < 2) continue;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rep = REPLACEMENTS[word] ?? "";
    s = s.replace(new RegExp(escaped, "gi"), rep);
  }
  for (const [bad, good] of Object.entries(REPLACEMENTS)) {
    if (forbidden.includes(bad)) {
      s = s.replace(new RegExp(bad, "gi"), good);
    }
  }
  return cleanOutputText(s);
}

function filterParagraph(text, forbidden) {
  const sentences = String(text || "")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const kept = sentences
    .map((s) => replaceForbiddenInSentence(s, forbidden))
    .filter((s) => {
      if (!s || s.length < 6) return false;
      const lower = s.toLowerCase();
      if (lower.includes("undefined") || lower.includes("null")) return false;
      return !forbidden.some(
        (w) => w.length >= 2 && new RegExp(escaped(w), "i").test(s)
      );
    });

  return kept.join("\n\n");
}

function escaped(w) {
  return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function filterBlogPack(blog, forbidden) {
  if (!blog) return blog;

  const filter = (t) => filterParagraph(t, forbidden);

  const sections = (blog.sections || []).map((sec) => ({
    heading: filter(sec.heading) || sec.heading,
    body: filter(sec.body),
  })).filter((s) => s.body && s.body.length > 20);

  const conclusion = filter(blog.conclusion);
  const titles = (blog.titles || [])
    .map((t) => replaceForbiddenInSentence(t, forbidden))
    .filter(Boolean);
  const representativeTitle =
    replaceForbiddenInSentence(
      blog.representativeTitle || blog.title,
      forbidden
    ) || titles[0];

  const hashtags = (blog.hashtags || [])
    .map((t) => replaceForbiddenInSentence(String(t).replace(/^#/, ""), forbidden))
    .filter((t) => t && t.length > 1);

  return {
    ...blog,
    titles: titles.length >= 5 ? titles.slice(0, 5) : titles,
    representativeTitle,
    title: representativeTitle,
    sections,
    conclusion,
    hashtags,
  };
}

export function containsForbidden(text, forbidden) {
  const lower = String(text || "").toLowerCase();
  if (lower.includes("undefined") || lower.includes("null")) return true;
  return forbidden.some(
    (w) => w.length >= 2 && new RegExp(escaped(w), "i").test(text)
  );
}

export function stripBannedOpeners(text) {
  let t = String(text || "");
  for (const re of GLOBAL_FORBIDDEN_OPENERS) {
    t = t.replace(re, "");
  }
  return cleanOutputText(t);
}
