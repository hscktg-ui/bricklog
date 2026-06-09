/**
 * Golden Safe Edit — 재검수 후 원문 85% 보존·문단 단위 수정
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import {
  AI_CLICHE_PHRASES,
  FORBIDDEN_GLOBAL_PHRASES,
  SAFE_EDIT_MIN_PRESERVE_RATIO,
} from "@/lib/golden/haeshinContentDnaSeed";
import { assessHaeshinQualityScore } from "@/lib/golden/haeshinQualityScorer";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";

const DROP_SENTENCE_RES = [
  /중립적으로\s*정리/,
  /관련해서\s*를\s*보면/,
  /비교가\s*수월해요/,
  /확인해봤어요/,
  /서비스를\s*제공합니다/,
  /좋은내용/,
  /(?:^|\s)이용(?:\s|을|를|은|는)/,
];

const CLICHE_REPLACE = [
  [/특별한\s*경험/g, "편안한 시간"],
  [/소중한\s*순간/g, "일상"],
  [/감동을\s*선사/g, "도움이 되"],
  [/가치를\s*전달/g, "안내"],
  [/고객\s*만족을\s*최우선/g, "방문 전 확인"],
];

function cleanSentence(sentence = "") {
  let t = String(sentence || "").trim();
  for (const re of DROP_SENTENCE_RES) {
    if (re.test(t)) return "";
  }
  for (const [re, rep] of CLICHE_REPLACE) {
    t = t.replace(re, rep);
  }
  for (const phrase of FORBIDDEN_GLOBAL_PHRASES) {
    if (phrase.length >= 3) t = t.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), " ");
  }
  for (const phrase of AI_CLICHE_PHRASES) {
    if (t.includes(phrase)) t = t.replace(phrase, "");
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

function cleanParagraph(text = "") {
  const parts = splitKoreanSentences(text).map(cleanSentence).filter((s) => s.replace(/\s/g, "").length >= 12);
  return parts.join("\n\n").trim();
}

function preserveRatio(before = "", after = "") {
  const b = String(before || "").replace(/\s/g, "").length;
  const a = String(after || "").replace(/\s/g, "").length;
  if (!b) return 1;
  return a / b;
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function applyGoldenSafeEdit(pack, input = {}) {
  if (!pack?.sections?.length) return pack;

  const beforeFull = getBlogFullText(pack);
  const beforeScore = assessHaeshinQualityScore(pack, input).score;

  const sections = pack.sections.map((sec) => {
    const body = cleanParagraph(sec.body || "");
    return { ...sec, body: body || sec.body };
  });

  let conclusion = pack.conclusion ? cleanParagraph(pack.conclusion) : pack.conclusion;
  if (conclusion && conclusion.replace(/\s/g, "").length < 20) {
    conclusion = pack.conclusion;
  }

  const next = { ...pack, sections, conclusion };
  const afterFull = getBlogFullText(next);
  const ratio = preserveRatio(beforeFull, afterFull);
  const afterScore = assessHaeshinQualityScore(next, input).score;

  if (ratio < SAFE_EDIT_MIN_PRESERVE_RATIO || afterScore < beforeScore) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        goldenSafeEditSkipped: true,
        goldenSafeEditPreserveRatio: ratio,
        goldenSafeEditReason: ratio < SAFE_EDIT_MIN_PRESERVE_RATIO ? "preserve_low" : "score_regressed",
      },
    };
  }

  return {
    ...next,
    _meta: {
      ...(pack._meta || {}),
      goldenSafeEdit: true,
      goldenSafeEditPreserveRatio: ratio,
      goldenSafeEditScoreBefore: beforeScore,
      goldenSafeEditScoreAfter: afterScore,
    },
  };
}
