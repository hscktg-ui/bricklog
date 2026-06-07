import fs from "fs";
import path from "path";
import { getEngineOpsStatus } from "@/lib/brand/engineOpsStatus";
import { fetchAdminLiveMetrics } from "@/lib/admin/liveMetrics";
import { listPendingInsights } from "@/lib/feedback/globalInsights";

const PRIORITY = {
  now: { label: "지금", order: 0, tone: "urgent" },
  soon: { label: "이번 주", order: 1, tone: "focus" },
  watch: { label: "관찰", order: 2, tone: "muted" },
};

function loadReadinessScore() {
  try {
    const file = path.join(process.cwd(), "config", "product-readiness-score.json");
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function pct(part, whole) {
  if (!whole || whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

/**
 * 운영자용 조언 카드 — 랜딩·가입·공개 테스트 로직은 변경하지 않음
 * @param {object} ctx
 */
export async function buildOperatorAdvisory(ctx = {}) {
  const {
    db,
    dashboard = null,
    errors = [],
    feedback = null,
    userCount = 0,
    qtReport = null,
  } = ctx;

  const [engineOps, live, pendingInsights] = await Promise.all([
    getEngineOpsStatus(),
    db ? fetchAdminLiveMetrics(db).catch(() => null) : null,
    db ? listPendingInsights(db).catch(() => []) : [],
  ]);

  const readiness = loadReadinessScore();
  const publicTest = dashboard?.publicBrandTest || {};
  const cards = dashboard?.cards || {};
  const charts = dashboard?.charts || {};
  const quality = dashboard?.quality || {};
  const dailyCron = dashboard?.dailyCron || null;

  const actions = [];
  const sampleRuns7d = publicTest.runs7d ?? 0;
  const sampleUsers = publicTest.totalSampleUsers ?? 0;
  const signups30d = (charts.signups30 || []).reduce(
    (sum, p) => sum + (p.count || 0),
    0
  );
  const signupsToday = live?.signupsToday ?? 0;
  const visitsToday = live?.visitsToday ?? 0;
  const errorsToday = live?.errorsToday ?? errors.length;

  for (const note of engineOps.notes || []) {
    if (!note) continue;
    actions.push({
      id: `engine_${note.slice(0, 24)}`,
      priority: "now",
      title: "인프라 점검",
      advice: note,
      action: "Vercel 환경변수·Supabase 스키마를 확인하세요.",
    });
  }

  if ((pendingInsights?.length || 0) > 0) {
    actions.push({
      id: "pending_insights",
      priority: "soon",
      title: `전역 품질 인사이트 ${pendingInsights.length}건`,
      advice:
        "피드백·이벤트에서 뽑은 후보입니다. 승인하면 global_engine_rules와 프롬프트에 반영됩니다.",
      action: "아래 인사이트를 검토하고 승인하세요.",
      count: pendingInsights.length,
    });
  }

  if (errorsToday > 0) {
    const topRoute = errors[0]?.route || "unknown";
    const topMessage = errors[0]?.message || "";
    const sameMessageCount = errors.filter((e) => e.message === topMessage).length;
    const hint =
      topMessage === "e.test is not a function"
        ? "학습 프로필·화자 패턴 RegExp 오류 — safeRegex 패치 배포 후 재시도."
        : topMessage.slice(0, 80);
    actions.push({
      id: "errors_today",
      priority: errorsToday >= 5 ? "now" : "soon",
      title: `오늘 오류 ${errorsToday}건`,
      advice: `최근: ${topRoute} — ${hint}${sameMessageCount > 1 ? ` (동일 ${sameMessageCount}회)` : ""}`,
      action: "하단 오류 로그에서 경로·메시지·stack(meta)를 확인하세요.",
    });
  }

  const topFails = charts.topFailReasons || feedback?.topFailReasons || [];
  if (topFails.length > 0) {
    const top = topFails[0];
    actions.push({
      id: "top_fail_reason",
      priority: "soon",
      title: "생성 실패·품질 이슈",
      advice: `최다 사유: ${top.reason || top.label} (${top.count || "—"}회)`,
      action: qtReport?.weakestCategory
        ? `품질 자동 테스트에서 ${qtReport.weakestCategory} 업종을 우선 보강하세요.`
        : "품질 자동 테스트를 돌려 약한 업종을 확인하세요.",
    });
  }

  if (publicTest.tableReady && sampleRuns7d >= 3 && signups30d === 0) {
    actions.push({
      id: "funnel_sample_no_signup",
      priority: "watch",
      title: "샘플은 쓰이는데 가입이 없음",
      advice: `최근 7일 샘플 성공 ${sampleRuns7d}건 · 누적 이용자 ${sampleUsers}명 · 30일 가입 ${signups30d}명`,
      action:
        "랜딩·가입 흐름은 유지한 채, 인스타 유입 랜딩·샘플 완료 후 CTA 노출만 모니터링하세요. (설정 변경 불필요)",
    });
  } else if (publicTest.tableReady && sampleRuns7d > 0) {
    actions.push({
      id: "funnel_sample_ok",
      priority: "watch",
      title: "발행 샘플 바로보기 — 정상 트래픽",
      advice: `최근 7일 샘플 ${sampleRuns7d}건 · 누적 ${sampleUsers}명. 인트로·즉시 샘플 경로는 그대로 두면 됩니다.`,
      action: null,
    });
  }

  if (!dailyCron?.ranAt) {
    actions.push({
      id: "cron_stale",
      priority: "soon",
      title: "일일 개발 루프 스냅샷 없음",
      advice: "자정 크론이 돌지 않으면 인사이트 후보·전일 지표가 비어 있습니다.",
      action: "BRICLOG_CRON_SECRET과 /api/cron/daily-develop 스케줄을 확인하세요.",
    });
  }

  for (const gap of readiness?.gaps || []) {
    if ((gap.pct ?? 100) >= 85) continue;
    actions.push({
      id: `gap_${gap.id}`,
      priority: gap.pct < 60 ? "soon" : "watch",
      title: `${gap.label} 보완 여지`,
      advice: gap.note || `준비도 ${gap.pct}%`,
      action:
        gap.id === "billing"
          ? "6월 말 Toss 연동 전까지 베타 무료 정책 유지 — 가입 흐름은 그대로."
          : gap.id === "multi_channel"
            ? "채널 SLA 리포트에서 실패 채널만 집중 보강."
            : null,
    });
  }

  actions.sort(
    (a, b) => (PRIORITY[a.priority]?.order ?? 9) - (PRIORITY[b.priority]?.order ?? 9)
  );

  let headline = "운영 상태 양호 — 샘플·엔진·스키마가 기본선을 충족합니다.";
  if (actions.some((a) => a.priority === "now")) {
    headline = "지금 손봐야 할 인프라·오류가 있습니다.";
  } else if (pendingInsights.length > 0) {
    headline = `품질 인사이트 ${pendingInsights.length}건 검토가 우선입니다.`;
  } else if (sampleRuns7d >= 3 && signups30d === 0) {
    headline = "샘플 이용은 있는데 가입 전환은 아직 없습니다 — 관찰 모드.";
  }

  const sampleToSignupPct = pct(signups30d, sampleUsers);

  return {
    generatedAt: new Date().toISOString(),
    headline,
    healthScore: readiness?.total ?? null,
    healthBand: readiness?.band ?? null,
    funnel: {
      visitsToday,
      signupsToday,
      signups30d,
      sampleRuns7d,
      sampleUsers,
      sampleToSignupPct,
      introNote: "인트로·발행 샘플 바로보기·가입 흐름 — 현 설정 유지",
    },
    engineOps: {
      ok: engineOps.ok,
      notes: (engineOps.notes || []).filter(Boolean),
    },
    live: live
      ? {
          onlineUsers: live.onlineUsers?.length ?? 0,
          activeUsersToday: live.activeUsersToday ?? 0,
          errorsToday: live.errorsToday ?? 0,
        }
      : null,
    pendingInsightsCount: pendingInsights.length,
    topTopics: publicTest.topTopics?.slice(0, 5) || [],
    topBrands: publicTest.topBrands?.slice(0, 5) || [],
    quality: {
      avg30d: quality.avgScore30d ?? cards.avgQuality30d ?? null,
      pendingInsights: quality.pendingInsightsCount ?? pendingInsights.length,
      goodFeedbackPct: charts.feedbackPie?.goodPct ?? null,
    },
    actions: actions.slice(0, 12),
    readinessGaps: (readiness?.gaps || []).slice(0, 4),
  };
}

export { PRIORITY };
