import { topSmellList } from "@/lib/evolution-lab/aiSmellTracker";

export function buildLabReport(run) {
  const results = run.results || [];
  const scores = results.map((r) => r.finalScore).filter(Number.isFinite);
  const avgScore = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0;
  const passCount = results.filter((r) => r.passOrFail === true).length;
  const passRate = results.length
    ? Math.round((passCount / results.length) * 1000) / 10
    : 0;

  const byCategory = {};
  const phraseCounts = {};
  const searchFails = [];

  for (const r of results) {
    byCategory[r.category] = byCategory[r.category] || [];
    byCategory[r.category].push(r.finalScore);
    for (const s of (r.smells || []).filter(Boolean)) {
      phraseCounts[s] = (phraseCounts[s] || 0) + 1;
    }
    if ((r.blockers || []).includes("weak_search_intent")) {
      searchFails.push({
        category: r.category,
        title: r.title,
        score: r.finalScore,
      });
    }
  }

  const categoryAvgs = Object.entries(byCategory)
    .map(([category, arr]) => ({
      category,
      avg: Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10,
      count: arr.length,
    }))
    .sort((a, b) => a.avg - b.avg);

  const topErrors = Object.entries(run.errorCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([reason, count]) => ({ reason, count }));

  const successPatterns = results
    .filter((r) => r.passOrFail)
    .slice(-10)
    .map((r) => ({
      category: r.category,
      persona: r.persona,
      emotion: r.emotionTone,
      score: r.finalScore,
    }));

  return {
    runId: run.id,
    status: run.status,
    stopReason: run.stopReason,
    totalGenerated: results.length,
    avgScore,
    maxScore: scores.length ? Math.max(...scores) : 0,
    minScore: scores.length ? Math.min(...scores) : 0,
    passRate,
    pctAtOrAboveTarget: passRate,
    targetScore: run.config?.targetScore ?? 90,
    categoryAvgs,
    weakestCategory: categoryAvgs[0]?.category,
    aiSmellTop10: topSmellList(run.smellStats, 10),
    repetitionTop10: topErrors.filter((e) =>
      /repetition|duplicate|ai_cliche/.test(e.reason)
    ),
    searchIntentFails: searchFails.slice(0, 10),
    ruleEvolutions: run.ruleEvolutions || [],
    improvedPrompts: run.lastRuleEvolution?.promptChanges
      ? `금지 표현 ${run.lastRuleEvolution.promptChanges}건 반영`
      : "—",
    successPatterns,
    remainingIssues: topErrors.slice(0, 5).map((e) => e.reason),
    nextSteps: [
      "약한 업종 프롬프트·베이스라인 보강",
      "민감 업종 disclaimer 유지·2차 검증",
      "연속 20건 90점 달성까지 실험 반복",
      "evolved rules를 config와 diff 검토 후 배포",
    ],
    trendResearch: run.trendResearch,
    apiCalls: run.apiCalls,
    note: "평균 점수는 AI 생성 API 실행 후에만 의미 있습니다.",
  };
}
