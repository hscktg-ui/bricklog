/**
 * STEP 8 — Emotion Engine
 */
const EMOTION_LINES = {
  empathy: [
    "비슷한 날을 겪어 본 분들은, 말로 설명하기 전에 먼저 상황부터 떠올리게 됩니다.",
    "막상 필요한 날이 오면, 마음이 정보를 앞지르는 경우가 많아요.",
  ],
  worry: [
    "선택을 미루다 보면, 오히려 더 급해지는 날이 있습니다.",
    "처음엔 작은 고민처럼 시작했다가, 일정이 다가오면 부담이 커지기도 해요.",
  ],
  expectation: [
    "그래서 ‘이번엔 다를까’ 하는 기대가, 방문 전에 먼저 생깁니다.",
    "기대가 크지 않을수록, 현장에서 받는 인상이 더 오래 남는 편이에요.",
  ],
};

function pick(pool, seed) {
  return pool[Math.abs(seed) % pool.length];
}

export function applyEmotionEngine(sections = [], ctx = {}) {
  const seed =
    (ctx.region || "").length +
    (ctx._regenAttempt || 0) +
    (ctx.contentPersona || "").length;
  const emotion = ctx.pipeline?.understanding?.emotion || ctx.emotion;

  return sections.map((sec, idx) => {
    if (idx !== 1 && idx !== sections.length - 2) return sec;
    const line = emotion
      ? `${emotion}이(가) 떠오르는 날, ${pick(EMOTION_LINES.empathy, seed + idx)}`
      : pick(EMOTION_LINES.worry, seed + idx);
    if (sec.body?.includes(line.slice(0, 14))) return sec;
    const hasEmotion = /느껴|마음|공감|기대|부담|걱정|그날/.test(sec.body || "");
    if (hasEmotion) return sec;
    return { ...sec, body: `${sec.body}\n\n${line}` };
  });
}
