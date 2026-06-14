/**
 * Hard placeholder — publishReady·송출 SSOT와 training scorer 공용
 * bare 「이용」 등 soft contamination은 mission 송출 후 training에서 완화
 */
import { hasTemplatePlaceholder } from "@/lib/quality/placeholderGuard";
import { countPlaceholderContamination } from "@/lib/content/placeholderContaminationEngine";

const HARD_LITERAL_RES = [
  /\b(undefined|null)\b/i,
  /\{\{|\}\}/,
  /좋은내용/,
  /전시\s*소식/,
  /\[(?:브랜드|지역|키워드|업종)\]/,
  /(?:^|\n)내용[:：]|(?:^|\n)내용\s*입력/,
  /(?:^|\n)제목[:：]/,
];

const SOFT_CONTAMINATION_IDS = new Set([
  "bare_utilize",
  "easy_compare",
  "neutral_summary",
  "empty_related",
  "broken_bomyeon",
  "broken_e_direct",
  "broken_related_bomyeon",
  "broken_josa_e",
  "this_composition",
  "condition_composition",
]);

/** @param {string} full */
export function hasHardPlaceholderSignal(full = "") {
  const text = String(full || "");
  if (HARD_LITERAL_RES.some((re) => re.test(text))) return true;

  const counts = countPlaceholderContamination(text);
  const hitIds = Object.keys(counts.hits || {});
  if (!hitIds.length) {
    return hasTemplatePlaceholder(text);
  }

  const softOnly = hitIds.every((id) => SOFT_CONTAMINATION_IDS.has(id));
  if (softOnly) return false;

  if (counts.hits?.good_content_typo || counts.hits?.exhibition_news) return true;
  if (counts.hits?.literal_undefined || counts.hits?.template_brackets) return true;
  if (counts.total >= 3 && !softOnly) return true;

  return hasTemplatePlaceholder(text) && !softOnly;
}
