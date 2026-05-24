function countBy(items, keyFn) {
  const m = {};
  for (const x of items) {
    const k = keyFn(x);
    if (!k) continue;
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

export function aggregateFeedbackStats({
  itemsToday = [],
  eventsToday = [],
  feedbackAll = [],
  brandsActive = 0,
}) {
  const gens = itemsToday.length;
  const copies = eventsToday.filter((e) =>
    /copy/.test(e.event_type)
  ).length;
  const rewrites = eventsToday.filter((e) => e.event_type === "rewrite").length;

  const qualityScores = itemsToday
    .map((i) => i.quality_score)
    .filter((n) => typeof n === "number");
  const avgQuality = qualityScores.length
    ? Math.round(
        qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      )
    : null;

  const failReasons = {};
  for (const it of itemsToday) {
    const reasons =
      it.prompt_input?.generation_log?.fail_reasons ||
      it.prompt_input?.fail_reasons ||
      [];
    for (const r of reasons) {
      const key = String(r).slice(0, 60);
      failReasons[key] = (failReasons[key] || 0) + 1;
    }
  }
  const topFailReasons = Object.entries(failReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([reason, count]) => ({ reason, count }));

  const industryScores = countBy(itemsToday, (i) => {
    const ind =
      i.prompt_input?.industry ||
      i.prompt_input?.businessType ||
      i.prompt_input?.business_type;
    return ind ? String(ind).slice(0, 40) : null;
  });

  const channelCopyRates = countBy(
    eventsToday.filter((e) => e.event_type === "copy_channel"),
    (e) => e.channel || "unknown"
  );

  const feedbackRatios = { good: 0, neutral: 0, bad: 0 };
  for (const f of feedbackAll) {
    if (feedbackRatios[f.reaction] !== undefined) {
      feedbackRatios[f.reaction] += 1;
    }
  }

  return {
    feedbackTablesReady: true,
    generationsToday: gens,
    copiesToday: copies,
    copyRate: gens ? Math.round((copies / gens) * 100) : 0,
    rewriteRate: gens ? Math.round((rewrites / gens) * 100) : 0,
    avgQuality,
    feedbackRatios,
    topFailReasons,
    industryScores,
    channelCopyRates,
    brandActivityCount: brandsActive,
  };
}
