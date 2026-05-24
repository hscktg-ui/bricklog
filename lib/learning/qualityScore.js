/**
 * 품질 점수 — qualityReport 기반 (추측 아님 검사 결과)
 */
export function computeQualityScore(qualityReport, feedbackStats = {}) {
  if (!qualityReport) return { total: 0, breakdown: [] };

  const badges = qualityReport.badges || [];
  const okCount = badges.filter((b) => b.ok).length;
  const total = badges.length || 1;
  let totalScore = Math.round((okCount / total) * 88) + 4;
  if (qualityReport.pass) totalScore = Math.max(82, totalScore);
  else if (okCount >= 8) totalScore = Math.max(80, totalScore);

  const checks = {
    repeat: badges.find((b) => b.id === "dup")?.ok !== false,
    gpt: badges.find((b) => b.id === "gpt")?.ok !== false,
    natural: badges.find((b) => b.id === "natural")?.ok !== false,
    brand: true,
    emotion: badges.find((b) => b.id === "overused")?.ok !== false,
    seo: badges.find((b) => b.id === "keyword")?.ok !== false,
    info: badges.find((b) => b.id === "chars")?.ok !== false,
  };

  if (feedbackStats.reasonCounts?.gpt_tone) totalScore -= 8;
  if (feedbackStats.reasonCounts?.repeat) totalScore -= 6;
  totalScore = Math.max(0, Math.min(99, totalScore));

  const breakdown = [
    { label: "반복 최소", score: checks.repeat ? 90 : 55 },
    { label: "GPT 말투 없음", score: checks.gpt ? 92 : 50 },
    { label: "자연스러움", score: checks.natural ? 88 : 60 },
    { label: "정보성", score: checks.info ? 85 : 55 },
    { label: "감성", score: checks.emotion ? 86 : 58 },
    { label: "SEO·키워드", score: checks.seo ? 84 : 52 },
    { label: "브랜드 적합", score: 80 },
  ];

  return { total: totalScore, breakdown, checks };
}
