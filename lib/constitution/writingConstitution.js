/**
 * BRICLOG Writing Constitution — 생성·검수의 최상위 규칙
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { hasMechanicalKeywordPattern } from "@/lib/keywords/naturalKeywordWeave";
import { evaluateHumanTemperature } from "@/lib/content/humanTemperature";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";

/** RULE 9 — 소제목 나열 금지 */
export const BANNED_SECTION_HEADINGS = [
  "왜 사람들이 이걸 찾을까",
  "왜 사람들이 찾을까",
  "직접 써보면 어떤 점이 다를까",
  "직접 써보면",
  "선택 전에 알아두면 좋은 점",
  "알아두면 좋은 점",
  "처음 방문할 때 헷갈리는 부분",
  "이런 날에 특히 필요해진다",
  "이 브랜드를 떠올리게 된 이유",
  "방문 전에 참고할 점",
  "비교할 때",
  "정리",
  "체크",
];

/** RULE 6 — 광고문 */
export const AD_BANNED_PHRASES = [
  "최고",
  "최상",
  "압도적",
  "국내유일",
  "국내 유일",
  "강력추천",
  "강력 추천",
  "품격있는",
  "품격 있는",
  "압도",
  "1등",
  "무조건",
  "완벽한",
  "최적의",
  "혁신적인",
];

/** RULE 7 — 장면 시드 */
export const SCENE_MOMENT_SEEDS = [
  "퇴근길",
  "비 오는 날",
  "주말 아침",
  "거실",
  "기념일",
  "약속",
  "집들이",
  "창밖",
  "늦은 시간",
  "갑자기",
  "퇴근 후",
  "빈 화병",
  "문을 열고",
  "아이를",
  "재운 후",
];

/** RULE 1 — 정보·키워드 도입 금지 */
const FORBIDDEN_OPENERS = [
  /^오늘은\s/,
  /^소개/,
  /^이번\s*글/,
  /^[\w가-힣]+\s*(꽃집|카페|병원|매장)은/,
  /^[\w가-힣]+\s*에서\s*[\w가-힣]+\s*(을|를)\s*찾/,
  /키워드로\s*검색/,
  /^[\w가-힣]+\s*키워드/,
  /^[\w가-힣]+\s*을\s*찾을\s*때/,
];

const EMOTION_MARKERS =
  /느껴|마음|부담|편해|아쉬|기분|공감|그날|순간|떠올|조용|따뜻|허해|급해|맞아|나도/;

const WHY_MARKERS =
  /이유|다시|추천|들러|방문|찾아|왜|때문|재방문|구매|기억|선택/;

const INDUSTRY_ONLY = [
  /꽃집은\s+꽃을\s+판다/,
  /카페는\s+커피를\s+판다/,
  /병원은\s+진료한다/,
  /지역\s*소개만/,
  /업종\s*설명/,
];

const KEYWORD_VISIBLE = [
  /메인\s*키워드/,
  /서브\s*키워드/,
  /SEO/,
  /검색량/,
  /키워드로\s*찾/,
  /키워드로\s*검색/,
  /'[^']+'\s*키워드/,
];

export const CONSTITUTION_MIN_SCENES = 3;
export const CONSTITUTION_MIN_BRAND_MENTIONS = 3;

export function isBannedHeading(heading) {
  const h = String(heading || "").trim();
  return BANNED_SECTION_HEADINGS.some(
    (b) => h === b || h.includes(b) || b.includes(h)
  );
}

export function headingFromMoment(line, maxLen = 32) {
  const s = String(line || "")
    .split(/[.!?…]/)[0]
    ?.replace(/\s+/g, " ")
    ?.trim();
  if (!s || s.length < 10) return null;
  if (s.length <= maxLen) return s;
  const cut = s.slice(0, maxLen);
  const sp = cut.lastIndexOf(" ");
  return (sp > 12 ? cut.slice(0, sp) : cut) + "…";
}

export function countSceneMoments(text) {
  const t = String(text || "");
  const found = new Set();
  for (const seed of SCENE_MOMENT_SEEDS) {
    if (t.includes(seed)) found.add(seed);
  }
  return found.size;
}

export function countBrandMentions(text, brandName) {
  if (!brandName || brandName.length < 2) return 0;
  const re = new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (text.match(re) || []).length;
}

export function hasAdTone(text) {
  const t = String(text || "");
  return AD_BANNED_PHRASES.some((p) => t.includes(p));
}

export function hasVisibleKeyword(text, mainKeyword) {
  const t = String(text || "");
  if (KEYWORD_VISIBLE.some((re) => re.test(t))) return true;
  if (hasMechanicalKeywordPattern(t)) return true;
  if (!mainKeyword || mainKeyword.length < 3) return false;
  const esc = mainKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = t.match(new RegExp(esc, "gi")) || [];
  if (matches.length > 7) return true;
  const blocks = t.split(/\n\n+/);
  for (const block of blocks) {
    const n = (block.match(new RegExp(esc, "gi")) || []).length;
    if (n >= 2 && block.length < 200) return true;
  }
  return false;
}

export function hasForbiddenOpener(pack) {
  const first = pack?.sections?.[0]?.body || "";
  const para = first.split(/\n\n+/)[0] || first;
  const sentence = para.split(/(?<=[.!?…])\s+/)[0]?.trim() || para;
  return FORBIDDEN_OPENERS.some((re) => re.test(sentence));
}

export function hasRepeatedMeaning(text, minLen = 20) {
  if (hasDuplicateSentences(text, minLen)) return true;
  const chunks = String(text || "")
    .split(/[.!?…]\s+|\n+/)
    .map((s) => s.trim().replace(/\s/g, ""))
    .filter((s) => s.length >= minLen);
  for (let i = 0; i < chunks.length; i++) {
    for (let j = i + 1; j < chunks.length; j++) {
      const a = chunks[i];
      const b = chunks[j];
      if (a === b) return true;
      if (a.length >= 28 && b.includes(a.slice(0, 28))) return true;
      if (b.length >= 28 && a.includes(b.slice(0, 28))) return true;
    }
  }
  return false;
}

export function evaluateWritingConstitution(pack, ctx = {}, channel = "blog") {
  const full =
    channel === "blog"
      ? getBlogFullText(pack)
      : [pack?.title, pack?.shortBody, pack?.detailBody, pack?.hook, pack?.body, pack?.ending]
          .filter(Boolean)
          .join("\n");

  const brand = ctx.brandName?.trim();
  const main = ctx.main || ctx.mainKeyword || "";

  const checks = {
    sceneMoments: countSceneMoments(full) >= CONSTITUTION_MIN_SCENES,
    emotion: EMOTION_MARKERS.test(full),
    brand:
      !brand || countBrandMentions(full, brand) >= CONSTITUTION_MIN_BRAND_MENTIONS,
    why: WHY_MARKERS.test(full),
    human:
      !hasAdTone(full) &&
      evaluateHumanTemperature(full, channel).ok &&
      !INDUSTRY_ONLY.some((re) => re.test(full)),
    noBannedHeadings:
      channel !== "blog" ||
      !(pack?.sections || []).some((s) => isBannedHeading(s.heading)),
    noVisibleKeyword: !hasVisibleKeyword(full, main),
    noForbiddenOpen: channel !== "blog" || !hasForbiddenOpener(pack),
    noRepeat: !hasRepeatedMeaning(full),
  };

  const failures = [];
  if (!checks.sceneMoments) failures.push("scenes");
  if (!checks.emotion) failures.push("emotion");
  if (!checks.brand) failures.push("brand");
  if (!checks.why) failures.push("why");
  if (!checks.human) failures.push("human");
  if (!checks.noBannedHeadings) failures.push("banned_heading");
  if (!checks.noVisibleKeyword) failures.push("visible_keyword");
  if (!checks.noForbiddenOpen) failures.push("bad_opener");
  if (!checks.noRepeat) failures.push("repeat_meaning");

  return { ok: failures.length === 0, checks, failures, fullText: full };
}

export function stripAdPhrases(text) {
  let s = String(text || "");
  for (const p of AD_BANNED_PHRASES) {
    s = s.replace(new RegExp(p, "g"), "");
  }
  return s.replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export function rewriteBannedHeading(heading, fallbackBody) {
  if (!isBannedHeading(heading)) return heading;
  return headingFromMoment(fallbackBody) || "그날의 이야기";
}

/** RULE 8 — 설명형을 장면형으로 (일부 패턴) */
export function softenExplainPatterns(text) {
  return String(text || "")
    .replace(/24\s*시간\s*운영/g, "늦은 밤에도 불이 켜져 있는")
    .replace(/24시간\s*운영/g, "늦은 밤에도 들를 수 있는")
    .replace(/무인\s*운영/g, "직원 없이 고르는")
    .replace(/무인으로\s*운영/g, "직원 없이 고르는");
}

export function applyConstitutionToBlogPack(pack, ctx = {}) {
  if (!pack) return pack;

  const extraScenes = pickExtraSceneLines(ctx, 2);
  let sections = (pack.sections || []).map((sec, idx) => {
    let heading = rewriteBannedHeading(sec.heading, sec.body);
    let body = softenExplainPatterns(stripAdPhrases(sec.body));
    if (idx === 1 && extraScenes[0] && !body.includes(extraScenes[0].slice(0, 8))) {
      body = `${extraScenes[0]}\n\n${body}`;
    }
    if (idx === 2 && extraScenes[1] && !body.includes(extraScenes[1].slice(0, 8))) {
      body = `${extraScenes[1]}\n\n${body}`;
    }
    return { heading, body };
  });

  let conclusion = softenExplainPatterns(
    stripAdPhrases(pack.conclusion || "")
  );

  const title = stripAdPhrases(
    pack.representativeTitle || pack.title || ""
  );

  return {
    ...pack,
    title,
    representativeTitle: title,
    sections,
    conclusion,
    _meta: {
      ...pack._meta,
      writingConstitution: true,
    },
  };
}

function pickExtraSceneLines(ctx, n = 2) {
  const pool = [
    "퇴근길에 지나가다 문득 떠올랐어요.",
    "비 오는 날, 거실만 유난히 조용했습니다.",
    "주말 아침, 테이블 위가 비어 보이는 날이 있어요.",
    "갑자기 잡힌 약속, 머릿속이 먼저 바빠질 때.",
    "집들이 전날, 분위기부터 챙기고 싶어지는 순간.",
    "기념일을 깜빡했다는 걸, 저녁에야 알게 될 때.",
  ];
  const seed = (ctx.region || "").length + (ctx.topic || "").length;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(pool[(seed + i * 3) % pool.length]);
  }
  return out;
}
