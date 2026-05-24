import { countKeywordOccurrences } from "@/lib/prompts/engine/textUtils";
import { getBlogFullText } from "@/utils/qualityCheck";

const MECHANICAL_PATTERNS = [
  /에서\s+늦게까지\s+[^.\n]+찾/,
  /에서\s+[^.\n]+을\s+찾/,
  /으로\s+검색하시는\s+분/,
  /키워드로\s+찾/,
  /주변에서\s+[^.\n]+이야기\s+나올\s+때마다/,
  /검색보다\s+.언제\s+들를/,
  /\d+에서\s+늦게까지/,
  /\d+\s*살면\s+[^.\n]+필요한\s+날/,
];

const BANNED_INSERTS = [
  "참고가 되길 바랍니다",
  "궁금했던 점을 위주로",
  "이야기를 들으면 분위기부터",
  "방문 전에 영업 시간과 주차만 확인해 두셔도 편합니다",
  "주변에서",
  "검색보다",
  "늦게까지",
];

export function hasMechanicalKeywordPattern(text) {
  return MECHANICAL_PATTERNS.some((re) => re.test(text || ""));
}

/** @deprecated 섹션별 삽입 금지 — 본문만 반환 */
export function buildNaturalKeywordLine() {
  return null;
}

/**
 * 섹션 단위 키워드 삽입 금지. 본문은 그대로 두고 기계 문장만 제거.
 */
export function weaveKeywordNaturally(text) {
  return scrubMechanicalSeoPhrases(String(text || ""));
}

export function weaveBlogPackKeywords(pack, mainKeyword, region, min = 4, max = 7) {
  if (!pack || !mainKeyword?.trim()) return pack;
  const full = getBlogFullText(pack);
  const uses = countKeywordOccurrences(full, mainKeyword);
  if (uses >= min && uses <= max) return pack;

  const sections = [...(pack.sections || [])];
  if (uses < min && sections.length > 0) {
    const kw = mainKeyword.trim();
    const r = (region || "").trim();
    const idx = Math.min(1, sections.length - 1);
    const body = sections[idx].body || "";
    if (!body.includes(kw)) {
      const hint = r
        ? `${r} 근처에서 ${kw}을(를) 알아보신다면, 사진과 분위기를 함께 보시면 좋아요.`
        : `${kw}을(를) 알아보신다면, 분위기와 생화 상태를 함께 보시면 좋아요.`;
      if (!hasMechanicalKeywordPattern(hint)) {
        sections[idx] = {
          ...sections[idx],
          body: body ? `${body}\n\n${hint}` : hint,
        };
      }
    }
  }

  return { ...pack, sections };
}

export function scrubMechanicalSeoPhrases(text) {
  let t = String(text || "");
  for (const bad of BANNED_INSERTS) {
    if (t.includes(bad)) {
      const lines = t.split(/\n\n+/);
      t = lines
        .filter((line) => !bad.split(" ").some((w) => line.includes(w) && w.length > 3))
        .join("\n\n");
    }
  }
  const replacements = [
    [/에서\s+[^.\n]{2,30}을\s+찾을\s+때는[^.\n]*\./g, ""],
    [/으로\s+검색하시는\s+분들은[^.\n]*\./g, ""],
    [/참고\s*\d+/g, ""],
    [/—\s*참고\s*\d+/g, ""],
    [/비교하실\s+때[^.\n]*\./g, ""],
    [/에서\s+늦게까지[^.\n]*\./g, ""],
  ];
  for (const [re, rep] of replacements) {
    t = t.replace(re, rep);
  }
  return t.replace(/\n{3,}/g, "\n\n").trim();
}
