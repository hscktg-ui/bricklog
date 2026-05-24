import { feedbackRatio, topCounts, aggregateFailReasons } from "@/lib/admin/dashboardMetrics";

function inRange(iso, startIso, endIso) {
  const t = new Date(iso).getTime();
  return t >= new Date(startIso).getTime() && t <= new Date(endIso).getTime();
}

function filterRange(rows, startIso, endIso, field = "created_at") {
  return (rows || []).filter((r) => inRange(r[field], startIso, endIso));
}

/**
 * Aggregate anonymous usage metrics for one KST calendar day.
 * @param {object} params
 * @param {string} params.snapshotDate YYYY-MM-DD (KST)
 * @param {string} params.startIso
 * @param {string} params.endIso
 */
export function aggregateDailyUsageMetrics({
  snapshotDate,
  startIso,
  endIso,
  profiles = [],
  contentItems = [],
  contentEvents = [],
  contentFeedback = [],
  contentPerformance = [],
  subscriptions = [],
}) {
  const dayProfiles = filterRange(profiles, startIso, endIso);
  const profileHealth = {
    signups: dayProfiles.length,
    withNickname: dayProfiles.filter((p) => String(p.nickname || "").trim().length >= 2)
      .length,
    withPhone: dayProfiles.filter((p) => String(p.contact_phone || "").trim().length >= 8)
      .length,
    completed: dayProfiles.filter((p) => p.profile_completed_at).length,
    withUseCase: dayProfiles.filter((p) => String(p.primary_use_case || "").trim())
      .length,
  };
  const dayItems = filterRange(contentItems, startIso, endIso);
  const dayEvents = filterRange(contentEvents, startIso, endIso);
  const dayFeedback = filterRange(contentFeedback, startIso, endIso);
  const dayPerf = filterRange(contentPerformance, startIso, endIso);

  const qualityScores = dayItems
    .map((i) => i.quality_score)
    .filter((n) => typeof n === "number");
  const avgQualityScore = qualityScores.length
    ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
    : null;

  const copies = dayEvents.filter((e) => /copy/.test(e.event_type)).length;
  const rewrites = dayEvents.filter((e) => e.event_type === "rewrite").length;
  const gens = dayItems.length;

  const fbRatios = dayFeedback.reduce(
    (acc, f) => {
      if (acc[f.reaction] !== undefined) acc[f.reaction] += 1;
      return acc;
    },
    { good: 0, neutral: 0, bad: 0 }
  );
  const fb = feedbackRatio(fbRatios);

  const tagCounts = {};
  for (const f of dayFeedback) {
    for (const t of f.tags || []) {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    }
  }

  const eventTypeCounts = topCounts(dayEvents, (e) => e.event_type, 12).map(
    ({ key, count }) => ({ type: key, count })
  );

  return {
    snapshotDate,
    timezone: "Asia/Seoul",
    window: { startIso, endIso },
    usage: {
      signups: dayProfiles.length,
      profileHealth,
      contentItems: gens,
      contentEvents: dayEvents.length,
      contentFeedback: dayFeedback.length,
      contentPerformance: dayPerf.length,
      copies,
      rewrites,
      copyRatePct: gens ? Math.round((copies / gens) * 100) : 0,
      rewriteRatePct: gens ? Math.round((rewrites / gens) * 100) : 0,
      avgQualityScore,
      feedbackGoodPct: fb.goodPct,
      feedbackTotal: fb.total,
      generationsByChannel: topCounts(dayItems, (r) => r.channel || "other", 8),
      generationsByPersona: topCounts(
        dayItems,
        (r) => r.persona || r.prompt_input?.persona || "other",
        8
      ),
      eventTypeCounts,
      topFailReasons: aggregateFailReasons(dayItems, 10),
      topFeedbackTags: Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
      planDistribution: topCounts(subscriptions, (r) => r.plan, 6),
    },
  };
}
