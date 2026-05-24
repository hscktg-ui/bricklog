/**
 * 수집 신호에서만 패턴·점수 도출 (원문 복사·인용 금지)
 */

const THEME_LEXICON = [
  { theme: "감사·선물", keys: ["감사", "선물", "어버이", "스승", "가정의달"] },
  { theme: "퇴근·일상", keys: ["퇴근", "출퇴근", "일상", "직장"] },
  { theme: "날씨·계절", keys: ["장마", "여름", "봄", "추석", "연말", "크리스마스"] },
  { theme: "후기·체험", keys: ["후기", "방문", "체험", "리뷰"] },
  { theme: "이벤트·할인", keys: ["이벤트", "할인", "프로모션", "오픈"] },
];

function countThemes(text, counts) {
  for (const { theme, keys } of THEME_LEXICON) {
    if (keys.some((k) => text.includes(k))) {
      counts[theme] = (counts[theme] || 0) + 1;
    }
  }
}

function toScores(counts, total) {
  if (!total) return [];
  return Object.entries(counts)
    .map(([theme, n]) => ({
      theme,
      score: Math.min(99, Math.round((n / total) * 100) + 40),
      trend: n >= 2 ? "up" : "stable",
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export function analyzeIndustryPatterns(bucket) {
  const themeCounts = { ...bucket.themeCounts };
  const texts = bucket.signals.map(
    (s) => `${s.title} ${s.snippet || ""}`
  );
  for (const t of texts) countThemes(t, themeCounts);

  const total = bucket.signals.length || 1;
  const scores = toScores(themeCounts, total);

  const risingThemes = scores
    .filter((s) => s.trend === "up")
    .map((s) => `▲ ${s.theme} 관련 언급 증가 (${s.score}점)`);

  return {
    industryKey: bucket.key,
    label: bucket.label,
    signalCount: bucket.signals.length,
    risingThemes:
      risingThemes.length > 0
        ? risingThemes
        : scores.slice(0, 3).map((s) => `▲ ${s.theme} (${s.score}점)`),
    patterns: {
      titlePatterns: ["질문형 제목", "지역+소비 키워드", "시즌 이슈 연결"],
      openerPatterns: ["상황 도입", "이슈 직결"],
      emotionElements: scores.map((s) => s.theme),
      sceneHints: inferScenes(themeCounts),
      ctaHints: ["문의·예약", "방문 안내"],
      seasonElements: inferSeason(texts.join(" ")),
      emojiLevel: "low-medium",
      sentenceLength: "short-medium",
      structure: "scene → empathy → info",
    },
    scores,
  };
}

function inferScenes(counts) {
  const scenes = [];
  if ((counts["퇴근"] || 0) + (counts["퇴근·일상"] || 0) > 0) scenes.push("퇴근길");
  if ((counts["감사"] || counts["선물"]) > 0) scenes.push("기념·선물");
  if ((counts["장마"] || counts["여름"]) > 0) scenes.push("비·여름");
  return scenes.length ? scenes : ["일상 소비"];
}

function inferSeason(blob) {
  const found = [];
  if (/어버이|가정의달|스승/.test(blob)) found.push("가정의달");
  if (/장마|여름/.test(blob)) found.push("초여름·장마");
  if (/추석/.test(blob)) found.push("추석");
  if (/연말|크리스마스/.test(blob)) found.push("연말");
  return found;
}

export function buildBestPatterns(industries) {
  return industries.map((ind) => ({
    industryKey: ind.industryKey,
    label: ind.label,
    summary: ind.risingThemes,
    patterns: ind.patterns,
    scores: ind.scores,
  }));
}
