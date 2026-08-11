/**
 * 문단 단위 Safe Edit — 전체 재생성 금지, 원문 보존 85%+
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { SAFE_EDIT_MIN_PRESERVE_RATIO } from "@/lib/golden/haeshinContentDnaSeed";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { applyGoldenSafeEdit } from "@/lib/golden/goldenSafeEditEngine";
import { scrubPlaceholderFromPack } from "@/lib/content/placeholderTraceEngine";
import { injectBrandFactsIntoPack } from "@/lib/content/brandFactInjectionEngine";

const PROBLEM_SENTENCE_RES = [
  /(?<![가-힣])이용(?=\s*(?:을|를|은|는|이|가|과|와|·|—|관련|볼|기준|선택|안내|$))/,
  /좋은내용/,
  /전시\s*소식/,
  /이\s*구성/,
  /관련해서/,
  /조건\s*및\s*구성/,
  /중립적으로\s*정리/,
  /비교가\s*수월해요/,
  /알레르기\s*성분/,
  /원재료\s*표시/,
  /전시\s*관련\s*조건/,
  /안내을/,
  /분위기을/,
  /[가-힣]{2,}(?:내|히|기|이)을(?:\s|[,.!?])/,
  /SLA[A-Za-z0-9]{4,}/,
];

const DRY_FACT_TAIL_RES = [
  /특징입니다\.?\s*$/,
  /조절할\s*수\s*있습니다\.?\s*$/,
  /사용됩니다\.?\s*$/,
  /선택됩니다\.?\s*$/,
];

function preserveRatio(before = "", after = "") {
  const b = String(before || "").replace(/\s/g, "").length;
  const a = String(after || "").replace(/\s/g, "").length;
  if (!b) return 1;
  return a / b;
}

function sentenceNeedsFix(sentence = "") {
  const t = String(sentence || "").trim();
  if (!t) return false;
  if (PROBLEM_SENTENCE_RES.some((re) => re.test(t))) return true;
  if (DRY_FACT_TAIL_RES.some((re) => re.test(t))) return true;
  return false;
}

function fixSentence(sentence = "", input = {}) {
  let t = String(sentence || "").trim();
  t = t
    .replace(/안내을/g, "안내를")
    .replace(/분위기을/g, "분위기를")
    .replace(/([가-힣]{2,}(?:내|히|기|이))을(?=\s|[,.!?])/g, "$1를");
  for (const re of PROBLEM_SENTENCE_RES) {
    if (/안내을|분위기을|을(?:\s|[,.!?])|SLA/.test(re.source)) continue;
    t = t.replace(new RegExp(re.source, re.flags.replace("g", "")), "");
  }
  if (DRY_FACT_TAIL_RES.some((re) => re.test(t))) {
    const brand = String(input.brandName || "매장").trim();
    const region = String(input.region || "").trim();
    const obs = region
      ? `${region}에서 ${brand}를 직접 보면 설명과 체감이 이어집니다.`
      : `${brand}에서 직접 확인해 보면 설명과 체감이 이어집니다.`;
    t = t
      .replace(/특징입니다\.?\s*$/, "특징인데,")
      .replace(/조절할\s*수\s*있습니다\.?\s*$/, "조절할 수 있는데,")
      .replace(/사용됩니다\.?\s*$/, "쓰이는데,")
      .replace(/선택됩니다\.?\s*$/, "고르게 되는데,");
    if (!/직접|느껴|보면|확인/.test(t)) t = `${t} ${obs}`.trim();
  }
  t = t
    .replace(/(?<![가-힣])를\s*보면/g, "을 보면")
    .replace(/\s{2,}/g, " ")
    .trim();
  // 목적격 복구 후 다시 깨지지 않게 최종 교정
  t = t
    .replace(/안내을/g, "안내를")
    .replace(/분위기을/g, "분위기를");
  if (t.replace(/\s/g, "").length < 8) {
    const brand = String(input.brandName || "매장").trim();
    const region = String(input.region || "").trim();
    return region ? `${region} ${brand} 안내를 참고해 주세요.` : `${brand} 공식 안내를 확인해 주세요.`;
  }
  return t;
}

function editParagraphBody(body = "", input = {}) {
  const sentences = splitKoreanSentences(body);
  let changed = false;
  const next = sentences.map((s) => {
    if (!sentenceNeedsFix(s)) return s;
    changed = true;
    return fixSentence(s, input);
  });
  return { body: next.join(" ").trim(), changed };
}

/**
 * 문제 문단만 수정 — 원문 85% 이상 보존
 * @param {object} pack
 * @param {object} input
 * @param {object} [evaluation]
 */
export function applyParagraphSafeEdit(pack, input = {}, evaluation = null) {
  if (!pack?.sections?.length) return pack;

  const beforeFull = getBlogFullText(pack);
  const failing =
    evaluation?.hardReasons ||
    evaluation?.checks?.emergencyPlaceholder?.hits ||
    [];

  let sections = [...pack.sections];
  let paragraphsTouched = 0;

  for (let i = 0; i < sections.length; i += 1) {
    const body = String(sections[i].body || "");
    const edited = editParagraphBody(body, input);
    if (edited.changed) {
      paragraphsTouched += 1;
      sections[i] = { ...sections[i], body: edited.body };
    }
  }

  let next = { ...pack, sections };
  let ratio = preserveRatio(beforeFull, getBlogFullText(next));

  if (ratio < SAFE_EDIT_MIN_PRESERVE_RATIO || paragraphsTouched === 0) {
    next = applyGoldenSafeEdit(pack, input, { forceApply: true });
    ratio = preserveRatio(beforeFull, getBlogFullText(next));
  }

  next = scrubPlaceholderFromPack(next);
  next = injectBrandFactsIntoPack(next, input);
  ratio = preserveRatio(beforeFull, getBlogFullText(next));

  if (ratio < SAFE_EDIT_MIN_PRESERVE_RATIO) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        paragraphSafeEditSkipped: true,
        paragraphSafeEditPreserveRatio: ratio,
        paragraphSafeEditReason: "preserve_ratio_below_85",
      },
    };
  }

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      paragraphSafeEdit: true,
      paragraphSafeEditPreserveRatio: ratio,
      paragraphSafeEditParagraphs: paragraphsTouched,
      paragraphSafeEditFailing: failing.slice(0, 6),
    },
  };
}
