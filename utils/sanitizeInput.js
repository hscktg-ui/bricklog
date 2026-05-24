/**
 * 입력값 정리 — undefined/null/빈값이 본문에 노출되지 않도록
 */

const JUNK_VALUES = new Set([
  "",
  "undefined",
  "null",
  "브랜드",
  "지역",
  "업종",
  "핵심 키워드",
]);

export function isJunkValue(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "number" && Number.isNaN(value)) return true;
  const v = String(value).trim();
  if (!v || v === "NaN") return true;
  return JUNK_VALUES.has(v.toLowerCase()) || JUNK_VALUES.has(v);
}

/** 단일 텍스트 — junk면 null (본문에 넣지 않음) */
export function sanitizeText(value) {
  if (value === undefined || value === null) return null;
  const v = String(value).trim();
  if (!v || JUNK_VALUES.has(v.toLowerCase())) return null;
  return v;
}

export function parsePhraseList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,，、\n]/)
    .map((s) => sanitizeText(s))
    .filter(Boolean);
}

/**
 * 폼/엔진 입력 정리
 * fallback 라벨은 내부 로직용이며 본문에 그대로 쓰지 않음
 */
export function sanitizeBlogInput(input = {}) {
  const brandName = sanitizeText(input.brandName);
  const region = sanitizeText(input.region);
  const industry = sanitizeText(input.industry) || sanitizeText(input.industryKey);
  const mainKeyword = sanitizeText(input.mainKeyword);
  const subKeywords = parsePhraseList(input.subKeyword || input.subKeywords);
  const includeList = parsePhraseList(
    input.includePhrases || input.includeText || input.include
  );
  const excludeList = parsePhraseList(
    input.excludePhrases || input.excludeText || input.exclude
  );

  return {
    brandName,
    region,
    industry,
    mainKeyword,
    subKeywords,
    includeList,
    excludeList,
    storeFeatures: sanitizeText(input.storeFeatures),
    brandDescription: sanitizeText(
      input.brandDescription || input.storeFeatures
    ),
    benefit: sanitizeText(input.benefit),
    purpose: sanitizeText(input.purpose || input.purposeType),
    tone: sanitizeText(input.tone),
  };
}

/** 본문 조립 전 텍스트 클린 (줄바꿈 유지) */
export function cleanOutputText(text) {
  if (!text) return "";
  let t = String(text);
  t = t.replace(/\bundefined\b/gi, "");
  t = t.replace(/\bnull\b/gi, "");
  t = t.replace(/\bNaN\b/g, "");
  t = t.replace(/지역에서\s+업종을?\s*찾/g, "");
  t = t.replace(/\(를\)/g, "");
  t = t.replace(/을\(를\)/g, "을");
  t = t.replace(/를\(를\)/g, "를");
  t = t
    .split("\n")
    .map((line) => line.replace(/[^\S\n]{2,}/g, " ").trim())
    .join("\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

/** 문장 배열에서 빈·깨진 문장 제거 */
export function compactSentences(sentences) {
  return (Array.isArray(sentences) ? sentences : [sentences])
    .map((s) => cleanOutputText(s))
    .filter((s) => s && s.length > 8 && !isJunkValue(s));
}
