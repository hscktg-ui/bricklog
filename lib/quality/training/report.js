export function buildTrainingReport(run) {
  const results = run.results || [];
  const total = results.length;
  const scores = results.map((r) => r.finalScore).filter((n) => typeof n === "number");
  const avgScore = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0;
  const passCount = results.filter(
    (r) => r.passOrFail === true || r.passOrFail === "pass"
  ).length;
  const passRate = total ? Math.round((passCount / total) * 1000) / 10 : 0;

  const byCategory = {};
  const byChannel = {};
  const errorCounts = {};
  const bestConditions = {};

  for (const r of results) {
    byCategory[r.category] = byCategory[r.category] || [];
    byCategory[r.category].push(r.finalScore);
    byChannel[r.channel] = byChannel[r.channel] || [];
    byChannel[r.channel].push(r.finalScore);
    for (const b of (r.failReason || "").split(",").filter(Boolean)) {
      errorCounts[b] = (errorCounts[b] || 0) + 1;
    }
    if (r.passOrFail === true || r.passOrFail === "pass") {
      const key = `${r.persona}|${r.emotionTone}|${r.channel}`;
      bestConditions[key] = (bestConditions[key] || 0) + 1;
    }
  }

  const avg = (arr) =>
    arr.length
      ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10
      : 0;

  const categoryAvgs = Object.entries(byCategory)
    .map(([k, v]) => ({ category: k, avg: avg(v), count: v.length }))
    .sort((a, b) => a.avg - b.avg);

  const channelAvgs = Object.entries(byChannel).map(([k, v]) => ({
    channel: k,
    avg: avg(v),
    count: v.length,
  }));

  const topErrors = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([reason, count]) => ({ reason, count }));

  const topConditions = Object.entries(bestConditions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => {
      const [persona, emotionTone, channel] = key.split("|");
      return { persona, emotionTone, channel, count };
    });

  const weakest = categoryAvgs[0] || null;

  return {
    runId: run.id,
    status: run.status,
    stopReason: run.stopReason,
    totalGenerated: total,
    total,
    avgScore,
    passRate,
    pctPass: passRate,
    pctAtOrAboveTarget: passRate,
    targetScore: run.config?.targetScore ?? 90,
    categoryAvgs,
    channelAvgs,
    topErrors,
    topConditions,
    weakestCategory: weakest?.category,
    promptImprovements: [
      "민감 업종은 disclaimer·검수 단계 유지",
      "length·brand_feature blocker 시 재작성 프롬프트 강화",
    ],
    remainingIssues: topErrors.slice(0, 3).map((e) => e.reason),
    nextSteps: [
      "가장 약한 업종 카테고리 프롬프트 보강",
      "90점 미만 blocker TOP3 자동 수정 규칙 추가",
    ],
    apiCalls: run.apiCalls,
    errorRate: run.errorRate,
    finishedAt: run.finishedAt || new Date().toISOString(),
  };
}
