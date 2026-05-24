/**
 * 한국 달력 기준 계절 → 랜딩 히어로 배경 토큰 (날씨 API 없음)
 * 봄 3–5월 · 여름 6–8월 · 가을 9–11월 · 겨울 12–2월
 */

/** @typedef {'spring'|'summer'|'autumn'|'winter'} KoreaSeason */

export const DEFAULT_SEASON_THEME = {
  id: "winter",
  label: "겨울",
  heroGradient:
    "linear-gradient(165deg, #FAFBFC 0%, #F0F4F8 50%, #F7F8FA 100%)",
  blobPrimary: "rgba(200, 220, 240, 0.28)",
  blobSecondary: "rgba(3, 199, 90, 0.05)",
  accent: "#6B7B8C",
};

export const SEASON_THEMES = {
  spring: {
    id: "spring",
    label: "봄",
    heroGradient:
      "linear-gradient(165deg, #F7F8FA 0%, #E8F9EF 45%, #FFF5F8 100%)",
    blobPrimary: "rgba(3, 199, 90, 0.14)",
    blobSecondary: "rgba(255, 180, 200, 0.12)",
    accent: "#03A94D",
  },
  summer: {
    id: "summer",
    label: "여름",
    heroGradient:
      "linear-gradient(165deg, #F7F8FA 0%, #E8F4FF 48%, #FFF9E8 100%)",
    blobPrimary: "rgba(49, 130, 246, 0.10)",
    blobSecondary: "rgba(255, 200, 80, 0.14)",
    accent: "#3182F6",
  },
  autumn: {
    id: "autumn",
    label: "가을",
    heroGradient:
      "linear-gradient(165deg, #F7F8FA 0%, #FFF4E8 50%, #F7F8FA 100%)",
    blobPrimary: "rgba(230, 119, 0, 0.10)",
    blobSecondary: "rgba(180, 120, 80, 0.08)",
    accent: "#C45C00",
  },
  winter: DEFAULT_SEASON_THEME,
};

/**
 * @param {Date} [date]
 * @returns {KoreaSeason}
 */
export function getKoreaSeason(date = new Date()) {
  const month = date.getMonth() + 1;
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

/** @param {KoreaSeason} season */
export function getSeasonTheme(season) {
  return SEASON_THEMES[season] || DEFAULT_SEASON_THEME;
}
