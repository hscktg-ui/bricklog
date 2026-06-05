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

const OVERUSED_SKIP_BY_CHANNEL = {
  instagram: new Set(["분위기", "감성"]),
  place: new Set(["분위기"]),
};

const OVERUSED_CONTEXT_ALLOW = {
  분위기:
    /(?:방|집|현장|공간|매장|실내|테이블|쇼룸|조명\s*아래)\s*분위기|분위기와\s*(?:생화|좌석|맞)/g,
};

export function containsOverused(text, channel = "blog") {
  const t = String(text || "");
  const skip = OVERUSED_SKIP_BY_CHANNEL[channel] || new Set();
  for (const p of OVERUSED_PHRASES) {
    if (skip.has(p) || !t.includes(p)) continue;
    const allow = OVERUSED_CONTEXT_ALLOW[p];
    if (allow) {
      const stripped = t.replace(allow, "");
      if (!stripped.includes(p)) continue;
    }
    return true;
  }
  return false;
}
