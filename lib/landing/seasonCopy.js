/**
 * 계절별 랜딩 보조 카피 — 히어로 서브 옆·배지용 (작업실 톤)
 */

/** @typedef {import('./seasonTheme').KoreaSeason} KoreaSeason */

export const SEASON_COPY = {
  spring: {
    badge: "봄 시즌",
    line: "새 시즌 소식도, 브랜드 톤 그대로 차분히 정리해 보세요.",
  },
  summer: {
    badge: "여름",
    line: "한여름에도 말투는 흐트러지지 않게, 채널별 초안을 한 번에.",
  },
  autumn: {
    badge: "가을",
    line: "계절이 바뀔 때, 고객에게 전할 문장을 브랜드에 맞게 다듬어 봅니다.",
  },
  winter: {
    badge: "연말·겨울",
    line: "연말·새해 안내도, 검수 후 각 채널에 맞게 복사해 쓸 수 있습니다.",
  },
};

/** @param {KoreaSeason} season */
export function getSeasonCopy(season) {
  return SEASON_COPY[season] ?? SEASON_COPY.winter;
}
