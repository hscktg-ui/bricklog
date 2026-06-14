/**
 * CHECKLIST VOICE — 「확인하세요」 슬롯 채우기 ≠ 사람 글 (Mission SSOT)
 */
import { splitKoreanSentences } from "@/lib/content/v2AxisSentencePrune";
import {
  CHECKLIST_TEMPLATE_RES,
  CONFIRM_ONLY_RES,
  FORBIDDEN_HEADING_SNIPPETS,
  REAL_FIELD_SMELL_RES,
} from "@/lib/product/checklistVoiceConstants";

export {
  CHECKLIST_TEMPLATE_RES,
  CONFIRM_ONLY_RES,
  FORBIDDEN_HEADING_SNIPPETS,
  REAL_FIELD_SMELL_RES,
};

function isMissionOn() {
  return process.env.BRICLOG_MISSION !== "false";
}

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

  if (templateHits >= 2) issues.push("checklist_template_high");
  if (confirmRatio >= 0.18) issues.push("confirm_sentence_flood");
  if (forbiddenHeadings >= 1) issues.push("checklist_voice");
  if (sectionCount > 6 && forbiddenHeadings >= 2) {
    issues.push("coverage_slot_dump");
  }
  if (templateHits >= 4) issues.push("checklist_voice");

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

export function headingHasChecklistForbiddenSnippet(heading = "") {
  const h = String(heading || "");
  return FORBIDDEN_HEADING_SNIPPETS.some((snippet) => h.includes(snippet));
}

const HEADING_REPLACEMENTS = [
  { snippet: "알아보게 된 이유", replacement: "처음 찾게 된 계기" },
  { snippet: "고를 때 체크 포인트", replacement: "고를 때 헷갈리는 부분" },
  { snippet: "비교 포인트", replacement: "비교하면서 본 차이" },
  { snippet: "확인할 것", replacement: "미리 본 점" },
  { snippet: "알아둘 것", replacement: "참고할 점" },
];

function topicLabel(input = {}) {
  return (
    String(input.topic || input.mainKeyword || input.main || "주제")
      .trim()
      .slice(0, 32) || "주제"
  );
}

/** @param {string} heading @param {object} [input] @param {number} [index] */
export function sanitizeChecklistForbiddenHeading(heading = "", input = {}, index = 0) {
  let h = String(heading || "").trim();
  for (const { snippet, replacement } of HEADING_REPLACEMENTS) {
    if (h.includes(snippet)) {
      h = h.replaceAll(snippet, replacement);
    }
  }
  h = h.replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").trim();
  if (headingHasChecklistForbiddenSnippet(h)) {
    const topic = topicLabel(input);
    const pool = [
      `${topic}, 처음 찾게 된 계기`,
      `${topic} — 직접 보면서 느낀 점`,
      `${topic} 고를 때 헷갈리는 부분`,
      "마무리",
    ];
    return pool[index % pool.length];
  }
  return h || poolFallbackHeading(input, index);
}

function poolFallbackHeading(input, index = 0) {
  const topic = topicLabel(input);
  const pool = [
    `${topic}, 처음 찾게 된 계기`,
    `${topic} — 직접 보면서 느낀 점`,
    "마무리",
  ];
  return pool[index % pool.length];
}

/** @param {object} pack @param {object} [input] */
export function sanitizeChecklistForbiddenHeadingsOnPack(pack, input = {}) {
  if (!pack?.sections?.length) return pack;
  const sections = (pack.sections || []).map((sec, i) => ({
    ...sec,
    heading: sanitizeChecklistForbiddenHeading(sec.heading, input, i),
  }));
  return {
    ...pack,
    sections,
    _meta: {
      ...(pack._meta || {}),
      checklistHeadingsSanitized: true,
    },
  };
}
