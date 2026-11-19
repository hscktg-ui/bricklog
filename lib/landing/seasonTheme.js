/**
 * 한국 달력 기준 계절 → 랜딩 히어로 배경 토큰 (날씨 API 없음)
 * 봄 3–5월 · 여름 6–8월 · 가을 9–11월 · 겨울 12–2월
 */

/** @typedef {'spring'|'summer'|'autumn'|'winter'} KoreaSeason */

export const DEFAULT_SEASON_THEME = {
  id: "winter",
  label: "겨울",
  heroGradient:
    "linear-gradient(165deg, #F7FAF8 0%, #F0F7F2 50%, #EEF7F1 100%)",
  blobPrimary: "rgba(3, 169, 77, 0.12)",
  blobSecondary: "rgba(201, 166, 107, 0.1)",
  accent: "#03A94D",
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

const SEASON_TEXT_RULES = [
  {
    id: "spring",
    re: /봄|spring|벚꽃|개나리|환절기\s*초|신학기|어버이날|가정의\s*달/,
  },
  {
    id: "summer",
    re: /여름|summer|무더운|더위|더운\s*날|휴가철|아이스|장마|한여름|폭염/,
  },
  {
    id: "autumn",
    re: /가을|autumn|fall\b|단풍|늦가을|환절기|추석|김장|낙엽/,
  },
  {
    id: "winter",
    re: /겨울|winter|한파|눈\s|연말|연초|크리스마스|따뜻한\s*시즌|핫\s*초코/,
  },
];

/**
 * 주제·카피 문장에서 계절 단서 추출 (없으면 null)
 * @param {string} text
 * @returns {KoreaSeason|null}
 */
export function inferSeasonFromText(text = "") {
  const raw = String(text || "");
  if (!raw.trim()) return null;
  for (const rule of SEASON_TEXT_RULES) {
    if (rule.re.test(raw)) return /** @type {KoreaSeason} */ (rule.id);
  }
  return null;
}

/**
 * 사용자 주제와 시드/샘플 계절이 충돌하면 false
 * @param {string} userTopic
 * @param {string} seedText
 */
export function seasonsCompatible(userTopic = "", seedText = "") {
  const userSeason = inferSeasonFromText(userTopic);
  const seedSeason = inferSeasonFromText(seedText);
  if (!userSeason || !seedSeason) return true;
  return userSeason === seedSeason;
}

/** @param {KoreaSeason} season */
export function getSeasonTheme(season) {
  return SEASON_THEMES[season] || DEFAULT_SEASON_THEME;
}
