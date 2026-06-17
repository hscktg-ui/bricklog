/**
 * Visit Review Unified Prose — 방문 후기형 통합 서사
 * 문단 연결 · 현장감 · 반복 제거 · 감정선 · 작업과정 금지 · AI 패턴 제거
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";
import { getIndustryFlavorForInput } from "@/lib/product/industryContextEngine";
import { mapSectionArcRoles } from "@/lib/content/humanColumnPolishEngine";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";

export const VISIT_REVIEW_UNIFIED_VERSION = "visit-review-unified-v1";

const CAPPED_PHRASES = [
  {
    re: /직접 확인(?:할|해) 수 있(?:습니다|어요|었습니다|어요)/g,
    alts: [
      "살펴볼 수 있었습니다",
      "눈에 들어왔습니다",
      "체감할 수 있었습니다",
      "둘러볼 수 있었습니다",
      "인상적이었습니다",
    ],
  },
  {
    re: /만나볼 수 있(?:습니다|어요|었습니다)/g,
    alts: ["가까이서 볼 수 있었습니다", "눈앞에 펼쳐져 있었습니다", "직접 볼 수 있었습니다"],
  },
  {
    re: /경험할 수 있(?:습니다|어요|었습니다)/g,
    alts: ["직접 느껴볼 수 있었습니다", "체험해 볼 수 있었습니다", "손으로 확인할 수 있었습니다"],
  },
  {
    re: /확인해보시기 바랍니다/g,
    alts: ["한번 들러보시면 감이 옵니다", "방문해 보시면 비교가 수월합니다"],
  },
  {
    re: /운영하고 있(?:습니다|어요)/g,
    alts: ["영업 중이었습니다", "가동 중이었습니다", "열려 있었습니다"],
  },
  {
    re: /준비되어 있(?:습니다|어요)/g,
    alts: ["마련되어 있었습니다", "갖춰져 있었습니다", "놓여 있었습니다"],
  },
];

const PROCESS_NARRATION_RES = [
  [/좋은\s*.+?을\s*선별하여/gi, "만져보니 결이 살아있고"],
  [/선별하여\s*제작한/gi, "만져보니 묵직하게 느껴지는"],
  [/꼼꼼하게\s*제작하여/gi, "손으로 만진 느낌이 묵직하고"],
  [/정성껏\s*준비하여/gi, "준비된 상태가"],
  [/세심하게\s*관리하여/gi, "관리가 잘 된 느낌이"],
  [/고객\s*만족을\s*위해\s*/gi, ""],
  [/만족을\s*위해\s*정성/gi, "정성"],
];

const AI_OPENER_RES = [
  /^특히\s+/,
  /^또한\s+/,
  /^더불어\s+/,
  /^뿐만\s*아니라\s+/,
  /^이처럼\s+/,
  /^이러한\s+/,
  /^한편\s+/,
  /^따라서\s+/,
  /^결과적으로\s+/,
];

const FIELD_MARKER_RE =
  /입구|들어서|첫인상|분위기|눈에|직접|체험|누워|만져|들렀|방문|도착|공간|전시|좌석|향기|소음|밝기/;

const EMOTION_MARKER_RE =
  /생각보다|의외|인상적|기억에\s*남|만족|편안|아쉬움\s*없|솔직히|느껴|느꼈/;

const STACCATO_CONNECTORS = [
  "",
  " 자연스럽게 ",
  " 그 과정에서 ",
  " 이어서 ",
  " 덧붙여 말하면 ",
];

const CROSS_SECTION_BRIDGES = [
  "이어서 ",
  "그 흐름 그대로 ",
  "같은 기준으로 ",
  "한 번 더 ",
  "마지막으로 ",
];

function splitSentences(text = "") {
  return splitKoreanSentences(String(text || "")).filter(
    (s) => s.replace(/\s/g, "").length >= 6
  );
}

function isStaccatoSentence(s = "") {
  const t = String(s || "").trim();
  if (t.length > 48) return false;
  if (t.length < 22 && /[.!?…]$/.test(t)) return true;
  return (
    t.length < 38 &&
    /습니다[.!?…]?$|입니다[.!?…]?$|했습니다[.!?…]?$|했습니다$/.test(t)
  );
}

function weaveStaccatoBuffer(parts = []) {
  if (parts.length < 2) return parts.join(". ") + (parts[0]?.endsWith(".") ? "" : ".");
  let out = parts[0].replace(/[.!?…]+$/, "");
  for (let i = 1; i < parts.length; i += 1) {
    const conn = STACCATO_CONNECTORS[i % STACCATO_CONNECTORS.length];
    const piece = parts[i].replace(/[.!?…]+$/, "");
    const lower =
      piece.charAt(0) === piece.charAt(0).toLowerCase() ? piece : piece.charAt(0).toLowerCase() + piece.slice(1);
    const sep = conn ? conn : ". ";
    out += `${out.endsWith(".") || out.endsWith("!") || out.endsWith("?") ? " " : sep}${lower}`;
  }
  return out.endsWith(".") || out.endsWith("!") || out.endsWith("?") ? out : `${out}.`;
}

function mergeSectionStaccato(body = "") {
  const paras = splitParagraphs(body);
  if (paras.length < 2) return mergeStaccatoParagraph(body);

  const allShort = paras.every((p) => {
    const sents = splitSentences(p);
    return sents.length <= 1 && (isStaccatoSentence(p) || p.replace(/\s/g, "").length < 36);
  });
  if (allShort) {
    return weaveStaccatoBuffer(paras.map((p) => p.replace(/[.!?…]+$/, "")));
  }

  const merged = [];
  let buffer = [];
  for (const p of paras) {
    const sents = splitSentences(p);
    const isShortPara =
      sents.length <= 1 && (isStaccatoSentence(p) || p.replace(/\s/g, "").length < 36);
    if (isShortPara) {
      buffer.push(p.replace(/[.!?…]+$/, ""));
    } else {
      if (buffer.length >= 2) merged.push(weaveStaccatoBuffer(buffer));
      else if (buffer.length === 1) merged.push(`${buffer[0]}.`);
      buffer = [];
      merged.push(mergeStaccatoParagraph(p));
    }
  }
  if (buffer.length >= 2) merged.push(weaveStaccatoBuffer(buffer));
  else if (buffer.length === 1) merged.push(`${buffer[0]}.`);
  return joinParagraphs(merged);
}

function mergeStaccatoParagraph(text = "") {
  const sentences = splitSentences(text);
  if (sentences.length < 2) return text;
  const merged = [];
  let buffer = [];
  for (const s of sentences) {
    if (isStaccatoSentence(s)) {
      buffer.push(s);
    } else {
      if (buffer.length >= 2) merged.push(weaveStaccatoBuffer(buffer));
      else if (buffer.length === 1) merged.push(buffer[0]);
      buffer = [];
      merged.push(s);
    }
  }
  if (buffer.length >= 2) merged.push(weaveStaccatoBuffer(buffer));
  else if (buffer.length === 1) merged.push(buffer[0]);
  return merged.join(" ");
}

function countPatternHits(text = "", re) {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const globalRe = new RegExp(re.source, flags);
  return [...String(text).matchAll(globalRe)].length;
}

function stripAiTransitionsInText(text = "") {
  let out = String(text || "");
  for (const token of [
    "특히 ",
    "또한 ",
    "더불어 ",
    "뿐만 아니라 ",
    "이처럼 ",
    "이러한 ",
    "한편 ",
    "따라서 ",
    "결과적으로 ",
  ]) {
    out = out.split(token).join("");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function stripAiOpenersFromSentence(s = "") {
  let t = stripAiTransitionsInText(s);
  for (const re of AI_OPENER_RES) {
    t = t.replace(re, "");
  }
  return t.trim();
}

function rewriteProcessNarration(text = "") {
  let out = String(text || "");
  for (const [re, rep] of PROCESS_NARRATION_RES) {
    out = out.replace(re, rep);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

function applyPhraseCapToText(text = "", globalCounts = new Map()) {
  let out = String(text || "");
  for (const { re, alts } of CAPPED_PHRASES) {
    const key = re.source;
    if (!globalCounts.has(key)) globalCounts.set(key, 0);
    out = out.replace(re, (match) => {
      const n = globalCounts.get(key) || 0;
      globalCounts.set(key, n + 1);
      if (n === 0) return match;
      return alts[n % alts.length];
    });
  }
  return out;
}

function polishSentenceFlow(text = "") {
  const sentences = splitSentences(text);
  if (!sentences.length) return text;
  return sentences
    .map((s) => stripAiOpenersFromSentence(s))
    .filter(Boolean)
    .join(" ");
}

function splitParagraphs(body = "") {
  return String(body || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.replace(/\s/g, "").length >= 8);
}

function joinParagraphs(paras = []) {
  return paras.filter(Boolean).join("\n\n");
}

/** STEP 1 — 전체 글 주제 1줄 */
export function buildVisitReviewThesis(input = {}) {
  const p = deriveTopicWritingContext(input);
  const { flavor } = getIndustryFlavorForInput(input);
  const topic = String(p.topicObj || p.topic || input.topic || "방문").trim();
  return `${topic}을 위해 ${p.regionBit}${p.brand} ${flavor.spaceWord || "매장"}에 다녀와 직접 체험하며 느낀 후기`.replace(
    /\s+/g,
    " "
  );
}

/** STEP 2 — 전체 흐름 */
export function buildVisitReviewFlow(input = {}) {
  const p = deriveTopicWritingContext(input);
  return ["도착", `${p.brand} 둘러봄`, "제품·서비스 체험", "상담·조건 확인", "총평"];
}

function buildFieldRealismLine(role = "seung", input = {}, slot = 0) {
  const p = deriveTopicWritingContext(input);
  const { flavor } = getIndustryFlavorForInput(input);
  const space = flavor.spaceWord || "매장";
  const product = flavor.productWord || "제품";
  const pools = {
    gi: [
      `${p.regionBit}${space}에 들어서자 생각보다 넓은 공간이 먼저 눈에 들어왔습니다.`,
      `처음 도착했을 때 ${space} 분위기가 의외로 편안하게 느껴졌습니다.`,
      `입구를 지나자 ${product} 배치가 한눈에 들어왔습니다.`,
    ],
    seung: [
      `둘러보는 과정에서 ${product} 구성이 비교하기 편하게 되어 있었습니다.`,
      `동선을 따라가며 눈에 띄는 요소를 하나씩 살펴봤습니다.`,
      `현장에서 직접 만져보고 앉아보며 차이를 느꼈습니다.`,
    ],
    jeon: [
      `다른 매장과 비교해 보면 ${p.brand}만의 기준이 분명했습니다.`,
      `비슷해 보이는 구성도 써 보면 체감이 달랐습니다.`,
    ],
    gyeol: [
      `정리하면 ${p.regionBit}${p.brand} 방문은 직접 확인한 범위 안에서 판단하는 편이 낫습니다.`,
      `마지막으로 남은 인상은 ${space} 분위기와 ${product} 체감이었습니다.`,
    ],
  };
  const list = pools[role] || pools.seung;
  return list[slot % list.length];
}

function ensureFieldRealism(body = "", role = "seung", input = {}, slot = 0) {
  if (FIELD_MARKER_RE.test(body)) return body;
  const line = buildFieldRealismLine(role, input, slot);
  if (!line) return body;
  return body.trim() ? `${line}\n\n${body.trim()}` : line;
}

function bridgeSectionBodies(sections = [], input = {}) {
  if (sections.length <= 1) return sections;
  const out = sections.map((s) => ({ ...s }));
  for (let i = 1; i < out.length; i += 1) {
    const prevParas = splitParagraphs(out[i - 1].body);
    const curParas = splitParagraphs(out[i].body);
    if (!curParas.length) continue;
    const first = curParas[0].trim();
    if (/^(이어서|그다음|입구|처음|매장에|그 흐름|같은 기준|마지막으로)/.test(first)) {
      continue;
    }
    const bridge = CROSS_SECTION_BRIDGES[(i - 1) % CROSS_SECTION_BRIDGES.length];
    const lower =
      first.charAt(0) === first.charAt(0).toLowerCase()
        ? first
        : first.charAt(0).toLowerCase() + first.slice(1);
    curParas[0] = `${bridge}${lower}`;
    out[i] = { ...out[i], body: joinParagraphs(curParas) };
  }
  return out;
}

function injectEmotionalBeat(body = "", slot = 0) {
  if (EMOTION_MARKER_RE.test(body)) return body;
  const beats = [
    "생각보다 인상적이었습니다.",
    "의외로 편안하게 느껴졌습니다.",
    "기억에 남을 만한 순간이었습니다.",
    "솔직히 만족스러웠습니다.",
  ];
  const beat = beats[slot % beats.length];
  const paras = splitParagraphs(body);
  if (!paras.length) return beat;
  if (paras.length === 1) {
    return `${paras[0]} ${beat}`;
  }
  paras[paras.length - 1] = `${paras[paras.length - 1]} ${beat}`;
  return joinParagraphs(paras);
}

function ensureVisitReviewToneBalance(sections = [], input = {}) {
  const full = sections.map((s) => s.body).join("\n\n");
  let emotionHits = countPatternHits(full, EMOTION_MARKER_RE);
  let fieldHits = countPatternHits(full, FIELD_MARKER_RE);
  const out = sections.map((s) => ({ ...s }));

  for (let i = 0; i < out.length && fieldHits < 3; i += 1) {
    const body = String(out[i].body || "");
    if ((body.match(FIELD_MARKER_RE) || []).length >= 1) continue;
    const role = mapSectionArcRoles(out.length)[i] || "seung";
    out[i] = {
      ...out[i],
      body: ensureFieldRealism(body, role, input, i),
    };
    fieldHits = countPatternHits(out.map((s) => s.body).join("\n\n"), FIELD_MARKER_RE);
  }

  for (let i = 0; i < out.length && emotionHits < 2; i += 1) {
    const body = String(out[i].body || "");
    if (EMOTION_MARKER_RE.test(body)) continue;
    out[i] = { ...out[i], body: injectEmotionalBeat(body, i) };
    emotionHits = countPatternHits(out.map((s) => s.body).join("\n\n"), EMOTION_MARKER_RE);
  }

  return out;
}

export function isVisitReviewUnifiedProseEnabled() {
  if (process.env.BRICLOG_VISIT_REVIEW_UNIFIED === "false") return false;
  return isBriclogMissionEnforced();
}

export function buildVisitReviewUnifiedProsePromptBlock() {
  return `【방문 후기 통합 서사】
전체 글을 먼저 하나의 흐름(도착→둘러봄→체험→상담→총평)으로 설계하고, 섹션은 구조만 담당하세요.
각 문단은 이전 문단 맥락을 이어받아 작성하세요. 짧은 문장 나열(「매장은 넓습니다.」「제품이 다양합니다.」) 금지 — 한 흐름의 산문으로 연결하세요.
현장감 필수: 도착 첫인상·공간 분위기·눈에 띈 요소·행동 묘사·개인 생각·비교 경험.
「직접 확인할 수 있습니다」「경험할 수 있습니다」「준비되어 있습니다」 등 동일 표현은 글 전체 1회 이하.
「선별하여」「꼼꼼하게 제작하여」「정성껏 준비하여」「고객 만족을 위해」 등 작업 과정 서술 금지 — 결과·체감 중심.
문장 시작 「특히」「또한」「더불어」「한편」「따라서」「결과적으로」 과다 사용 금지.
정보 60% · 경험 20% · 감정 20% — 생각보다·인상적·기억에 남·의외 등 감정선 포함.`;
}

/** @param {object} pack @param {object} [input] */
export function assessVisitReviewUnifiedProse(pack, input = {}) {
  const full = getBlogFullText(pack);
  const sentences = splitSentences(full);
  const staccato = sentences.filter((s) => isStaccatoSentence(s)).length;
  const staccatoRatio = sentences.length ? staccato / sentences.length : 0;

  let phraseRepeats = 0;
  for (const { re } of CAPPED_PHRASES) {
    const matches = full.match(re);
    if (matches && matches.length > 1) phraseRepeats += matches.length - 1;
  }

  let aiOpeners = 0;
  for (const s of sentences) {
    if (AI_OPENER_RES.some((re) => re.test(s.trim()))) aiOpeners += 1;
  }

  const emotionHits = countPatternHits(full, EMOTION_MARKER_RE);
  const fieldHits = countPatternHits(full, FIELD_MARKER_RE);
  const processHits = PROCESS_NARRATION_RES.filter(([re]) => re.test(full)).length;

  return {
    ok:
      staccatoRatio <= 0.45 &&
      phraseRepeats <= 1 &&
      aiOpeners <= 2 &&
      emotionHits >= 2 &&
      fieldHits >= 3 &&
      processHits === 0,
    staccatoRatio,
    phraseRepeats,
    aiOpeners,
    emotionHits,
    fieldHits,
    processHits,
    version: VISIT_REVIEW_UNIFIED_VERSION,
  };
}

/** @param {object} pack @param {object} [input] */
export function applyVisitReviewUnifiedProsePass(pack, input = {}) {
  if (!pack?.sections?.length || !isVisitReviewUnifiedProseEnabled()) return pack;

  const thesis = buildVisitReviewThesis(input);
  const flow = buildVisitReviewFlow(input);
  const roles = mapSectionArcRoles(pack.sections?.length || 0);
  const phraseCounts = new Map();

  let sections = (pack.sections || []).map((sec, idx) => {
    const role = roles[idx] || "seung";
    let paras = splitParagraphs(sec.body);
    paras = paras.map((p) => mergeSectionStaccato(p));
    let body = mergeSectionStaccato(joinParagraphs(paras));
    paras = splitParagraphs(body);
    paras = paras.map((p) => stripAiTransitionsInText(p));
    paras = paras.map((p) => polishSentenceFlow(p));
    paras = paras.map((p) => rewriteProcessNarration(p));
    paras = paras.map((p) => applyPhraseCapToText(p, phraseCounts));
    body = joinParagraphs(paras);
    body = ensureFieldRealism(body, role, input, idx);
    body = injectEmotionalBeat(body, idx);
    return { ...sec, body };
  });

  sections = bridgeSectionBodies(sections, input);
  sections = ensureVisitReviewToneBalance(sections, input);

  const assessed = assessVisitReviewUnifiedProse({ ...pack, sections }, input);

  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      visitReviewUnifiedPass: true,
      visitReviewUnifiedVersion: VISIT_REVIEW_UNIFIED_VERSION,
      visitReviewThesis: thesis,
      visitReviewFlow: flow,
      visitReviewUnifiedOk: assessed.ok,
      visitReviewStaccatoRatio: assessed.staccatoRatio,
      visitReviewPhraseRepeats: assessed.phraseRepeats,
    },
  };
}

/** 글·채널 공통 — 문단 통합·반복·AI 패턴 정리 */
export function createUnifiedProsePhraseCounts() {
  return new Map();
}

/**
 * @param {string} text
 * @param {Map} [phraseCounts]
 * @param {{ fieldLine?: string, emotionBeat?: string, bridgePrefix?: string }} [opts]
 */
export function applyUnifiedProseToText(text = "", phraseCounts, opts = {}) {
  const counts = phraseCounts || createUnifiedProsePhraseCounts();
  let body = mergeSectionStaccato(String(text || "").trim());
  if (opts.bridgePrefix && body && !/^(이어서|그 흐름|마지막으로|안내)/.test(body)) {
    const lower =
      body.charAt(0) === body.charAt(0).toLowerCase()
        ? body
        : body.charAt(0).toLowerCase() + body.slice(1);
    body = `${opts.bridgePrefix}${lower}`;
  }
  body = stripAiTransitionsInText(body);
  body = polishSentenceFlow(rewriteProcessNarration(body));
  body = applyPhraseCapToText(body, counts);
  if (opts.fieldLine) {
    if (body && !FIELD_MARKER_RE.test(body)) {
      body = `${opts.fieldLine} ${body}`.replace(/\s{2,}/g, " ").trim();
    } else if (!body) {
      body = opts.fieldLine;
    }
  }
  if (opts.emotionBeat && body && !EMOTION_MARKER_RE.test(body)) {
    body = `${body} ${opts.emotionBeat}`.replace(/\s{2,}/g, " ").trim();
  }
  return body;
}

export { countPatternHits };
