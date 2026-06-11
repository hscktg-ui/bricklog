/**
 * BRICLOG Delete Engine — 불필요 문장 제거 (목표 20~40% 중복·공허 문장)
 * 삭제해도 의미 변화 없는 문장 · 정보 없는 확인 문장 · 브랜드명 반복만 있는 문장
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { isHollowInfoSentence } from "@/lib/product/briclogExplainEngine";
import { isDryFactSentence } from "@/lib/product/briclogExperienceOpinionEngine";
import { detectResearchFirstViolations } from "@/lib/product/briclogResearchFirstPipeline";

export const DELETE_ENGINE_VERSION = "delete-v1";
export const DELETE_TARGET_MIN_RATIO = 0.2;
export const DELETE_TARGET_MAX_RATIO = 0.4;

/** 삭제 대상 — 정보 없는 확인·중립·반복 템플릿 */
export const DELETE_SENTENCE_RES = [
  /확인해\s*보았습니다/,
  /정리해\s*보았습니다/,
  /확인해\s*보았어요/,
  /정리해\s*보았어요/,
  /기준이\s*보였/,
  /비교가\s*수월해요/,
  /중립적으로\s*정리/,
  /관련해서\s*를\s*보면/,
  /조건\s*및\s*구성/,
  /이\s*구성/,
  /좋은내용/,
  /하나씩\s*비교해\s*봤어요\.?\s*$/,
  /톤만\s*맞췄어요\.?\s*$/,
  /무난했어요\.?\s*$/,
  /서비스를\s*제공합니다/,
  /도움이\s*될\s*것입니다/,
  /참고하시면\s*좋습니다/,
];

function normalizeKey(s = "") {
  return String(s).replace(/\s/g, "").slice(0, 48);
}

function isBrandOnlyRepeat(sentence = "", brand = "") {
  if (!brand || brand.length < 2) return false;
  const stripped = sentence.replace(new RegExp(brand, "g"), "").replace(/\s/g, "");
  return stripped.length < 12 && sentence.includes(brand);
}

function hasConcreteInfo(sentence = "") {
  return /(?:특징|이유|때문|장점|단점|방법|기준|색|향|톤|가격|만원|시즌|메뉴|예약|무인|24\s*시간|\d)/.test(
    sentence
  );
}

/**
 * @param {string} sentence
 * @param {object} [ctx]
 */
export function isDeletableSentence(sentence = "", ctx = {}) {
  const s = String(sentence || "").trim();
  if (s.replace(/\s/g, "").length < 6) return false;
  if (DELETE_SENTENCE_RES.some((re) => re.test(s))) return true;
  if (detectResearchFirstViolations(s).length) return true;
  if (isHollowInfoSentence(s)) return true;
  if (isDryFactSentence(s) && !hasConcreteInfo(s)) return true;
  if (isBrandOnlyRepeat(s, ctx.brand)) return true;
  if (/^(?:이용|안내)\s*—/.test(s)) return true;
  return false;
}

function dedupeSentences(sentences = []) {
  const seen = new Set();
  const kept = [];
  for (const s of sentences) {
    const key = normalizeKey(s);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(s);
  }
  return kept;
}

function pruneBody(body = "", ctx = {}) {
  const sentences = splitKoreanSentences(body);
  if (!sentences.length) return { text: body, removed: 0, before: 0 };

  const before = sentences.length;
  let filtered = sentences.filter((s) => !isDeletableSentence(s, ctx));
  filtered = dedupeSentences(filtered);

  const removed = before - filtered.length;
  return {
    text: filtered.join(" "),
    removed,
    before,
  };
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function applyBriclogDeleteEngine(pack, input = {}) {
  if (!pack?.sections?.length) return pack;

  const ctx = { brand: String(input.brandName || "").trim() };
  let totalBefore = 0;
  let totalRemoved = 0;

  const sections = pack.sections.map((sec) => {
    const { text, removed, before } = pruneBody(sec.body, ctx);
    totalBefore += before;
    totalRemoved += removed;
    return { ...sec, body: text };
  });

  let conclusion = pack.conclusion;
  if (conclusion) {
    const { text, removed, before } = pruneBody(conclusion, ctx);
    totalBefore += before;
    totalRemoved += removed;
    conclusion = text;
  }

  const ratio = totalBefore ? totalRemoved / totalBefore : 0;

  return {
    ...pack,
    sections,
    conclusion,
    _meta: {
      ...(pack._meta || {}),
      deleteEngine: {
        version: DELETE_ENGINE_VERSION,
        removed: totalRemoved,
        before: totalBefore,
        ratio: Math.round(ratio * 100) / 100,
      },
    },
  };
}

/**
 * @param {object} pack
 * @param {object} [input]
 */
export function assessDeleteEngine(pack, input = {}) {
  const full = getBlogFullText(pack);
  const sentences = splitKoreanSentences(full);
  const ctx = { brand: String(input.brandName || "").trim() };
  const deletable = sentences.filter((s) => isDeletableSentence(s, ctx)).length;
  const ratio = sentences.length ? deletable / sentences.length : 0;

  return {
    version: DELETE_ENGINE_VERSION,
    ok: deletable === 0,
    total: sentences.length,
    deletable,
    ratio,
    meta: pack?._meta?.deleteEngine || null,
  };
}
