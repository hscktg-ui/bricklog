/**
 * Golden Safe Edit — 재검수 후 원문 85% 보존·문단 단위 수정
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { getForbiddenGlobalPhrases, getAiClichePhrases } from "@/lib/golden/haeshinPhraseLists";
import { assessHaeshinQualityScore } from "@/lib/golden/haeshinQualityScorer";
import { SAFE_EDIT_MIN_PRESERVE_RATIO } from "@/lib/golden/haeshinContentDnaSeed";
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

const RESEARCH_LEAK_RES = [
  /현장에서.*(?:메모|들으며)/,
  /메모해\s*뒀/,
  /확인해\s*뒀/,
  /이야기를\s*들으며/,
];

const CLICHE_REPLACE = [
  [/특별한\s*경험/g, "편안한 시간"],
  [/소중한\s*순간/g, "일상"],
  [/감동을\s*선사/g, "도움이 되"],
  [/가치를\s*전달/g, "안내"],
  [/고객\s*만족을\s*최우선/g, "방문 전 확인"],
];

function detectDominantVoice(full = "") {
  const seupCount = (full.match(/습니다|습니까|됩니다|입니다/g) || []).length;
  const haeyoCount = (full.match(/해요|예요|이에요|세요/g) || []).length;
  const casualCount = (full.match(/뒀어요|봤어요|했어요|거예요|는데요|됐어요/g) || []).length;
  if (seupCount >= haeyoCount && seupCount >= casualCount && seupCount > 0) return "seupnida";
  if (haeyoCount >= casualCount && haeyoCount > 0) return "haeyo";
  if (seupCount > 0) return "seupnida";
  return "haeyo";
}

function normalizeSentenceVoice(sentence = "", mode = "seupnida") {
  let t = String(sentence || "").trim();
  if (!t) return "";

  if (mode === "seupnida") {
    t = t
      .replace(/메모해\s*뒀어요/g, "메모해 두었습니다")
      .replace(/확인해\s*뒀어요/g, "확인해 두었습니다")
      .replace(/확인해보세요/g, "확인해 보시면 좋습니다")
      .replace(/만끽해보세요/g, "만끽해 보시면 좋습니다")
      .replace(/살펴보았어요/g, "살펴보았습니다")
      .replace(/선보이고\s*있어요/g, "선보이고 있습니다")
      .replace(/만들어주어요/g, "만들어 줍니다")
      .replace(/즐길\s*수\s*있답니다/g, "즐길 수 있습니다")
      .replace(/인기랍니다/g, "인기입니다")
      .replace(/공간이에요/g, "공간입니다")
      .replace(/장소예요/g, "장소입니다")
      .replace(/여러\s*가지예요/g, "여러 가지입니다")
      .replace(/생각나게\s*되죠/g, "생각나게 됩니다")
      .replace(/경험이죠/g, "경험입니다")
      .replace(/어울려요/g, "어울립니다")
      .replace(/좋답니다/g, "좋습니다")
      .replace(/추천해요/g, "추천합니다")
      .replace(/특별하답니다/g, "특별합니다")
      .replace(/뒀어요/g, "두었습니다")
      .replace(/봤어요/g, "보았습니다")
      .replace(/했어요/g, "했습니다")
      .replace(/됐어요/g, "되었습니다")
      .replace(/였어요/g, "였습니다")
      .replace(/거예요/g, "것입니다")
      .replace(/인데요/g, "입니다")
      .replace(/되죠/g, "됩니다")
      .replace(/있답니다/g, "있습니다")
      .replace(/있어요/g, "있습니다")
      .replace(/없어요/g, "없습니다")
      .replace(/이에요/g, "입니다")
      .replace(/예요/g, "입니다")
      .replace(/랍니다/g, "입니다")
      .replace(/보세요/g, "보시면 좋습니다")
      .replace(/해요/g, "합니다");
  } else if (mode === "haeyo") {
    t = t
      .replace(/습니다/g, "어요")
      .replace(/입니다/g, "이에요")
      .replace(/됩니다/g, "돼요");
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

function rewriteResearchLeak(sentence = "", mode = "seupnida") {
  const t = String(sentence || "");
  if (!RESEARCH_LEAK_RES.some((re) => re.test(t))) return null;
  const flowers = t.match(/리시안셔스|해바라기|수국|거베라/g);
  if (flowers?.length) {
    const uniq = [...new Set(flowers)].slice(0, 4).join("·");
    return mode === "seupnida"
      ? `여름 시즌 ${uniq}도 함께 살펴보았습니다.`
      : `여름 시즌 ${uniq}도 함께 살펴봤어요.`;
  }
  return mode === "seupnida"
    ? "현장에서 확인한 내용을 바탕으로 정리했습니다."
    : null;
}

function stripForbiddenInline(text = "", input = {}) {
  let t = String(text || "");
  for (const phrase of getForbiddenGlobalPhrases(input)) {
    if (phrase.length >= 3) {
      t = t.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), " ");
    }
  }
  for (const phrase of getAiClichePhrases(input)) {
    if (t.includes(phrase)) t = t.replace(phrase, "");
  }
  for (const [re, rep] of CLICHE_REPLACE) {
    t = t.replace(re, rep);
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

function cleanSentence(sentence = "", voiceMode = "seupnida", aggressive = false, input = {}) {
  let t = String(sentence || "").trim();
  if (!t) return "";

  const rewritten = rewriteResearchLeak(t, voiceMode);
  if (rewritten) return rewritten;

  for (const re of DROP_SENTENCE_RES) {
    if (re.test(t)) {
      return aggressive ? "" : normalizeSentenceVoice(stripForbiddenInline(t, input), voiceMode);
    }
  }

  t = stripForbiddenInline(t, input);
  t = normalizeSentenceVoice(t, voiceMode);

  if (RESEARCH_LEAK_RES.some((re) => re.test(t))) {
    return rewriteResearchLeak(t, voiceMode) || (aggressive ? "" : t);
  }
  return t.replace(/\s{2,}/g, " ").trim();
}

function editParagraph(text = "", voiceMode = "seupnida", aggressive = false, input = {}) {
  const parts = splitKoreanSentences(text)
    .map((s) => cleanSentence(s, voiceMode, aggressive, input))
    .filter((s) => s.replace(/\s/g, "").length >= 8);
  return parts.join("\n\n").trim();
}

function buildEditedPack(pack, voiceMode, aggressive = false, input = {}) {
  const sections = pack.sections.map((sec) => {
    const body = editParagraph(sec.body || "", voiceMode, aggressive, input);
    return { ...sec, body: body || sec.body };
  });
  let conclusion = pack.conclusion
    ? editParagraph(pack.conclusion, voiceMode, aggressive, input)
    : pack.conclusion;
  if (!conclusion || conclusion.replace(/\s/g, "").length < 8) {
    conclusion = pack.conclusion;
  }
  return { ...pack, sections, conclusion };
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
export function applyGoldenSafeEdit(pack, input = {}, options = {}) {
  if (!pack?.sections?.length) return pack;

  const beforeFull = getBlogFullText(pack);
  const beforeScore = assessHaeshinQualityScore(pack, input).score;
  const speaker = String(input.v4Speaker || input.speaker || "").trim();
  const voiceMode =
    options.forceVoice ||
    (/brand_intro|magazine|expert_info|local_blogger/.test(speaker) ? "seupnida" : null) ||
    detectDominantVoice(beforeFull);

  const allowAggressive = !options.forceApply;
  let next = buildEditedPack(pack, voiceMode, false, input);
  let ratio = preserveRatio(beforeFull, getBlogFullText(next));
  let afterScore = assessHaeshinQualityScore(next, input).score;

  if (allowAggressive && (afterScore < beforeScore || ratio < SAFE_EDIT_MIN_PRESERVE_RATIO)) {
    next = buildEditedPack(pack, voiceMode, true, input);
    ratio = preserveRatio(beforeFull, getBlogFullText(next));
    afterScore = assessHaeshinQualityScore(next, input).score;
  }

  if (afterScore < beforeScore && !options.forceApply) {
    return {
      ...pack,
      _meta: {
        ...(pack._meta || {}),
        goldenSafeEditSkipped: true,
        goldenSafeEditPreserveRatio: ratio,
        goldenSafeEditReason: "score_regressed",
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
      goldenSafeEditVoiceMode: voiceMode,
    },
  };
}
