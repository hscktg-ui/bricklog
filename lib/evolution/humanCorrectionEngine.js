/**
 * HUMAN CORRECTION ENGINE — 수정 전·후 비교 → 다음 생성 가중치
 */

const AD_MARKERS = /압도적|지금\s*바로|놓치지|최고의\s*선택|완벽한|무조건|100%|완치/g;
const INFO_MARKERS = /확인|기준|성분|보관|방문|문의|선택|비교|주의|안내/g;
const REPEAT_MARKERS = /확인해\s*확인|메모\s*\d|번째로\s*다시|당일\s*상담/g;

function countMatches(text, re) {
  return (String(text || "").match(re) || []).length;
}

/**
 * @param {string} beforePlain
 * @param {string} afterPlain
 */
export function analyzeHumanCorrection(beforePlain = "", afterPlain = "") {
  const before = String(beforePlain || "");
  const after = String(afterPlain || "");
  if (!after || before === after) {
    return { changed: false, deltas: [], preferences: {} };
  }

  const deltas = [];
  const preferences = {
    informational: 50,
    adTone: 50,
    examples: 50,
    repetitionGuard: 50,
  };

  const adBefore = countMatches(before, AD_MARKERS);
  const adAfter = countMatches(after, AD_MARKERS);
  if (adBefore > adAfter) {
    deltas.push({ type: "ad_removed", detail: "광고·과장 문장 삭제" });
    preferences.adTone = 20;
    preferences.informational = 78;
  }

  const infoBefore = countMatches(before, INFO_MARKERS);
  const infoAfter = countMatches(after, INFO_MARKERS);
  if (infoAfter > infoBefore + 1) {
    deltas.push({ type: "info_added", detail: "정보·안내 문장 추가" });
    preferences.informational = 90;
  }

  const repBefore = countMatches(before, REPEAT_MARKERS);
  const repAfter = countMatches(after, REPEAT_MARKERS);
  if (repBefore > repAfter) {
    deltas.push({ type: "repetition_removed", detail: "반복·패딩 문장 삭제" });
    preferences.repetitionGuard = 92;
  }

  if (after.length < before.length * 0.85) {
    deltas.push({ type: "shortened", detail: "분량 축소 — 밀도 우선" });
    preferences.informational = Math.max(preferences.informational, 72);
  }

  return {
    changed: deltas.length > 0,
    deltas,
    preferences,
    failureSignal: deltas.length > 0,
    failureReasons: deltas.map((d) => d.type),
  };
}

export function loadHumanCorrectionBriefFromBrand(brandMemory = {}) {
  const prefs = brandMemory?.humanCorrectionPrefs;
  if (!prefs) return "";
  const lines = [];
  if (prefs.informational >= 75) lines.push("정보성 가중치 상승");
  if (prefs.adTone <= 30) lines.push("광고 톤 가중치 하향");
  if (prefs.repetitionGuard >= 80) lines.push("반복 차단 강화");
  if (prefs.examples >= 70) lines.push("사례·근거 가중치 상승");
  if (!lines.length) return "";
  return ["【사용자 수정 학습】", ...lines.map((l) => `- ${l}`)].join("\n");
}

export function formatHumanCorrectionBrief(analysis = {}) {
  if (!analysis.changed) return "";
  const lines = analysis.deltas.map((d) => d.detail);
  const prefs = [];
  if (analysis.preferences.informational >= 75) prefs.push("정보성 가중치 상승");
  if (analysis.preferences.adTone <= 30) prefs.push("광고 톤 가중치 하향");
  if (analysis.preferences.repetitionGuard >= 80) prefs.push("반복 차단 강화");
  return [
    "【수정 학습】",
    ...lines.map((l) => `- ${l}`),
    prefs.length ? `다음 생성: ${prefs.join(" · ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}
