/**
 * AI PATTERN DETECTOR — AI 문체·클리셰 반복 차단
 */
import { getBlogFullText } from "@/utils/qualityCheck";
import { V4_AI_CLICHES } from "@/lib/quality/v4ContentAudit";
import { hasDuplicateSentences } from "@/utils/repetitionGuard";

export const AI_PATTERN_DETECTOR_VERSION = "v1";

/** 전역 금지 — 반복 발견 시 차단 */
export const GLOBAL_AI_PATTERN_PHRASES = [
  ...V4_AI_CLICHES,
  "검색만 하다 보면",
  "기준이 많아서",
  "막히는 날이 있다",
  "퇴근길에 문득",
  "주말 아침 테이블",
  "기념일을 깜빡했다",
  "종합적으로 보면",
  "많은 분들이",
  "도움이 되시길",
  "한눈에 정리",
  "꼼꼼히 살펴보",
];

const ENCYCLOPEDIA_RES = [
  /란\s*무엇인가/,
  /의\s*정의/,
  /역사와\s*배경/,
  /특징과\s*장점/,
  /종류와\s*분류/,
];

export function detectAiWritingPatterns(pack, input = {}) {
  const text = getBlogFullText(pack);
  const hits = [];

  for (const phrase of GLOBAL_AI_PATTERN_PHRASES) {
    if (text.includes(phrase)) {
      hits.push({ type: "ai_cliche", phrase });
    }
  }

  for (const re of ENCYCLOPEDIA_RES) {
    if (re.test(text)) hits.push({ type: "encyclopedia_voice", pattern: re.source });
  }

  if (hasDuplicateSentences(text)) {
    hits.push({ type: "sentence_repeat", phrase: "(duplicate sentences)" });
  }

  const uniqueTypes = new Set(hits.map((h) => h.type));
  const block =
    hits.filter((h) => h.type === "ai_cliche").length >= 2 ||
    uniqueTypes.has("encyclopedia_voice") ||
    uniqueTypes.has("sentence_repeat");

  return {
    version: AI_PATTERN_DETECTOR_VERSION,
    ok: !block,
    hits,
    count: hits.length,
    block,
    reasons: block ? ["ai_pattern_detected"] : [],
  };
}

export function buildAiPatternForbiddenBrief() {
  return [
    "【AI 문체 금지 · AI PATTERN DETECTOR】",
    "검색결과 요약·백과사전 문체·감성 클리셰 반복 금지.",
    `금지 예: ${GLOBAL_AI_PATTERN_PHRASES.slice(0, 6).join(" · ")} …`,
  ].join("\n");
}
