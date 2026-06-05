/**
 * CHECKLIST VOICE — 「확인하세요」 슬롯 채우기 ≠ 사람 글 (Mission SSOT)
 */
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";

function isMissionOn() {
  return process.env.BRICLOG_MISSION !== "false";
}

const FORBIDDEN_HEADING_SNIPPETS = [
  "브랜드 이해",
  "제품군",
  "라인업",
  "비교 포인트",
  "행사·기간",
  "설치 안내",
  "AS 안내",
  "A/S 안내",
  "체크리스트",
  "FAQ",
  "확인할 것",
  "알아둘 것",
];

/** coverage 슬롯·안내 문서 전형 문장 */
export const CHECKLIST_TEMPLATE_RES = [
  /확인되지\s*않은\s*(?:수치|스펙|효과|가격)/,
  /단정하지\s*말고\s*안내\s*가능\s*범위/,
  /공식(?:\s*·|\s*)?매장\s*(?:채널|안내)/,
  /매장·공식\s*안내/,
  /견적서(?:로)?\s*(?:받|확인|요청)/,
  /항목별로\s*분리(?:해)?\s*요청/,
  /상담\s*전에\s*목록(?:으로)?\s*정리/,
  /방문·상담\s*때\s*확인/,
  /이용\s*전에\s*먼저\s*볼\s*것/,
  /비교\s*포인트$/,
  /브랜드\s*시선에서\s*정리/,
  /흐름이\s*분명해집니다/,
  /누락을\s*줄일\s*수\s*있습니다/,
  /보시길\s*권(?:합)?니다/,
  /체험\s*전\s*알아둘\s*것/,
  /공식·매장\s*안내\s*기준/,
  /방문·예약\s*안내/,
  /방문\s*전(?:에|에는)\s*(?:영업|주차|예약|전화)/,
  /비교할\s*때\s*가격·조건/,
  /상담\s*전에\s*궁금/,
  /이용\s*절차·대기/,
  /표로\s*정리/,
  /과장\s*없이\s*매장·공식\s*안내/,
  /다른\s*브랜드(?:와|과)?\s*비교/,
  /놓치지\s*마세요/,
  /재방문\s*상담/,
  /당일\s*기준/,
  /도\s*매장에서\s*들었어요/,
  /예산·일정·이용\s*목적을\s*적어/,
];

/** 「확인하세요」류 — field smell로 세면 안 됨 */
export const CONFIRM_ONLY_RES = [
  /확인(?:하세요|해\s*주세요|하는\s*것이\s*좋습니다|해\s*두세요)$/,
  /문의(?:하세요|해\s*주세요)$/,
  /권(?:합)?니다\.?$/,
  /필요합니다\.?$/,
  /좋습니다\.?$/,
];

/** 실제 현장·경험 smell — Human Belief 가점용 */
export const REAL_FIELD_SMELL_RES = [
  /직접\s*(?:가|방문|물어|체험|누워|앉아|확인|문의|미팅|보)/,
  /누워\s*보/,
  /(?:허리|어깨|목).{0,8}(?:아|불편|뻐)/,
  /왜.{0,32}(?:바꾸|고민|찾)/,
  /헷갈/,
  /(?:3|4|5|6|7|8|9|10|11|12)월(?:까지)?/,
  /\d+분\s*이상/,
  /메모(?:해|한)/,
  /(?:행사|프로모).{0,12}(?:까지|기간)/,
];

export function isChecklistVoiceEnforced() {
  return isMissionOn();
}

/**
 * @param {string} fullText
 * @param {object} [pack]
 */
export function scoreChecklistVoice(fullText, pack = null) {
  if (!isChecklistVoiceEnforced()) {
    return { ok: true, score: 0, templateHits: 0, confirmRatio: 0, issues: [] };
  }
  const text = String(fullText || "");
  const issues = [];
  let templateHits = 0;
  for (const re of CHECKLIST_TEMPLATE_RES) {
    const m = text.match(new RegExp(re.source, re.flags + "g"));
    if (m) templateHits += m.length;
  }

  const sentences = splitKoreanSentences(text).filter(
    (s) => s.replace(/\s/g, "").length >= 10
  );
  let confirmEnds = 0;
  for (const s of sentences) {
    if (CONFIRM_ONLY_RES.some((re) => re.test(s.trim()))) confirmEnds += 1;
  }
  const confirmRatio =
    sentences.length > 0 ? confirmEnds / sentences.length : 0;

  const sectionCount = pack?.sections?.length || 0;
  const forbiddenHeadings = (pack?.sections || []).filter((s) => {
    const h = String(s?.heading || "");
    return FORBIDDEN_HEADING_SNIPPETS.some((p) => h.includes(p));
  }).length;

  if (templateHits >= 3) issues.push("checklist_template_high");
  if (confirmRatio >= 0.22) issues.push("confirm_sentence_flood");
  if (sectionCount > 6 && forbiddenHeadings >= 2) {
    issues.push("coverage_slot_dump");
  }
  if (templateHits >= 6) issues.push("checklist_voice");

  const ok = issues.length === 0;
  return {
    ok,
    score: templateHits + Math.round(confirmRatio * 20) + forbiddenHeadings * 2,
    templateHits,
    confirmRatio,
    forbiddenHeadings,
    sectionCount,
    issues,
  };
}

export function isChecklistInstructionSentence(s) {
  const t = String(s || "").trim();
  if (!t || t.replace(/\s/g, "").length < 8) return false;
  if (CONFIRM_ONLY_RES.some((re) => re.test(t))) return true;
  if (CHECKLIST_TEMPLATE_RES.some((re) => re.test(t))) return true;
  return /(?:하세요|해\s*주세요|해\s*두세요|권(?:합)?니다|필요합니다|알아두(?:세요|면)|정리해\s*두세요)\.?$/i.test(
    t
  );
}

export function buildChecklistVoicePromptBlock() {
  return `【CHECKLIST VOICE 금지】
정보 영역 20개를 소제목·섹션으로 찍어내지 말 것.
「확인하세요」「견적서로 받으세요」「단정하지 말고」 문장 반복 금지.
조사한 팩트를 한 편의 칼럼 흐름(문제→이유→비교→브랜드→정리)에 녹일 것.`;
}
