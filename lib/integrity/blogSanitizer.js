import { fixBrandJosa } from "@/lib/korean/josaFix";
import {
  BANNED_SECTION_HEADINGS,
  rewriteBannedHeading,
  stripAdPhrases,
  softenExplainPatterns,
} from "@/lib/constitution/writingConstitution";
import { countKeywordOccurrences } from "@/lib/prompts/engine/textUtils";
import { getBlogFullText } from "@/utils/qualityCheck";
import { hasMechanicalKeywordPattern } from "@/lib/keywords/naturalKeywordWeave";

/** SEO 템플릿 문장 — 본문에서 제거 */
const BANNED_LINE_PATTERNS = [
  /에서\s+늦게까지\s+[^.\n]+찾기\s+쉽지\s+않은데[,.]?/g,
  /에서\s+늦게까지\s+[^.\n]+찾을\s+때[,.]?/g,
  /\d+에서\s+늦게까지/g,
  /\d+ 살면\s+[^.\n]+필요한\s+날/g,
  /주변에서\s+[^.\n]+이야기\s+나올\s+때마다[^.\n]*사진보다\s+생화/g,
  /[^.\n]+—\s*검색보다\s+.언제\s+들를\s+수\s+있는지/g,
  /방문\s+전에\s+영업\s+시간과\s+주차만\s+확인해\s+두셔도\s+편합니다/g,
  /'추천'로\s+찾을\s+때도[^.\n]*이용\s+방식/g,
  /으로\s+검색하시는\s+분/g,
  /비교하실\s+때/g,
];

function regionStem(region) {
  return (region || "").replace(/\s*(시|구|군|동|역).*/, "").trim();
}

function normalizePara(p) {
  return String(p || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function stripRegionDigitArtifacts(text, region) {
  if (!text) return text;
  const stem = regionStem(region);
  let s = String(text);
  if (stem) {
    const reStem = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    s = s.replace(new RegExp(`${reStem}(\\d+)`, "gi"), stem);
    s = s.replace(new RegExp(`(${reStem})\\s*${reStem}`, "gi"), "$1");
  }
  s = s.replace(/([가-힣A-Za-z]{2,12})(\d+)(에서|살면|근처|일대)/g, (_, word, num, tail) => {
    if (/^\d{1,2}$/.test(num) && num.length <= 2) return `${word}${tail}`;
    return `${word}${tail}`;
  });
  s = s.replace(/는\(는\)/g, "는");
  s = s.replace(/은\(는\)/g, "은");
  s = s.replace(/을\(를\)/g, "을");
  return s;
}

export function removeBannedMechanicalLines(text) {
  let s = String(text || "");
  for (const re of BANNED_LINE_PATTERNS) {
    s = s.replace(re, "");
  }
  return s.replace(/\n{3,}/g, "\n\n").replace(/^\s*[,.]\s*/gm, "").trim();
}

export function dedupeParagraphs(text, minSimilarity = 0.72) {
  const blocks = String(text || "")
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  const kept = [];
  const fingerprints = [];

  for (const block of blocks) {
    const norm = normalizePara(block);
    if (norm.length < 20) {
      kept.push(block);
      continue;
    }
    const dup = fingerprints.some((fp) => {
      const shorter = norm.length < fp.length ? norm : fp;
      const longer = norm.length >= fp.length ? norm : fp;
      return longer.includes(shorter.slice(0, Math.min(40, shorter.length)));
    });
    if (!dup) {
      kept.push(block);
      fingerprints.push(norm);
    }
  }
  return kept.join("\n\n");
}

function dedupeSections(sections) {
  const seenHeading = new Set();
  const seenBody = new Set();
  const out = [];

  for (const sec of sections || []) {
    const h = normalizePara(sec.heading);
    const bodyNorm = normalizePara(sec.body);
    if (seenHeading.has(h)) continue;
    const bodyKey = bodyNorm.slice(0, 80);
    if (bodyKey.length > 30 && seenBody.has(bodyKey)) continue;
    seenHeading.add(h);
    if (bodyKey.length > 30) seenBody.add(bodyKey);

    let body = dedupeParagraphs(removeBannedMechanicalLines(sec.body || ""));
    if (!body || body.length < 30) continue;
    out.push({ ...sec, heading: sec.heading, body });
  }
  return out.slice(0, 7);
}

export function sanitizeBlogText(text, ctx = {}) {
  let s = String(text || "");
  s = removeBannedMechanicalLines(s);
  s = stripRegionDigitArtifacts(s, ctx.region);
  s = stripAdPhrases(s);
  s = softenExplainPatterns(s);
  for (const h of BANNED_SECTION_HEADINGS) {
    if (s.startsWith(h)) s = s.replace(h, "");
  }
  s = dedupeParagraphs(s);
  if (ctx.brandName) s = fixBrandJosa(s, ctx.brandName);
  return s.trim();
}

export function sanitizeBlogPack(pack, ctx = {}) {
  if (!pack) return pack;

  let sections = dedupeSections(pack.sections || []).map((sec) => {
    const body = sanitizeBlogText(sec.body, ctx);
    let heading = sanitizeBlogText(sec.heading, ctx);
    if (BANNED_SECTION_HEADINGS.some((b) => heading.includes(b))) {
      heading = rewriteBannedHeading(heading, body);
    }
    return { heading, body };
  });

  while (sections.length < 4) {
    break;
  }

  let conclusion = sanitizeBlogText(pack.conclusion || "", ctx);
  const title = sanitizeBlogText(
    pack.representativeTitle || pack.title || "",
    ctx
  );

  const next = {
    ...pack,
    title,
    representativeTitle: title,
    titles: (pack.titles || []).map((t) => sanitizeBlogText(t, ctx)),
    sections,
    conclusion,
  };

  return next;
}

export function detectBlogSanitizeIssues(pack, ctx = {}) {
  const full = getBlogFullText(pack);
  const issues = [];
  const stem = regionStem(ctx.region);

  if (stem && new RegExp(`${stem}\\d+`, "i").test(full)) {
    issues.push({ type: "region_digit", detail: `${stem}+숫자` });
  }
  if (hasMechanicalKeywordPattern(full)) {
    issues.push({ type: "mechanical_seo", detail: "기계적 SEO 문장" });
  }
  if (/는\(는\)|은\(는\)|undefined|null/i.test(full)) {
    issues.push({ type: "josa_placeholder", detail: "조사·placeholder" });
  }

  const blocks = full.split(/\n\n+/);
  const norms = blocks.map(normalizePara).filter((n) => n.length > 25);
  const dupPara = norms.some(
    (n, i) => norms.indexOf(n) !== i
  );
  if (dupPara) issues.push({ type: "duplicate_paragraph", detail: "동일 문단" });

  const lateLine = "늦게까지";
  const lateCount = (full.match(new RegExp(lateLine, "g")) || []).length;
  if (lateCount >= 2) {
    issues.push({ type: "repeat_template", detail: "늦게까지 문장 반복" });
  }

  return { ok: issues.length === 0, issues, full };
}

export function ensureGlobalKeywordCount(pack, mainKeyword, region, min = 4, max = 7) {
  if (!mainKeyword || mainKeyword.length < 2) return pack;
  const full = getBlogFullText(pack);
  let uses = countKeywordOccurrences(full, mainKeyword);
  if (uses >= min && uses <= max) return pack;

  const sections = [...(pack.sections || [])];
  if (uses < min && sections[0]?.body && !sections[0].body.includes(mainKeyword)) {
    const first = sections[0].body;
    const sentences = first.split(/(?<=[.!?…])\s+/);
    if (sentences[0]) {
      sentences[0] = `${sentences[0].replace(/\.$/, "")}, ${region ? `${region} ` : ""}${mainKeyword} 이야기를 적어봤어요.`;
      sections[0] = {
        ...sections[0],
        body: sentences.join(" "),
      };
      uses = countKeywordOccurrences(getBlogFullText({ ...pack, sections }), mainKeyword);
    }
  }

  if (uses > max) {
    const sanitized = sanitizeBlogPack(pack, { region, main: mainKeyword });
    return sanitized;
  }

  return { ...pack, sections };
}
