import { rainyDay } from "./rainyDay";
import { afterWork } from "./afterWork";
import { weekend } from "./weekend";
import { giftMoment } from "./giftMoment";
import { seasonalMood } from "./seasonalMood";
import { everydayMoment } from "./everydayMoment";

export const SITUATIONS = [
  rainyDay,
  afterWork,
  weekend,
  giftMoment,
  seasonalMood,
  everydayMoment,
];

/** 반복 금지 표현 (인스타·블로그 공통) */
export const OVERUSED_PHRASES = [
  "퇴근길",
  "괜히",
  "꽃 한 다발",
  "분위기",
  "감성",
  "저장해두세요",
  "저장해 두셔도",
  "필요할 때 다시",
  "다시 보세요",
  "다시 꺼내봐",
  "체크해보세요",
  "검색하시는 분",
  "참고가 되길",
  "정리하자면",
  "현장이 더 정확해요",
  "꽃은 생각보다 많은 말을 대신한다",
  "알아보시다 보면",
  "비교해 보시면",
];

function hashSeed(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h + str.charCodeAt(i) * (i + 1)) % 997;
  return h;
}

function pickFromPool(pool, seed, usedSet) {
  const list = [...pool].sort(
    (a, b) => (hashSeed(seed + a) % 100) - (hashSeed(seed + b) % 100)
  );
  for (const line of list) {
    const lower = line.toLowerCase();
    if (OVERUSED_PHRASES.some((p) => lower.includes(p.toLowerCase()))) continue;
    if (usedSet?.has(line)) continue;
    usedSet?.add(line);
    return line;
  }
  return list[0] || "";
}

export function pickSituation(ctx, usedPhrases = new Set()) {
  const purpose = ctx.purposeType || ctx.purpose?.value || "season";
  const map = {
    season: seasonalMood,
    visitDrive: everydayMoment,
    gift: giftMoment,
    review: everydayMoment,
    newOpen: weekend,
  };
  const sit =
    map[purpose] ||
    SITUATIONS[hashSeed(ctx.region + ctx.main) % SITUATIONS.length];
  const seed = `${ctx.region}|${ctx.main}|${sit.id}`;
  const hook = pickFromPool(sit.hooks, seed, usedPhrases);
  const line = pickFromPool(sit.lines, seed + "line", usedPhrases);
  return { situationId: sit.id, hook, line };
}

export function containsOverused(text) {
  const t = String(text || "");
  return OVERUSED_PHRASES.some((p) => t.includes(p));
}
