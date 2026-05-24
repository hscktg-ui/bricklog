import { fixBrandJosa } from "@/lib/korean/josaFix";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";
import { getBlogFullText } from "@/utils/qualityCheck";
import { sanitizeBlogPack, detectBlogSanitizeIssues } from "@/lib/integrity/blogSanitizer";

const PLACEHOLDER_PATTERNS = [
  /\bundefined\b/i,
  /\bnull\b/i,
  /\bNaN\b/,
  /\[지역\d?\]/,
  /\[업종\]/,
  /\[브랜드\]/,
  /\{\{?\s*brand\s*\}?\}/i,
  /\{\{?\s*region\s*\}?\}/i,
  /\{\{?\s*keyword\s*\}?\}/i,
  /\{brand\}/i,
  /\{region\}/i,
  /\{keyword\}/i,
  /지역에서\s+업종/,
];

const NUMBER_SUFFIX = /([가-힣A-Za-z]{2,14})(\d{1,2})(?=[에서살면\s,.]|$)/g;

const GENERIC_CLICHES = [
  /꽃집은\s+꽃을\s+판다/,
  /카페는\s+커피를\s+판다/,
  /병원은\s+진료한다/,
];

export function detectPlaceholders(text) {
  const hits = [];
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(text)) hits.push(re.source);
  }
  return hits;
}

export function detectInvalidNumberSuffix(text, region, brandName) {
  const hits = [];
  let m;
  const re = new RegExp(NUMBER_SUFFIX.source, "gi");
  while ((m = re.exec(text))) {
    const word = m[1];
    if (/^(19|20)\d{0,2}$/.test(m[2])) continue;
    hits.push(m[0]);
  }
  const stem = (region || "").replace(/\s*(시|구|군|동).*/, "").trim();
  if (stem && new RegExp(`${stem}\\d+`, "i").test(text)) {
    hits.push(`${stem}+digit`);
  }
  return hits;
}

export function findForeignBrand(text, allowedBrand) {
  if (!allowedBrand || allowedBrand.length < 2) return [];
  const known = ["달빛꽃상자", "모카하우스", "꿈잠매트리스"];
  return known.filter(
    (b) => b !== allowedBrand && text.includes(b) && !allowedBrand.includes(b)
  );
}

export function findForeignRegions(text, allowedRegion) {
  if (!allowedRegion) return [];
  const regions = [
    "잠실",
    "강남",
    "홍대",
    "일산",
    "마곡",
    "판교",
    "분당",
    "수원",
    "부산",
  ];
  const stem = allowedRegion.replace(/\s*(시|구|군|동).*/, "").trim();
  return regions.filter(
    (r) => r !== stem && !allowedRegion.includes(r) && text.includes(r)
  );
}

export function validateBlogPackIntegrity(pack, ctx = {}) {
  const fullText = getBlogFullText(pack);
  const issues = [];

  const ph = detectPlaceholders(fullText);
  if (ph.length) issues.push({ type: "placeholder", detail: ph.join(", ") });

  const num = detectInvalidNumberSuffix(
    fullText,
    ctx.region,
    ctx.brandName
  );
  if (num.length) issues.push({ type: "number_suffix", detail: num.join(", ") });

  if (hasDuplicateSentences(fullText, 14)) {
    issues.push({ type: "duplicate_sentence", detail: "유사 문장 반복" });
  }

  for (const cl of GENERIC_CLICHES) {
    if (cl.test(fullText)) issues.push({ type: "generic_cliche", detail: cl.source });
  }

  const foreignBrands = findForeignBrand(fullText, ctx.brandName);
  if (foreignBrands.length) {
    issues.push({ type: "foreign_brand", detail: foreignBrands.join(", ") });
  }

  const foreignRegions = findForeignRegions(fullText, ctx.region);
  if (foreignRegions.length) {
    issues.push({ type: "foreign_region", detail: foreignRegions.join(", ") });
  }

  const sanitize = detectBlogSanitizeIssues(pack, ctx);
  if (!sanitize.ok) issues.push(...sanitize.issues);

  return { ok: issues.length === 0, issues, fullText };
}

export function applyBlogPackIntegrity(pack, ctx = {}) {
  return sanitizeBlogPack(pack, ctx);
}

export { detectBlogSanitizeIssues };
