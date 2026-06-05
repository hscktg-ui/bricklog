/**
 * MISSION OUTPUT SANITIZER — 고객 배달 직전 메타·브로슈어·치환 실패 제거
 */
import { fixBrandJosa } from "@/lib/korean/josaFix";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { wordOverlapRatio } from "@/lib/content/duplicateKillerEngine";
import { deriveTopicWritingContext, topicWritingFacet } from "@/lib/content/topicFacetEngine";
import { isEditorHumanizationForbiddenSentence } from "@/lib/product/editorHumanizationEngine";

export const MISSION_OUTPUT_SANITIZER_VERSION = "v1";

const META_PAREN_RE = /\(본\s*톤·연출만[^)]*\)/g;
const META_ONLY_LINE_RE = /^\(본\s*톤·연출만[^)]*\)\s*$/;

const TEMPLATE_PAD_RES = [
  /프레임·침실\s*연출·전시\s*구성\s*흐름/,
  /흐름을\s*직접\s*확인했어요/,
];

const BROCHURE_DECLARATIVE_RES = [
  /인기를\s*끌고\s*있다/,
  /저상형\s*설계의\s+[^.]+출시했다/,
  /프리미엄\s*침대\s*브랜드로\s*알려져\s*있다/,
  /신혼가구\s*구매자(?:들)?에게\s*인기\s*있는\s*장소이다/,
];

const BROKEN_WEAVE_RES = [
  /매장는/,
  /\.라는\s*설명/,
  /이다\.라는/,
  /한다\.라는/,
  /있다\.라는/,
];

const HAMNIDA_TAIL_RES = [
  [/생겼었다\.?/g, "생겼어요."],
  [/돌아봤었다\.?/g, "돌아봤어요."],
  [/했었다\.?/g, "했어요."],
  [/였었다\.?/g, "였어요."],
  [/망설여진다\.?/g, "망설여져요."],
  [/걱정\s*반이다\.?/g, "걱정 반이에요."],
  [/설렘\s*반,/g, "설렘 반,"],
  [/([^요])\s*봤다\.?$/g, "$1봤어요."],
  [/([^요])\s*확인했다\.?$/g, "$1확인했어요."],
];

function re(source, flags = "") {
  return new RegExp(source, flags);
}

export function topicCapAltPhrase(input = {}) {
  const topic = String(input.topic || input.mainKeyword || "").trim();
  if (/오피모/i.test(topic)) return "오피모 전시";
  if (/간식/.test(topic)) return "수제 간식";
  const facet = topicWritingFacet(input) || deriveTopicWritingContext(input).topicFacet;
  return facet && facet.length >= 2 ? facet : "이용";
}

export function stripMissionOutputMeta(text = "") {
  return String(text || "")
    .replace(META_PAREN_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function sanitizeMissionSentence(text = "", input = {}) {
  let s = stripMissionOutputMeta(String(text || "").trim());
  if (!s) return "";

  for (const [rx, rep] of HAMNIDA_TAIL_RES) {
    s = s.replace(rx, rep);
  }

  s = s.replace(/이\s*주제/g, topicCapAltPhrase(input));
  s = fixBrandJosa(s, input.brandName || deriveTopicWritingContext(input).brand);

  return s.replace(/\s{2,}/g, " ").trim();
}

export function isMissionOutputDefectSentence(text = "", input = {}) {
  const raw = String(text || "").trim();
  if (!raw || raw.replace(/\s/g, "").length < 6) return true;
  if (META_ONLY_LINE_RE.test(raw)) return true;
  if (META_PAREN_RE.test(raw)) return true;

  const t = sanitizeMissionSentence(raw, input);
  if (!t || t.replace(/\s/g, "").length < 6) return true;
  if (BROKEN_WEAVE_RES.some((rx) => rx.test(t))) return true;
  if (TEMPLATE_PAD_RES.some((rx) => rx.test(t))) return true;
  if (/\b이\s*주제\b/.test(t)) return true;
  if (isEditorHumanizationForbiddenSentence(t)) return true;

  if (BROCHURE_DECLARATIVE_RES.some((rx) => rx.test(t))) {
    if (!/들었|들었어요|확인했|봤어요|메모|직접/.test(t)) return true;
  }

  return false;
}

function sentenceKey(text = "") {
  return String(text || "")
    .replace(/\s/g, "")
    .slice(0, 48);
}

function dedupeSentencesInText(text = "", input = {}, globalSeen = [], dedupe = true) {
  const paras = String(text || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const keptParas = [];
  for (const para of paras) {
    if (/^>\s/.test(para)) {
      keptParas.push(para);
      continue;
    }
    const sentences = splitKoreanSentences(para);
    const kept = [];
    for (const s of sentences) {
      const cleaned = sanitizeMissionSentence(s, input);
      if (!cleaned || isMissionOutputDefectSentence(cleaned, input)) continue;

      const key = sentenceKey(cleaned);
      if (dedupe) {
        let dup = globalSeen.some((prev) => wordOverlapRatio(prev, cleaned) >= 0.88);
        if (!dup) {
          dup = globalSeen.some((prev) => key.length >= 20 && prev.includes(key.slice(0, 20)));
        }
        if (dup) continue;
      }

      globalSeen.push(cleaned);
      kept.push(cleaned);
    }
    if (kept.length) keptParas.push(kept.join(" "));
  }
  return keptParas.join("\n\n").trim();
}

function stripBlockquotesFromBody(body = "", allowBlockquote = false) {
  const paras = String(body || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const kept = [];
  for (const para of paras) {
    if (/^>\s/.test(para)) {
      if (allowBlockquote) kept.push(para);
      continue;
    }
    kept.push(para);
  }
  return kept.join("\n\n").trim();
}

/**
 * @param {object} pack
 * @param {object} input
 * @param {{ dedupe?: boolean }} [options]
 */
export function applyMissionOutputSanitizerPack(pack, input = {}, options = {}) {
  if (!pack?.sections?.length) return pack;
  const dedupe = options.dedupe !== false;
  const force = pack._meta?.missionOutputSanitizerForce === true;
  if (pack._meta?.missionOutputSanitizer && !force) return pack;

  const globalSeen = [];
  const lastIdx = (pack.sections || []).length - 1;
  const sections = (pack.sections || []).map((sec, idx) => {
    let body = dedupeSentencesInText(sec.body, input, globalSeen, dedupe);
    body = stripBlockquotesFromBody(body, idx === lastIdx);
    if (idx === lastIdx && body.includes("> ")) {
      const lines = body.split(/\n\n+/);
      const bq = lines.filter((l) => /^>\s/.test(l.trim()));
      const prose = lines.filter((l) => !/^>\s/.test(l.trim()));
      body = [...prose, ...bq.slice(0, 1)].filter(Boolean).join("\n\n").trim();
    }
    return {
      ...sec,
      heading: sanitizeMissionSentence(sec.heading, input),
      body,
    };
  }).filter((s) => String(s.body || "").replace(/\s/g, "").length >= 20);

  const next = {
    ...pack,
    title: sanitizeMissionSentence(pack.title, input),
    representativeTitle: pack.representativeTitle
      ? sanitizeMissionSentence(pack.representativeTitle, input)
      : pack.representativeTitle,
    sections,
    conclusion: pack.conclusion
      ? dedupeSentencesInText(pack.conclusion, input, globalSeen, dedupe)
      : pack.conclusion,
    intro: pack.intro ? dedupeSentencesInText(pack.intro, input, globalSeen, dedupe) : pack.intro,
  };

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      missionOutputSanitizer: MISSION_OUTPUT_SANITIZER_VERSION,
    },
  };
}
