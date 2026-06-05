/**
 * EDITOR HUMANIZATION ENGINE — 정보 나열·AI 안내 문장 제거, 경험 흐름 유지
 * 상황 → 현장 경험 → 느낀 점 → 정보 확인 → 비교 기준 → 결론
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import { isBriclogMissionEnforced } from "@/lib/product/missionFlags";
import { deriveTopicWritingContext } from "@/lib/content/topicFacetEngine";

export const EDITOR_HUMANIZATION_ENGINE_VERSION = "v1";

function re(source, flags = "") {
  return new RegExp(source, flags);
}

/** 발견 즉시 제거 — AI 안내·메타 문장 (사용자 SSOT) */
export const EDITOR_HUMANIZATION_FORBIDDEN_RES = [
  re("본인\\s*일정[·・]?예산에\\s*맞춰"),
  re("입력[·・]?공개\\s*맥락을?\\s*바탕으로"),
  re("검색[·・]?조사용\\s*단서"),
  re("확인\\s*가능한\\s*범위(?:에서|만)?"),
  re("운영\\s*포인트"),
  re("안내\\s*기준으로"),
  re("매장[·・]?공식\\s*안내\\s*기준"),
  re("공식[·・]?매장\\s*안내\\s*기준"),
  re("방문[·・]?예약\\s*안내\\s*기준"),
  re("과장\\s*없이\\s*매장"),
  re("이용\\s*절차[·・]?대기"),
  re("비교할\\s*때\\s*가격[·・]조건"),
  re("표로\\s*정리"),
  re("체크리스트(?:로)?\\s*삼"),
  re("확인하세요"),
  re("권(?:합)?니다"),
  re("필요합니다\\.?$"),
  re("좋습니다\\.?$"),
  re("중요합니다\\.?$"),
  re("본\\s*톤·연출"),
  re("기능\\s*단정\\s*없이"),
  re("인기를\\s*끌고\\s*있다"),
  re("알려져\\s*있다"),
  re("매장는"),
  re("\\.라는\\s*설명"),
  re("이\\s*주제(?!를)"),
];

/** 선언형 조언 — 「~하는 것이 중요/좋습니다」 */
export const EDITOR_HUMANIZATION_DECLARATIVE_RES = [
  re("(?:하는|할)\\s*것이\\s*(?:중요|좋)(?:습니다|어요|다)"),
  re("확인(?:하는|해\\s*보는)\\s*것이\\s*(?:중요|좋|필요)"),
  re("기준으로\\s*확인(?:하는|해\\s*보는)\\s*것"),
  re("현장\\s*조명\\s*기준으로\\s*확인"),
  re("(?:방문|상담)\\s*전에\\s*먼저\\s*볼\\s*것"),
  re("(?:이용|체험)\\s*전에\\s*알아둘\\s*것"),
];

/** 경험 smell — Human Belief·현장 톤 가점 */
export const EDITOR_HUMANIZATION_EXPERIENCE_RES = [
  re("처음|막상|누워\\s*보|앉아\\s*보|생각보다|사진에서는|실제로\\s*보"),
  re("그런데|보니|느껴|달랐|솔직히|헷갈"),
  re("직접\\s*(?:가|방문|다녀|들어|확인|물어)"),
  re("메모(?:해|한)"),
];

const ARC_ROLE_MARKERS = {
  situation: [re("처음|요즘|알아보면|찾게\\s*된|계기|고민|올려")],
  field: [re("직접|다녀|들어가|누워|쇼룸|매장에|현장|한\\s*바퀴")],
  feeling: [re("느껴|생각보다|달랐|막상|보니|차분|밝")],
  info: [re("메모|확인했|들었|안내|짚")],
  compare: [re("비교|기준|차이|놓고\\s*보")],
  conclusion: [re("정리하면|마지막|돌아오|집에서\\s*다시")],
};

export const EDITOR_HUMANIZATION_BRIEF = `브릭로그는 정보를 나열하지 않는다. 사람이 실제로 경험했을 법한 흐름으로 재구성한다.
금지: 본인 일정·예산에 맞춰… / 입력·공개 맥락… / 검색·조사용 단서 / 확인 가능한 범위 / 운영 포인트 / 안내 기준으로 / ~하는 것이 중요합니다.
순서: 상황 → 현장 경험 → 느낀 점 → 정보 확인 → 비교 기준 → 결론.
독자가 「나도 가봐야겠다」가 목표. 「체크리스트 같네」면 실패.`;

export function isEditorHumanizationForbiddenSentence(text = "") {
  const t = String(text || "").trim();
  if (!t || t.replace(/\s/g, "").length < 8) return false;
  return EDITOR_HUMANIZATION_FORBIDDEN_RES.some((rx) => rx.test(t));
}

export function isEditorHumanizationDeclarativeAdvice(text = "") {
  const t = String(text || "").trim();
  if (!t || t.replace(/\s/g, "").length < 10) return false;
  if (EDITOR_HUMANIZATION_EXPERIENCE_RES.some((rx) => rx.test(t))) return false;
  return EDITOR_HUMANIZATION_DECLARATIVE_RES.some((rx) => rx.test(t));
}

function arcRoleHit(text, role) {
  const markers = ARC_ROLE_MARKERS[role] || [];
  return markers.some((rx) => rx.test(String(text || "")));
}

/**
 * @param {string} text
 * @param {{ keepDeclarativeInOpening?: boolean }} [opts]
 */
export function stripEditorHumanizationSentences(text = "", opts = {}) {
  const keepOpening = opts.keepDeclarativeInOpening === true;
  const sentences = splitKoreanSentences(text);
  const kept = [];
  let idx = 0;
  for (const s of sentences) {
    const t = s.trim();
    if (t.replace(/\s/g, "").length < 8) continue;
    if (isEditorHumanizationForbiddenSentence(t)) continue;
    if (!keepOpening || idx > 0) {
      if (isEditorHumanizationDeclarativeAdvice(t)) continue;
    }
    kept.push(t);
    idx += 1;
  }
  return kept.join(" ").trim();
}

function stripParagraphBlock(body = "", sectionIdx = 0) {
  const paras = String(body || "")
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const kept = [];
  for (const para of paras) {
    const cleaned = stripEditorHumanizationSentences(para, {
      keepDeclarativeInOpening: sectionIdx === 0,
    });
    if (cleaned.replace(/\s/g, "").length >= 12) kept.push(cleaned);
  }
  return kept.join("\n\n").trim();
}

/**
 * @param {string} fullText
 */
export function scoreEditorHumanization(fullText = "") {
  const text = String(fullText || "");
  const forbiddenHits = [];
  const declarativeHits = [];

  for (const s of splitKoreanSentences(text)) {
    const t = s.trim();
    if (t.replace(/\s/g, "").length < 8) continue;
    if (isEditorHumanizationForbiddenSentence(t)) forbiddenHits.push(t.slice(0, 48));
    if (isEditorHumanizationDeclarativeAdvice(t)) declarativeHits.push(t.slice(0, 48));
  }

  const roles = Object.keys(ARC_ROLE_MARKERS).filter((role) => arcRoleHit(text, role));
  const experienceHits = EDITOR_HUMANIZATION_EXPERIENCE_RES.filter((rx) => rx.test(text)).length;

  const issues = [];
  if (forbiddenHits.length) issues.push(`forbidden:${forbiddenHits.length}`);
  if (declarativeHits.length >= 3) issues.push(`declarative:${declarativeHits.length}`);
  if (roles.length < 3) issues.push(`arc_thin:${roles.length}`);
  if (experienceHits < 1) issues.push("experience_thin");

  const penalty =
    forbiddenHits.length * 18 +
    Math.max(0, declarativeHits.length - 1) * 8 +
    (roles.length < 3 ? 12 : 0) +
    (experienceHits < 1 ? 10 : 0);

  const score = Math.max(0, 100 - penalty);
  return {
    ok: forbiddenHits.length === 0 && declarativeHits.length < 4 && roles.length >= 2,
    score,
    issues,
    forbiddenHits: forbiddenHits.length,
    declarativeHits: declarativeHits.length,
    arcRoles: roles,
    experienceMarkers: experienceHits,
  };
}

export function buildEditorHumanizationPromptBlock() {
  if (!isBriclogMissionEnforced()) return "";
  return `【EDITOR HUMANIZATION ENGINE ${EDITOR_HUMANIZATION_ENGINE_VERSION}】\n${EDITOR_HUMANIZATION_BRIEF}`;
}

/**
 * @param {object} pack
 * @param {object} input
 */
export function applyEditorHumanizationPack(pack, input = {}) {
  if (!isBriclogMissionEnforced() || !pack?.sections?.length) return pack;
  if (pack._meta?.editorHumanization) return pack;

  const sections = (pack.sections || []).map((sec, idx) => ({
    ...sec,
    heading: stripEditorHumanizationSentences(String(sec.heading || "")),
    body: stripParagraphBlock(sec.body, idx),
  }));

  let next = {
    ...pack,
    sections: sections.filter((s) => String(s.body || "").replace(/\s/g, "").length >= 20),
    intro: pack.intro ? stripParagraphBlock(pack.intro, 0) : pack.intro,
    conclusion: pack.conclusion
      ? stripParagraphBlock(pack.conclusion, sections.length)
      : pack.conclusion,
  };

  const full = getBlogFullText(next);
  const humanScore = scoreEditorHumanization(full);
  const p = deriveTopicWritingContext(input);

  return {
    ...next,
    _meta: {
      ...(next._meta || {}),
      editorHumanization: true,
      editorHumanizationScore: humanScore.score,
      editorHumanizationOk: humanScore.ok,
      editorHumanizationIssues: humanScore.issues,
    },
  };
}
