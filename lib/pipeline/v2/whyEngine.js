/**
 * STEP 7 — Why Engine (무엇 설명보다 왜)
 */
const WHY_LINES = {
  brand_intro: [
    "왜 이 브랜드를 떠올리게 되는지, 분위기에서 먼저 느껴지는 경우가 많아요.",
    "다시 찾게 되는 이유는, 말로 설명하기보다 경험에 남기 때문이에요.",
  ],
  visit_review: [
    "왜 이곳을 추천하게 됐는지, 솔직한 기준이 있어야 하니까요.",
    "재방문을 생각하게 된 이유는, 한 번에 다 보이지 않아서입니다.",
  ],
  local_recommend: [
    "왜 이 동네에서 이곳을 쓰는지, 생활 루틴과 맞을 때가 많아요.",
    "근처에 살면 ‘언제 필요해지는지’가 먼저 보입니다.",
  ],
  product_intro: [
    "왜 이 구성이 필요한지, 상황부터 맞춰 보는 편이 낫습니다.",
    "선택 전에 ‘왜 지금인지’를 먼저 짚어 두면 후회가 줄어요.",
  ],
  event_notice: [
    "왜 지금 행사를 챙기는지, 일정이 겹치는 날이 많기 때문이에요.",
  ],
  info: [
    "왜 헷갈리는지, 정보가 많을수록 기준이 필요해져서입니다.",
  ],
  compare: [
    "왜 비교가 필요한지, 사진만으로는 차이가 안 보일 때가 많아요.",
  ],
  guide: [
    "왜 가이드가 필요한지, 처음 방문할 때 막히는 지점이 비슷해서입니다.",
  ],
};

function pick(pool, seed) {
  if (!pool?.length) return "";
  return pool[Math.abs(seed) % pool.length];
}

export function applyWhyEngineToSections(sections = [], ctx = {}) {
  const intent = ctx.pipeline?.intent?.locked || ctx.contentIntent || "brand_intro";
  const pool = WHY_LINES[intent] || WHY_LINES.brand_intro;
  const seed =
    (ctx.region || "").length +
    (ctx._regenAttempt || 0) +
    (ctx.topic || "").length;

  return sections.map((sec, idx) => {
    if (idx === 0 || idx === sections.length - 1) return sec;
    const why = pick(pool, seed + idx);
    if (!why || sec.body?.includes(why.slice(0, 12))) return sec;
    const hasWhy = /왜|이유|때문|다시|재방문/.test(sec.body || "");
    if (hasWhy) return sec;
    return {
      ...sec,
      body: `${sec.body}\n\n${why}`,
    };
  });
}
