/**
 * BRICLOG Korean Orthography Engine — 국립국어원 표준 맞춤법·조사 SSOT
 *
 * 을/를 · 은/는 · 이/가 · 과/와 · (으)로 · 띄어쓰기 · 되/돼 등
 */
import { applyKoreanPolish } from "@/lib/korean/writingTrends";

export const KOREAN_ORTHOGRAPHY_VERSION = "nikl-v1";
export const KOREAN_ORTHOGRAPHY_PASS_SCORE = 90;

const MAX_TEXT_LEN = 14_000;
const MAX_TOKEN_LEN = 48;

/** 받침 유무 (한글 음절) */
export function hasHangulBatchim(word = "") {
  const last = String(word || "").trim().slice(-1);
  if (!/[가-힣]/.test(last)) return false;
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return false;
  return code % 28 !== 0;
}

/** ㄹ 받침 — (으)로 조사 */
function hasRieulBatchim(word = "") {
  const last = String(word || "").trim().slice(-1);
  if (!/[가-힣]/.test(last)) return false;
  return (last.charCodeAt(0) - 0xac00) % 28 === 8;
}

export function pickTopicParticle(word = "") {
  return hasHangulBatchim(word) ? "은" : "는";
}

export function pickObjectParticle(word = "") {
  return hasHangulBatchim(word) ? "을" : "를";
}

export function pickSubjectParticle(word = "") {
  return hasHangulBatchim(word) ? "이" : "가";
}

export function pickConjunctionParticle(word = "") {
  return hasHangulBatchim(word) ? "과" : "와";
}

export function pickDirectionParticle(word = "") {
  if (!hasHangulBatchim(word)) return "로";
  if (hasRieulBatchim(word)) return "로";
  return "으로";
}

function escapeRegExp(s = "") {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** LLM·템플릿에서 자주 틀리는 고정 복합어 */
const COMPOUND_JOSA_FIXES = [
  [/응대을/g, "응대를"],
  [/이용를/g, "이용을"],
  [/쇼룸를/g, "쇼룸을"],
  [/분위기·응대을/g, "분위기와 응대를"],
  [/위치·응대을/g, "위치와 응대를"],
  [/매장를/g, "매장을"],
  [/매장는/g, "매장은"],
  [/브랜드은/g, "브랜드는"],
  [/플라워은/g, "플라워는"],
  [/메뉴를(?=\s*비교)/g, "메뉴를"],
  [/할인을(?=\s*받)/g, "할인을"],
  [/주제를(?=\s*정)/g, "주제를"],
  [/정보를(?=\s*확)/g, "정보를"],
  [/문의를(?=\s*남)/g, "문의를"],
  [/예약을(?=\s*잡)/g, "예약을"],
  [/일정을(?=\s*맞)/g, "일정을"],
  [/방문을(?=\s*계)/g, "방문을"],
  [/후기를(?=\s*남)/g, "후기를"],
  [/선물을(?=\s*고)/g, "선물을"],
  [/리본를/g, "리본을"],
  [/카페를(?=\s*찾)/g, "카페를"],
  [/꽃다발을(?=\s*고)/g, "꽃다발을"],
  [/어버이날을(?=\s*앞)/g, "어버이날을"],
];

/** 국립국어원 표준어·띄어쓰기 (규칙 기반) */
const NIKL_SPELLING_FIXES = [
  [/안돼(?=[요\.]|$)/g, "안 돼"],
  [/안되(?=[요\.]|$)/g, "안 돼"],
  [/안됩니다/g, "안 됩니다"],
  [/안되는/g, "안 되는"],
  [/안되면/g, "안 되면"],
  [/되요/g, "돼요"],
  [/안되요/g, "안 돼요"],
  [/돼서/g, "돼서"],
  [/해도돼/g, "해도 돼"],
  [/해도되/g, "해도 돼"],
  [/수있(?=[게은는을를])/g, "수 있"],
  [/수없/g, "수 없"],
  [/것같/g, "것 같"],
  [/것 같아요/g, "것 같아요"],
  [/때문 에/g, "때문에"],
  [/뿐 만/g, "뿐만"],
  [/어 떻/g, "어떻"],
  [/왠지/g, "웬지"],
  [/왠 만/g, "웬"],
  [/않 되/g, "안 되"],
  [/않됩니다/g, "안 됩니다"],
  [/않되는/g, "안 되는"],
  [/않돼/g, "안 돼"],
  [/않되/g, "안 돼"],
  [/않아요/g, "않아요"],
  [/해주세요/g, "해 주세요"],
  [/해주시/g, "해 주시"],
  [/봐주세요/g, "봐 주세요"],
  [/알려주세요/g, "알려 주세요"],
  [/확인해주/g, "확인해 주"],
  [/참고해주/g, "참고해 주"],
  [/문의해주/g, "문의해 주"],
  [/예약해주/g, "예약해 주"],
  [/주문해주/g, "주문해 주"],
  [/연락해주/g, "연락해 주"],
  [/맞춰주/g, "맞춰 주"],
  [/드려요/g, "드려요"],
  [/해 드/g, "해 드"],
  [/(\S)ㆍ/g, "$1 ·"],
  [/ +([,.?!])/g, "$1"],
  [/([가-힣])([A-Za-z0-9])/g, "$1 $2"],
  [/([A-Za-z0-9])([가-힣])/g, "$1 $2"],
  [/ \n/g, "\n"],
  [/\n{3,}/g, "\n\n"],
  [/은\(는\)/g, "는"],
  [/를\(을\)/g, "를"],
  [/이\(가\)/g, "가"],
];

const WRONG_PARTICLE_PATTERNS = [
  { re: /([가-힣]{2,24})은(?=[^가-힣·]|$)/g, pick: pickTopicParticle, wrong: "은", alt: "는" },
  { re: /([가-힣]{2,24})는(?=[^가-힣·]|$)/g, pick: pickTopicParticle, wrong: "는", alt: "은" },
  { re: /([가-힣]{2,24})을(?=[^가-힣·]|$)/g, pick: pickObjectParticle, wrong: "을", alt: "를" },
  { re: /([가-힣]{2,24})를(?=[^가-힣·]|$)/g, pick: pickObjectParticle, wrong: "를", alt: "을" },
  { re: /([가-힣]{2,24})이(?=[^가-힣·]|$)/g, pick: pickSubjectParticle, wrong: "이", alt: "가" },
  { re: /([가-힣]{2,24})가(?=[^가-힣·]|$)/g, pick: pickSubjectParticle, wrong: "가", alt: "이" },
  { re: /([가-힣]{2,24})과(?=[^가-힣·]|$)/g, pick: pickConjunctionParticle, wrong: "과", alt: "와" },
  { re: /([가-힣]{2,24})와(?=[^가-힣·]|$)/g, pick: pickConjunctionParticle, wrong: "와", alt: "과" },
  { re: /([가-힣]{2,24})으로(?=[^가-힣·]|$)/g, pick: pickDirectionParticle, wrong: "으로", alt: "로" },
  { re: /([가-힣]{2,24})로(?=[^가-힣·]|$)/g, pick: pickDirectionParticle, wrong: "로", alt: "으로" },
];

/** 조사 오판 방지 — 동사·부사 어미 */
const JOSA_SKIP_SUFFIXES = [
  "해서",
  "하고",
  "이고",
  "이며",
  "이나",
  "이라",
  "이에",
  "에서",
  "에게",
  "까지",
  "부터",
  "처럼",
  "보다",
  "마다",
  "뿐",
  "만",
  "도",
  "요",
  "죠",
  "네",
  "다",
  "까",
];

function shouldSkipJosaNoun(noun = "") {
  const n = String(noun || "");
  if (n.length < 2) return true;
  for (const suf of JOSA_SKIP_SUFFIXES) {
    if (n.endsWith(suf)) return true;
  }
  return false;
}

function applyCompoundFixes(text = "") {
  let out = String(text || "");
  for (const [re, rep] of COMPOUND_JOSA_FIXES) {
    out = out.replace(re, rep);
  }
  return out;
}

function applyNikSpellingFixes(text = "") {
  let out = String(text || "");
  for (const [re, rep] of NIKL_SPELLING_FIXES) {
    out = out.replace(re, rep);
  }
  return out;
}

function fixHangulParticleAgreement(text = "") {
  let out = String(text || "");
  for (const rule of WRONG_PARTICLE_PATTERNS) {
    out = out.replace(rule.re, (full, noun, offset, whole) => {
      if (shouldSkipJosaNoun(noun)) return full;
      const correct = rule.pick(noun);
      const used = full.slice(noun.length);
      if (used === correct) return full;
      if (used !== rule.wrong) return full;
      return `${noun}${correct}`;
    });
  }
  return out;
}

function collectContextTokens(ctx = {}) {
  const tokens = new Set();
  const add = (raw) => {
    const t = String(raw || "").trim().slice(0, MAX_TOKEN_LEN);
    if (t.length >= 2) tokens.add(t);
    const parts = t.split(/[\s·/,-]+/).filter((p) => p.length >= 2);
    for (const p of parts) tokens.add(p.slice(0, MAX_TOKEN_LEN));
  };
  add(ctx.brandName);
  add(ctx.region);
  add(ctx.topic);
  add(ctx.mainKeyword);
  add(ctx.productName);
  return [...tokens];
}

/** 브랜드·지역·주제 등 고유명사 뒤 조사 */
export function fixTokenJosa(text = "", tokens = []) {
  if (!text || !tokens?.length) return String(text || "");
  let out = String(text).slice(0, MAX_TEXT_LEN);
  for (const token of tokens) {
    const t = String(token || "").trim().slice(0, MAX_TOKEN_LEN);
    if (t.length < 2) continue;
    const esc = escapeRegExp(t);
    const pairs = [
      ["은", "는", pickTopicParticle(t)],
      ["는", "은", pickTopicParticle(t)],
      ["을", "를", pickObjectParticle(t)],
      ["를", "을", pickObjectParticle(t)],
      ["이", "가", pickSubjectParticle(t)],
      ["가", "이", pickSubjectParticle(t)],
    ];
    for (const [a, b, correct] of pairs) {
      const wrong = correct === a ? b : a;
      out = out.replace(new RegExp(`${esc}${wrong}(?=[^가-힣·]|$)`, "g"), `${t}${correct}`);
    }
  }
  return out;
}

/** @deprecated alias — josaFix 호환 */
export function fixBrandJosa(text, brandName) {
  return fixTokenJosa(text, brandName ? [brandName] : []);
}

export function fixBrokenCompoundJosa(text = "") {
  return applyCompoundFixes(text);
}

/**
 * @param {string} text
 * @param {object} [ctx]
 * @param {"blog"|"place"|"instagram"} [channel]
 */
export function applyKoreanOrthographyToText(text = "", ctx = {}, channel = "blog") {
  if (!text) return "";
  let out = String(text).slice(0, MAX_TEXT_LEN);
  out = applyCompoundFixes(out);
  out = applyNikSpellingFixes(out);
  out = fixHangulParticleAgreement(out);
  out = fixTokenJosa(out, collectContextTokens(ctx));
  out = applyKoreanPolish(out, channel);
  out = applyNikSpellingFixes(out);
  out = fixHangulParticleAgreement(out);
  out = fixTokenJosa(out, collectContextTokens(ctx));
  return out.replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function scanWrongParticles(text = "", ctx = {}) {
  const hits = [];
  const sample = applyCompoundFixes(String(text || "").slice(0, MAX_TEXT_LEN));
  for (const rule of WRONG_PARTICLE_PATTERNS) {
    for (const m of sample.matchAll(rule.re)) {
      const noun = m[1];
      if (shouldSkipJosaNoun(noun)) continue;
      const used = m[0].slice(noun.length);
      const correct = rule.pick(noun);
      if (used !== correct) hits.push(`${noun}${used}->${noun}${correct}`);
    }
  }
  for (const token of collectContextTokens(ctx)) {
    const fixed = fixTokenJosa(sample, [token]);
    if (fixed !== sample) hits.push(`token_josa:${token}`);
  }
  for (const [re] of COMPOUND_JOSA_FIXES) {
    if (re.test(sample)) hits.push(re.source.slice(0, 24));
  }
  return [...new Set(hits)].slice(0, 12);
}

function scanSpellingIssues(text = "") {
  const hits = [];
  const sample = String(text || "");
  const checks = [
    [/안되[^뇨]/, "안_돼_띄어쓰기"],
    [/되요/, "돼요"],
    [/수있/, "수_있"],
    [/것같/, "것_같"],
    [/왠지/, "웬지"],
    [/브랜드은|매장는|이용를|쇼룸를/, "조사_오류"],
  ];
  for (const [re, label] of checks) {
    if (re.test(sample)) hits.push(label);
  }
  return hits;
}

/** 맞춤법·조사 감사 — 90점 이상 pass */
export function detectKoreanOrthographyIssues(text = "", ctx = {}) {
  const particleHits = scanWrongParticles(text, ctx);
  const spellingHits = scanSpellingIssues(text);
  const hits = [...particleHits, ...spellingHits];
  const score = Math.max(0, 100 - hits.length * 6);
  return {
    version: KOREAN_ORTHOGRAPHY_VERSION,
    ok: score >= KOREAN_ORTHOGRAPHY_PASS_SCORE,
    pass: score >= KOREAN_ORTHOGRAPHY_PASS_SCORE,
    score,
    hits,
    particleHits,
    spellingHits,
  };
}

export function scoreKoreanOrthography(text = "", ctx = {}) {
  const before = detectKoreanOrthographyIssues(text, ctx);
  const fixed = applyKoreanOrthographyToText(text, ctx);
  const after = detectKoreanOrthographyIssues(fixed, ctx);
  return {
    ...after,
    beforeScore: before.score,
    improved: after.score > before.score,
    fixedSample: fixed !== text,
  };
}

function mapBlogTextFields(pack, fn, ctx) {
  if (!pack) return pack;
  const title = fn(pack.representativeTitle || pack.title || "", ctx);
  return {
    ...pack,
    title,
    representativeTitle: title,
    titles: (pack.titles || []).map((t) => fn(t, ctx)),
    sections: (pack.sections || []).map((s) => ({
      ...s,
      heading: fn(s.heading || "", ctx),
      body: fn(s.body || "", ctx),
    })),
    conclusion: fn(pack.conclusion || "", ctx),
  };
}

export function applyKoreanOrthographyToBlogPack(pack, input = {}) {
  const ctx = { input, ...input };
  const next = mapBlogTextFields(
    pack,
    (t) => applyKoreanOrthographyToText(t, ctx, "blog"),
    ctx
  );
  const full = [
    next.title,
    ...(next.sections || []).flatMap((s) => [s.heading, s.body]),
    next.conclusion,
  ].join("\n");
  const audit = scoreKoreanOrthography(full, ctx);
  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      koreanOrthography: {
        version: KOREAN_ORTHOGRAPHY_VERSION,
        score: audit.score,
        pass: audit.pass,
        beforeScore: audit.beforeScore,
        hits: audit.hits?.slice(0, 8),
      },
    },
  };
}

export function applyKoreanOrthographyToChannelPack(pack, channel = "place", input = {}) {
  if (!pack) return pack;
  const ctx = { input, ...input };
  const ch = channel === "instagram" ? "instagram" : "place";
  const fix = (t) => applyKoreanOrthographyToText(t, ctx, ch);
  let next = { ...pack };

  if (channel === "place") {
    for (const key of ["title", "shortNotice", "shortBody", "detailBody", "cta", "body"]) {
      if (next[key]) next[key] = fix(next[key]);
    }
  } else if (channel === "instagram") {
    for (const key of ["hook", "body", "ending", "lineBreakBody", "legacyBody"]) {
      if (next[key]) next[key] = fix(next[key]);
    }
  }

  const audit = scoreKoreanOrthography(
    channel === "instagram"
      ? [next.hook, next.body, next.ending, next.lineBreakBody].filter(Boolean).join("\n")
      : [next.title, next.shortNotice, next.detailBody, next.body].filter(Boolean).join("\n"),
    ctx
  );

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      koreanOrthography: {
        version: KOREAN_ORTHOGRAPHY_VERSION,
        score: audit.score,
        pass: audit.pass,
        channel,
        hits: audit.hits?.slice(0, 6),
      },
    },
  };
}
