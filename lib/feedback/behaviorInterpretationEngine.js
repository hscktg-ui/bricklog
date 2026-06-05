/**
 * STEP 17-1 — BEHAVIOR INTERPRETATION ENGINE (v6.2)
 * 사용자가 말한 것보다 행동(복사·발행·재생성·체류)을 더 신뢰한다.
 */

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function countEvents(events = [], pattern) {
  return events.filter((e) => pattern.test(String(e.event_type || ""))).length;
}

/**
 * @param {Array<{ event_type?: string, meta?: object }>} events
 * @param {{ reaction?: string, tags?: string[] }} [feedback]
 */
export function interpretContentBehavior(events = [], feedback = null) {
  const copies =
    countEvents(events, /copy/) +
    countEvents(events, /download/);
  const rewrites = countEvents(events, /rewrite/);
  const saves = countEvents(events, /save/);
  const deletes = countEvents(events, /delete/);

  const dwellSeconds = events.reduce(
    (max, e) => Math.max(max, Number(e.meta?.dwell_seconds || e.meta?.dwellSeconds || 0)),
    0
  );

  let satisfaction = 50;
  const signals = [];

  if (copies > 0) {
    satisfaction += 22;
    signals.push("copy_or_download");
  }
  if (saves > 0) {
    satisfaction += 8;
    signals.push("save");
  }
  if (rewrites >= 5) {
    satisfaction -= 22;
    signals.push("rewrite_heavy");
  } else if (rewrites >= 2) {
    satisfaction -= 12;
    signals.push("rewrite_moderate");
  }
  if (deletes > 0) {
    satisfaction -= 18;
    signals.push("delete");
  }

  if (dwellSeconds >= 120) {
    satisfaction += 15;
    signals.push("dwell_long");
  } else if (dwellSeconds >= 30) {
    satisfaction += 6;
    signals.push("dwell_ok");
  } else if (dwellSeconds > 0 && dwellSeconds < 5) {
    satisfaction -= 12;
    signals.push("dwell_bounce");
  }

  const reaction = feedback?.reaction;
  if (reaction === "good") satisfaction += 12;
  else if (reaction === "bad") satisfaction -= 18;
  else if (reaction === "neutral") satisfaction -= 2;

  const tags = feedback?.tags || [];
  if (tags.includes("too_ad")) satisfaction -= 8;
  if (tags.includes("too_ai") || tags.includes("gpt_tone")) satisfaction -= 10;
  if (tags.includes("low_info")) satisfaction -= 6;
  if (tags.includes("brand_weak")) satisfaction -= 5;

  // v6.2 — 좋아요만 있고 복사·발행 없으면 실질 만족도 낮음
  if (reaction === "good" && copies === 0 && saves === 0) {
    satisfaction -= 10;
    signals.push("praise_without_action");
  }

  satisfaction = clamp(satisfaction);

  const preferences = deriveBehaviorPreferences(satisfaction, tags, signals);

  return {
    satisfaction,
    signals,
    preferences,
    metrics: { copies, rewrites, saves, deletes, dwellSeconds },
    trustWeight: satisfaction >= 70 ? "high" : satisfaction >= 45 ? "medium" : "low",
  };
}

function deriveBehaviorPreferences(satisfaction, tags = [], signals = []) {
  const prefs = {
    informational: 50,
    adTone: 50,
    brandVoice: 50,
    fieldScene: 50,
  };

  if (tags.includes("too_ad")) prefs.adTone = 15;
  if (tags.includes("too_ai") || tags.includes("gpt_tone")) prefs.informational = 85;
  if (tags.includes("low_info")) prefs.informational = 90;
  if (tags.includes("brand_weak")) prefs.brandVoice = 88;
  if (tags.includes("seo_weak")) prefs.fieldScene = 82;

  if (signals.includes("copy_or_download") && satisfaction >= 65) {
    prefs.informational = Math.max(prefs.informational, 70);
    prefs.fieldScene = Math.max(prefs.fieldScene, 65);
  }
  if (signals.includes("rewrite_heavy")) {
    prefs.informational = Math.max(prefs.informational, 75);
    prefs.adTone = Math.min(prefs.adTone, 35);
  }

  return prefs;
}

/**
 * @param {object} feedback
 * @param {Array} events
 */
export function buildBehaviorInterpretationBrief(feedback = {}, events = []) {
  const result = interpretContentBehavior(events, feedback);
  if (!events.length && !feedback?.reaction) return "";

  return [
    "【행동 해석 v6.2】",
    `실질 만족 추정: ${result.satisfaction}/100 (${result.trustWeight})`,
    `신호: ${result.signals.join(", ") || "없음"}`,
    result.preferences.informational >= 75
      ? "다음 생성 — 정보성·객관 안내 비중 상향"
      : null,
    result.preferences.adTone <= 30
      ? "다음 생성 — 광고·과장 표현 하향"
      : null,
    result.preferences.brandVoice >= 80
      ? "다음 생성 — 브랜드 DNA·철학 강화"
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}
