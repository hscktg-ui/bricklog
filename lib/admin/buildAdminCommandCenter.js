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

  return {
    generatedAt: new Date().toISOString(),
    pulse,
    pulseLabel,
    headline: advisory?.headline || "운영 데이터를 불러오는 중입니다.",
    subline:
      cross?.passRate != null
        ? `배치 ${cross.passRate}% · ${cross.freshness?.label || "로컬 기준"}`
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
        id: "visits",
        label: "오늘 방문",
        value: funnel.visitsToday ?? live?.activeUsersToday ?? "—",
      },
      {
        id: "signups",
        label: "오늘 가입",
        value: funnel.signupsToday ?? "—",
      },
      {
        id: "samples",
        label: "샘플 7일",
        value: funnel.sampleRuns7d ?? publicTest.runs7d ?? "—",
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
      {
        id: "online",
        label: "접속 중",
        value: live?.onlineUsers ?? "—",
      },
    ],
    nowActions: nowActions.slice(0, 3),
    watchCount: (advisory?.actions || []).filter((a) => a.priority !== "now").length,
    topAlert: warnAlerts[0]?.message || qualityOps?.alerts?.[0]?.message || null,
  };
}
