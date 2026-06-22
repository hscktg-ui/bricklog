/**
 * 주간 운영 리포트 — 캘린더·리듬 기반 브랜드 성장 한 줄
 */
function channelHits(historyByDay = {}, channel, days = 7) {
  const keys = Object.keys(historyByDay).sort().slice(-days);
  let count = 0;
  for (const key of keys) {
    const items = historyByDay[key] || [];
    if (items.some((i) => i.channel === channel || i.channel === "insta" && channel === "instagram")) {
      count += 1;
    }
  }
  return count;
}

/**
 * @param {object} scheduleView — buildContentScheduleView output
 * @param {object} [input]
 */
export function buildWeeklyOperatingReport(scheduleView = {}, input = {}) {
  const historyByDay = scheduleView.historyByDay || {};
  const planned = scheduleView.planned || [];
  const rhythm = Array.isArray(scheduleView.rhythm) ? scheduleView.rhythm : [];
  const overdueRows = rhythm.filter(
    (r) => r.status === "overdue" || r.status === "due"
  );
  const gapDays = scheduleView.gapDays ?? 0;

  const blogDays = channelHits(historyByDay, "blog");
  const placeDays = channelHits(historyByDay, "place");
  const instaDays = channelHits(historyByDay, "instagram");

  const weekPlanned = planned.filter((p) => p.kind === "plan").length;
  const doneThisWeek = blogDays + placeDays + instaDays;
  const targetWeek = Math.max(3, weekPlanned || 3);
  const pct = Math.min(100, Math.round((doneThisWeek / targetWeek) * 100));

  let headline = `이번 주 운영 ${pct}% — 이야기 ${blogDays} · 플레이스 ${placeDays} · 인스타 ${instaDays}`;
  let growthLine = "꾸준히 쌓이면 검색·방문·재방문에 도움이 됩니다.";

  if (gapDays >= 14) {
    headline = `마지막 기록 후 ${gapDays}일 — 이번 주 한 번만 채워도 리듬이 돌아옵니다`;
    growthLine = "비어 있는 ‘쓸 날’을 오늘 채우면 브랜드 신뢰가 이어집니다.";
  } else if (overdueRows.length) {
    headline = `${overdueRows[0]?.label || "채널"} 리듬이 밀렸어요 — 오늘 한 번에 받기를 추천합니다`;
    growthLine = "운영 계획에 맞춰 세 채널을 같이 채우면 편합니다.";
  } else if (pct >= 80) {
    headline = `이번 주 운영 ${pct}% — 잘 쌓이고 있어요`;
    growthLine = "다음 ‘쓸 날’만 지키면 브랜드 성장 루프가 유지됩니다.";
  }

  return {
    headline,
    growthLine,
    pct,
    blogDays,
    placeDays,
    instaDays,
    gapDays,
    rhythm,
    version: "weekly-operating-report-v1",
  };
}
