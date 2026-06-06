"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import Toast from "@/components/Toast";
import AuthForm from "@/components/AuthForm";
import EvolutionLabPanel from "@/components/admin/EvolutionLabPanel";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminOpsHub from "@/components/admin/AdminOpsHub";
import { StatCard } from "@/components/admin/AdminCharts";
import { isProfileAdmin } from "@/lib/auth/profileClient";

function AdminGateShell({ title, children }) {
  return (
    <div className="min-h-screen bg-[#F7F8FA] p-6 text-[#191F28]">
      <div className="mx-auto max-w-lg rounded-2xl border border-[#E8EBED] bg-white p-8 shadow-sm">
        <h1 className="text-[20px] font-bold">{title}</h1>
        <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-[#4E5968]">{children}</div>
        <p className="mt-6">
          <Link href="/" className="text-[13px] text-[#03A94D] hover:underline">
            작업실(메인)으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function AdminPageClient() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminApiOk, setAdminApiOk] = useState(false);
  const [accessChecking, setAccessChecking] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [stats, setStats] = useState(null);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const [qtRunning, setQtRunning] = useState(false);
  const [qtStatus, setQtStatus] = useState(null);
  const [qtReport, setQtReport] = useState(null);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [qtOptions, setQtOptions] = useState({
    maxHours: 10,
    maxCount: 300,
    targetScore: 90,
    includeSensitive: true,
  });
  const pollRef = useRef(null);

  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type });
  }, []);

  const verifyAdminByApi = useCallback(async () => {
    try {
      await fetchWithAuth("/api/admin/stats", { timeoutMs: 10_000 });
      return true;
    } catch {
      return false;
    }
  }, []);

  const syncUser = useCallback(async () => {
    try {
      if (!isSupabaseConfigured) {
        setUser(null);
        setProfile(null);
        return;
      }

      let sessionData = null;
      try {
        sessionData = await Promise.race([
          supabase.auth.getSession().then((r) => r.data),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("auth_timeout")), 4_000)
          ),
        ]);
      } catch {
        setUser(null);
        setProfile(null);
        return;
      }

      const u = sessionData?.session?.user ?? null;
      setUser(u);
      if (!u) {
        setProfile(null);
        return;
      }

      try {
        const res = await Promise.race([
          fetchWithAuth("/api/auth/profile"),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("profile_timeout")), 8_000)
          ),
        ]);
        setProfile(res.profile ?? null);
      } catch {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncUser();
    if (!isSupabaseConfigured) return undefined;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "TOKEN_REFRESHED"
      ) {
        setLoading(true);
        syncUser();
      }
    });
    return () => subscription.unsubscribe();
  }, [syncUser]);

  useEffect(() => {
    if (!loading) return undefined;
    const t = window.setTimeout(() => setLoading(false), 3_000);
    return () => window.clearTimeout(t);
  }, [loading]);

  const hasAdminAccess = isProfileAdmin(profile) || adminApiOk;

  useEffect(() => {
    if (loading || !user) {
      setAdminApiOk(false);
      setAccessChecking(false);
      return undefined;
    }
    if (isProfileAdmin(profile)) {
      setAdminApiOk(true);
      setAccessChecking(false);
      return undefined;
    }

    let cancelled = false;
    setAccessChecking(true);
    verifyAdminByApi().then((ok) => {
      if (cancelled) return;
      setAdminApiOk(ok);
      setAccessChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, user, profile, verifyAdminByApi]);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchWithAuth("/api/admin/stats");
      setStats(data.stats);
      setErrors(data.errors || []);
      setWarnings(data.warnings || []);
    } catch (err) {
      showToast(err.message, "error");
    }
  }, [showToast]);

  const loadInsights = useCallback(async (refresh = false) => {
    setInsightsLoading(true);
    try {
      const q = refresh ? "?refresh=1" : "";
      const data = await fetchWithAuth(`/api/admin/insights/pending${q}`);
      setInsights(data.insights || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setInsightsLoading(false);
    }
  }, [showToast]);

  const approveInsight = async (id) => {
    try {
      const data = await fetchWithAuth("/api/admin/insights/approve", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      const evolution =
        data?.insight?.evolutionRules ||
        data?.insight?.payload?.evolutionRulesApplied;
      const files = evolution?.files?.join(", ") || "";
      if (evolution?.applied) {
        showToast(
          files
            ? `승인 완료 — 전역 규칙 반영 (${files})`
            : "승인 완료 — 전역 엔진 규칙에 반영되었습니다.",
          "success"
        );
      } else {
        showToast(
          evolution?.reason === "unsupported_insight_type"
            ? "승인했으나 이 유형은 규칙 패치가 없습니다."
            : "인사이트를 승인했습니다.",
          "success"
        );
      }
      loadInsights();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const pollQtStatus = useCallback(async () => {
    try {
      const data = await fetchWithAuth("/api/admin/quality-training/status");
      setQtStatus(data);
      setQtRunning(data.status === "running");
      if (data.report) setQtReport(data.report);
      if (data.status === "finished" || data.status === "idle") {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        const rep = await fetchWithAuth("/api/admin/quality-training/report");
        if (rep.report) setQtReport(rep.report);
      }
    } catch (err) {
      showToast(err.message, "error");
    }
  }, [showToast]);

  useEffect(() => {
    if (!user || !hasAdminAccess || accessChecking) return;
    loadStats();
    loadInsights();
    pollQtStatus();
  }, [user, hasAdminAccess, accessChecking, loadStats, loadInsights, pollQtStatus]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startQualityTraining = async () => {
    try {
      await fetchWithAuth("/api/admin/quality-training/start", {
        method: "POST",
        body: JSON.stringify(qtOptions),
      });
      setQtRunning(true);
      showToast("품질 자동 테스트를 시작했습니다.", "success");
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(pollQtStatus, 8000);
      pollQtStatus();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const stopQualityTraining = async () => {
    try {
      await fetchWithAuth("/api/admin/quality-training/stop", { method: "POST" });
      showToast("중단 요청을 보냈습니다.", "info");
      pollQtStatus();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (loading) {
    return (
      <AdminGateShell title="BRICLOG 관리자">
        <p className="text-[#8B95A1]">접근 권한을 확인하는 중입니다…</p>
      </AdminGateShell>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AdminGateShell title="설정 필요">
        <p>Supabase 연동이 되어 있지 않아 관리자 페이지를 열 수 없습니다.</p>
      </AdminGateShell>
    );
  }

  if (!user) {
    return (
      <>
        <AdminGateShell title="관리자 로그인">
          <p>운영자 계정으로 로그인하면 이 페이지에서 바로 관리자 화면을 볼 수 있습니다.</p>
          <p className="text-[13px] text-[#8B95A1]">
            메인으로 돌아가지 않습니다. 여기서 로그인해 주세요.
          </p>
          {!showLogin ? (
            <button
              type="button"
              onClick={() => setShowLogin(true)}
              className="mt-2 w-full rounded-xl bg-[#03C75A] py-3 text-[14px] font-bold text-white"
            >
              로그인하기
            </button>
          ) : null}
        </AdminGateShell>
        {showLogin ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl">
              <AuthForm
                embedded
                initialMode="login"
                onClose={() => setShowLogin(false)}
                onToast={(message, type) => showToast(message, type)}
                onAuthSuccess={() => {
                  setShowLogin(false);
                  setLoading(true);
                  syncUser();
                }}
              />
            </div>
          </div>
        ) : null}
        <Toast visible={toast.visible} message={toast.message} type={toast.type} />
      </>
    );
  }

  if (accessChecking) {
    return (
      <AdminGateShell title="BRICLOG 관리자">
        <p className="text-[#8B95A1]">운영자 권한을 확인하는 중입니다…</p>
      </AdminGateShell>
    );
  }

  if (!hasAdminAccess) {
    const email = user.email || profile?.email || "(이메일 없음)";
    return (
      <AdminGateShell title="운영자 전용 페이지">
        <p>
          현재 로그인: <strong className="text-[#191F28]">{email}</strong>
        </p>
        <p>
          이 계정은 운영자 목록(
          <code className="rounded bg-[#F2F4F6] px-1 text-[12px]">BRICLOG_ADMIN_EMAILS</code>
          )에 없습니다. <strong>hscktg@gmail.com</strong>으로 로그인해야 합니다.
        </p>
      </AdminGateShell>
    );
  }

  const mem = stats?.memory;

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-6 text-[#191F28]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold">BRICLOG 관리자</h1>
            <p className="mt-1 text-[12px] text-[#8B95A1]">
              운영·품질·사용 추이 — 앱 내에서 확인
            </p>
          </div>
          <Link href="/" className="text-[13px] text-[#03A94D] hover:underline">
            앱으로 돌아가기
          </Link>
        </div>

        {warnings.length > 0 && (
          <ul className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        <AdminOpsHub onToast={showToast} />

        {!stats ? (
          <p className="text-[14px] text-[#8B95A1]">통계를 불러오는 중...</p>
        ) : (
          <>
            <AdminDashboard
              dashboard={stats.dashboard}
              billing={stats.billing}
            />

            <section className="mt-8">
              <h2 className="text-[15px] font-bold">레거시 요약</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="전체 브랜드" value={stats.brandCount} />
                <StatCard
                  label="오늘 AI 생성(usage_logs)"
                  value={stats.aiGenerationsToday ?? stats.openaiCallsToday}
                />
                <StatCard
                  label="오늘 generations 테이블"
                  value={stats.generationsToday}
                />
                <StatCard
                  label="오늘 이미지 생성"
                  value={stats.imageGenerationsToday ?? "—"}
                />
              </div>
            </section>

            {stats.feedback?.feedbackTablesReady && (
              <section className="mt-6 rounded-xl border border-[#E8EBED] bg-white p-4">
                <h2 className="text-[15px] font-bold">피드백·학습 루프</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="오늘 콘텐츠 저장"
                    value={stats.feedback.generationsToday ?? 0}
                    small
                  />
                  <StatCard
                    label="오늘 복사"
                    value={stats.feedback.copiesToday ?? 0}
                    small
                  />
                  <StatCard
                    label="복사율"
                    value={`${stats.feedback.copyRate ?? 0}%`}
                    small
                  />
                  <StatCard
                    label="재작성율"
                    value={`${stats.feedback.rewriteRate ?? 0}%`}
                    small
                  />
                  <StatCard
                    label="평균 품질점수"
                    value={stats.feedback.avgQuality ?? "—"}
                    small
                  />
                  <StatCard
                    label="활성 브랜드(오늘)"
                    value={stats.feedback.brandActivityCount ?? 0}
                    small
                  />
                </div>
                <p className="mt-3 text-[12px] text-[#8B95A1]">
                  피드백 — 좋음 {stats.feedback.feedbackRatios?.good ?? 0} · 보통{" "}
                  {stats.feedback.feedbackRatios?.neutral ?? 0} · 별로{" "}
                  {stats.feedback.feedbackRatios?.bad ?? 0}
                </p>
                {stats.feedback.topFailReasons?.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-[11px] text-[#4E5968]">
                    {stats.feedback.topFailReasons.slice(0, 5).map((e) => (
                      <li key={e.reason}>
                        {e.reason} ({e.count})
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {mem && (
              <section className="mt-6 rounded-xl border border-[#E8EBED] bg-white p-4">
                <h2 className="text-[15px] font-bold">메모리·성장 통계</h2>
                {!mem.memoryTablesReady && (
                  <p className="mt-2 text-[12px] text-amber-700">
                    schema-v3-memory.sql 미적용 — 메모리 테이블 없음
                  </p>
                )}
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    label="콘텐츠 기록"
                    value={mem.contentItemsCount ?? "—"}
                    small
                  />
                  <StatCard
                    label="브랜드 자료"
                    value={mem.brandAssetsCount ?? "—"}
                    small
                  />
                  <StatCard
                    label="성과 피드백"
                    value={mem.performanceCount ?? "—"}
                    small
                  />
                  <StatCard
                    label="AI·메모리 오류(최근)"
                    value={mem.aiFailuresToday ?? 0}
                    small
                  />
                </div>
                <p className="mt-3 text-[12px] text-[#8B95A1]">
                  채널별 기록 — 블로그 {mem.channelUsage?.blog ?? 0} · 플레이스{" "}
                  {mem.channelUsage?.place ?? 0} · 인스타{" "}
                  {mem.channelUsage?.instagram ?? 0}
                </p>
              </section>
            )}
          </>
        )}

        <p className="mt-4 text-[12px] text-[#8B95A1]">
          사용자당 일일 한도: {stats?.dailyLimitPerUser ?? 20}회
        </p>

        <section className="mt-8 rounded-xl border border-[#E8EBED] bg-white p-5">
          <h2 className="text-[16px] font-bold">품질 자동 테스트</h2>
          <p className="mt-1 text-[12px] text-[#8B95A1]">
            내부 품질 개선용 — 다양한 업종·채널로 생성·검수·재작성을 반복합니다.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-[12px] text-[#4E5968]">
              최대 시간(시간)
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
                value={qtOptions.maxHours}
                onChange={(e) =>
                  setQtOptions((o) => ({
                    ...o,
                    maxHours: Number(e.target.value) || 10,
                  }))
                }
                disabled={qtRunning}
              />
            </label>
            <label className="text-[12px] text-[#4E5968]">
              최대 생성 수
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
                value={qtOptions.maxCount}
                onChange={(e) =>
                  setQtOptions((o) => ({
                    ...o,
                    maxCount: Number(e.target.value) || 300,
                  }))
                }
                disabled={qtRunning}
              />
            </label>
            <label className="text-[12px] text-[#4E5968]">
              목표 점수
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-[#E8EBED] px-3 py-2 text-[13px]"
                value={qtOptions.targetScore}
                onChange={(e) =>
                  setQtOptions((o) => ({
                    ...o,
                    targetScore: Number(e.target.value) || 90,
                  }))
                }
                disabled={qtRunning}
              />
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[#4E5968] pt-6">
              <input
                type="checkbox"
                checked={qtOptions.includeSensitive}
                onChange={(e) =>
                  setQtOptions((o) => ({
                    ...o,
                    includeSensitive: e.target.checked,
                  }))
                }
                disabled={qtRunning}
              />
              민감 업종 포함
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startQualityTraining}
              disabled={qtRunning}
              className="rounded-lg bg-[#03C75A] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              품질 자동 테스트 시작
            </button>
            <button
              type="button"
              onClick={stopQualityTraining}
              disabled={!qtRunning}
              className="rounded-lg border border-[#E8EBED] px-4 py-2 text-[13px] disabled:opacity-50"
            >
              중단
            </button>
          </div>

          {qtStatus && qtStatus.status !== "idle" && (
            <div className="mt-4 rounded-lg bg-[#F7F8FA] p-3 text-[12px] text-[#4E5968]">
              <p>
                상태: {qtStatus.status === "running" ? "실행 중" : "종료"} ·
                진행 {qtStatus.completed ?? 0}/{qtStatus.total ?? 300} · 평균{" "}
                {qtStatus.avgScore ?? "—"}점 · 연속 통과{" "}
                {qtStatus.consecutivePass ?? 0} · 호출 {qtStatus.apiCalls ?? 0}
              </p>
              {qtStatus.stopReason && (
                <p className="mt-1 text-[#8B95A1]">
                  중단 사유: {qtStatus.stopReason}
                </p>
              )}
            </div>
          )}

          {qtReport && (
            <div className="mt-4 rounded-lg border border-[#E8EBED] p-3 text-[12px]">
              <p className="font-semibold">최근 리포트</p>
              <p className="mt-2">
                총 {qtReport.totalGenerated}건 · 평균 {qtReport.avgScore}점 ·
                90점 이상 {qtReport.passRate}%
              </p>
              {qtReport.weakestCategory && (
                <p className="mt-1 text-[#8B95A1]">
                  가장 약한 업종: {qtReport.weakestCategory}
                </p>
              )}
              {qtReport.topErrors?.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-[#4E5968]">
                  {qtReport.topErrors.slice(0, 5).map((e) => (
                    <li key={e.reason}>
                      {e.reason} ({e.count})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-[#E8EBED] bg-white p-5">
          <h2 className="text-[16px] font-bold">전역 품질 인사이트</h2>
          <p className="mt-1 text-[12px] text-[#8B95A1]">
            승인 시 global_engine_rules·프롬프트에 반영됩니다. 피드백 태그는
            승인 없이도 즉시 패치될 수 있습니다. 후보는 최근 14일 피드백·이벤트
            집계로 생성됩니다.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => loadInsights(true)}
              disabled={insightsLoading}
              className="rounded-lg border border-[#E8EBED] px-3 py-1.5 text-[12px] disabled:opacity-50"
            >
              후보 갱신·불러오기
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {insights.length === 0 && (
              <li className="text-[12px] text-[#8B95A1]">대기 중인 인사이트 없음</li>
            )}
            {insights.map((ins) => (
              <li
                key={ins.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-[#E8EBED] p-3 text-[12px]"
              >
                <div>
                  <p className="font-semibold text-[#191F28]">{ins.insight_type}</p>
                  <p className="mt-1 text-[#4E5968]">
                    {ins.payload?.message || JSON.stringify(ins.payload)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => approveInsight(ins.id)}
                  className="shrink-0 rounded-lg bg-[#03C75A] px-3 py-1 text-[12px] font-medium text-white"
                >
                  승인
                </button>
              </li>
            ))}
          </ul>
        </section>

        <EvolutionLabPanel onToast={showToast} />

        <section className="mt-8">
          <h2 className="text-[16px] font-bold">최근 오류 로그</h2>
          <ul className="mt-3 space-y-2">
            {errors.length === 0 && (
              <li className="text-[13px] text-[#8B95A1]">오류 없음</li>
            )}
            {errors.map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-[#E8EBED] bg-white p-3 text-[12px]"
              >
                <span className="font-semibold text-[#E42939]">{e.route}</span>
                <p className="mt-1 text-[#4E5968]">{e.message}</p>
                <p className="mt-1 text-[#8B95A1]">
                  {new Date(e.created_at).toLocaleString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}

