/**
 * Admin 한눈에 — advisory·qualityOps·stats 통합 뷰모델
 */

function pickLive(advisory, stats) {
  return advisory?.live || stats?.dashboard?.live || null;
}

/**
 * @param {{ advisory?: object|null, qualityOps?: object|null, stats?: object|null, errors?: object[] }} ctx
 */
export function buildAdminCommandCenter(ctx = {}) {
  const { advisory = null, qualityOps = null, stats = null, errors = [] } = ctx;

  const cross = qualityOps?.crossChannel || null;
  const readiness = qualityOps?.readiness?.total ?? advisory?.healthScore ?? null;
  const readinessBand =
    qualityOps?.readiness?.band ?? advisory?.healthBand ?? null;
  const funnel = advisory?.funnel || {};
  const publicTest = stats?.dashboard?.publicBrandTest || {};
  const live = pickLive(advisory, stats);

  const errorsToday = live?.errorsToday ?? errors.length ?? 0;
  const nowActions = (advisory?.actions || []).filter((a) => a.priority === "now");
  const warnAlerts = (qualityOps?.alerts || []).filter((a) => a.severity === "warn");

  const blog = cross?.byChannel?.blog;
  const place = cross?.byChannel?.place;
  const insta = cross?.byChannel?.instagram;

  let pulse = "ok";
  let pulseLabel = "양호";
  if (nowActions.length > 0 || errorsToday >= 5) {
    pulse = "urgent";
    pulseLabel = "지금 확인";
  } else if (
    warnAlerts.length > 0 ||
    blog?.status === "warn" ||
    blog?.status === "fail" ||
    insta?.status === "warn"
  ) {
    pulse = "watch";
    pulseLabel = "관찰";
  }

  const channels = [
    {
      id: "blog",
      label: "이야기",
      passRate: blog?.passRate ?? null,
      target: blog?.target ?? 90,
      status: blog?.status ?? "unknown",
      fraction:
        blog?.pass != null && blog?.total
          ? `${blog.pass}/${blog.total}`
          : null,
    },
    {
      id: "place",
      label: "플레이스",
      passRate: place?.passRate ?? null,
      target: place?.target ?? 95,
      status: place?.status ?? "unknown",
      fraction:
        place?.pass != null && place?.total
          ? `${place.pass}/${place.total}`
          : null,
    },
    {
      id: "instagram",
      label: "인스타",
      passRate: insta?.passRate ?? null,
      target: insta?.target ?? 88,
      status: insta?.status ?? "unknown",
      fraction:
        insta?.pass != null && insta?.total
          ? `${insta.pass}/${insta.total}`
          : null,
    },
  ];

  const failingChannel = channels.find((ch) => ch.status === "fail");
  const watchChannel = channels.find(
    (ch) => ch.status === "warn" || ch.status === "fail"
  );

  let editorialVerdict = null;
  if (failingChannel) {
    editorialVerdict = `${failingChannel.label} 배치가 목표 미달입니다.`;
  } else if (nowActions[0]?.title) {
    editorialVerdict = nowActions[0].title;
  } else if (warnAlerts[0]?.message || qualityOps?.alerts?.[0]?.message) {
    editorialVerdict =
      warnAlerts[0]?.message || qualityOps?.alerts?.[0]?.message;
  } else if (errorsToday >= 5) {
    editorialVerdict = `오늘 오류 ${errorsToday}건 — 시스템 탭에서 확인하세요.`;
  } else if (readiness != null) {
    editorialVerdict =
      readiness >= 80
        ? `운영 준비도 ${readiness} — 오늘은 유입·품질만 보면 됩니다.`
        : `운영 준비도 ${readiness} — 품질 탭부터 확인하세요.`;
  } else if (advisory?.headline && !/불러오는 중/.test(advisory.headline)) {
    editorialVerdict = advisory.headline;
  } else if (cross?.passRate != null) {
    editorialVerdict = `교차 채널 배치 ${cross.passRate}% — 상태를 확인하세요.`;
  } else {
    editorialVerdict = "오늘 운영 상태를 확인하세요.";
  }

  return {
    generatedAt: new Date().toISOString(),
    pulse,
    pulseLabel,
    headline: editorialVerdict,
    editorialVerdict,
    subline:
      cross?.passRate != null
        ? `배치 ${cross.passRate}% · ${cross.freshness?.label || "로컬 기준"}`
        : watchChannel
          ? `${watchChannel.label} 관찰 중`
          : "배치 요약은 로컬 실행 후 확인",
    readiness,
    readinessBand,
    overallPass: cross?.passRate ?? null,
    overallFraction:
      cross?.pass != null && cross?.total
        ? `${cross.pass}/${cross.total}`
        : null,
    channels,
    signals: [
      {
        id: "signups",
        label: "오늘 가입",
        value: funnel.signupsToday ?? "—",
        tone: "accent",
      },
      {
        id: "signup-intent",
        label: "가입 CTA",
        value: live?.signupIntentsToday ?? "—",
        tone: "accent",
      },
      {
        id: "samples",
        label: "샘플 7일",
        value: funnel.sampleRuns7d ?? publicTest.runs7d ?? "—",
      },
      {
        id: "visits",
        label: "오늘 방문",
        value: funnel.visitsToday ?? live?.uniqueVisitorsToday ?? "—",
      },
      {
        id: "errors",
        label: "오늘 오류",
        value: errorsToday,
        tone: errorsToday >= 5 ? "urgent" : errorsToday > 0 ? "watch" : "ok",
      },
      {
        id: "insights",
        label: "인사이트 대기",
        value: advisory?.pendingInsightsCount ?? 0,
        tone: (advisory?.pendingInsightsCount ?? 0) > 0 ? "watch" : "ok",
      },
    ],
    nowActions: nowActions.slice(0, 3),
    watchCount: (advisory?.actions || []).filter((a) => a.priority !== "now").length,
    topAlert: warnAlerts[0]?.message || qualityOps?.alerts?.[0]?.message || null,
  };
}
