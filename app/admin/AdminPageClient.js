"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import Toast from "@/components/Toast";
import AuthForm from "@/components/AuthForm";
import AutoEvolutionStatusPanel from "@/components/admin/AutoEvolutionStatusPanel";
import HaeshinContentHub from "@/components/admin/HaeshinContentHub";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminAdvisoryPanel from "@/components/admin/AdminAdvisoryPanel";
import AdminOpsHub from "@/components/admin/AdminOpsHub";
import AdminProductOverviewPanel from "@/components/admin/AdminProductOverviewPanel";
import AdminQualityOpsPanel from "@/components/admin/AdminQualityOpsPanel";
import AdminCommandCenter from "@/components/admin/AdminCommandCenter";
import AdminSectionNav from "@/components/admin/AdminSectionNav";
import AdminSignupFunnelPanel from "@/components/admin/AdminSignupFunnelPanel";
import AdminCtaSourcePanel from "@/components/admin/AdminCtaSourcePanel";
import AdminLoginHintsPanel from "@/components/admin/AdminLoginHintsPanel";
import { buildAdminCommandCenter } from "@/lib/admin/buildAdminCommandCenter";
import { StatCard } from "@/components/admin/AdminCharts";
import { isProfileAdmin } from "@/lib/auth/profileClient";
import {
  ADMIN_EYEBROW,
  ADMIN_GATE,
  ADMIN_GATE_PANEL,
  ADMIN_GHOST_BTN,
  ADMIN_HEADLINE,
  ADMIN_INNER,
  ADMIN_LINK,
  ADMIN_PAGE,
  ADMIN_SUB,
} from "@/lib/admin/adminVision2030Styles";

function AdminGateShell({ title, subtitle, children, footer }) {
  return (
    <div className={ADMIN_GATE}>
      <div className={ADMIN_GATE_PANEL}>
        <p className={ADMIN_EYEBROW}>BRICLOG · Admin</p>
        <h1 className={`${ADMIN_HEADLINE} mt-2`}>{title}</h1>
        {subtitle ? <p className={`${ADMIN_SUB} mt-3`}>{subtitle}</p> : null}
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-6 border-t border-[var(--admin-line)] pt-5">{footer}</div> : null}
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
  const [stats, setStats] = useState(null);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [advisory, setAdvisory] = useState(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [productOverview, setProductOverview] = useState(null);
  const [qualityOps, setQualityOps] = useState(null);
  const [qualityOpsLoading, setQualityOpsLoading] = useState(false);
  const [adminSection, setAdminSection] = useState("now");
  const [showDetailMetrics, setShowDetailMetrics] = useState(false);
  const [signupFunnel, setSignupFunnel] = useState(null);
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

  const loadAdvisory = useCallback(async () => {
    setAdvisoryLoading(true);
    try {
      const data = await fetchWithAuth("/api/admin/advisory");
      setAdvisory(data.advisory || null);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAdvisoryLoading(false);
    }
  }, [showToast]);

  const loadProductOverview = useCallback(async () => {
    try {
      const data = await fetchWithAuth("/api/admin/product-overview");
      setProductOverview(data.snapshot || null);
    } catch {
      setProductOverview(null);
    }
  }, []);

  const loadQualityOps = useCallback(async () => {
    setQualityOpsLoading(true);
    try {
      const data = await fetchWithAuth("/api/admin/quality-ops");
      setQualityOps(data.snapshot || null);
    } catch {
      setQualityOps(null);
    } finally {
      setQualityOpsLoading(false);
    }
  }, []);

  const loadSignupFunnel = useCallback(async () => {
    try {
      const data = await fetchWithAuth("/api/admin/live");
      setSignupFunnel(data.funnel || null);
    } catch {
      setSignupFunnel(null);
    }
  }, []);

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
      loadAdvisory();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  useEffect(() => {
    if (!user || !hasAdminAccess || accessChecking) return;
    loadStats();
    loadAdvisory();
    loadInsights();
    loadProductOverview();
    loadQualityOps();
    loadSignupFunnel();
  }, [
    user,
    hasAdminAccess,
    accessChecking,
    loadStats,
    loadAdvisory,
    loadInsights,
    loadProductOverview,
    loadQualityOps,
    loadSignupFunnel,
  ]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const commandCenter = useMemo(
    () =>
      buildAdminCommandCenter({
        advisory,
        qualityOps,
        stats,
        errors,
      }),
    [advisory, qualityOps, stats, errors]
  );

  const commandLoading =
    advisoryLoading || qualityOpsLoading || (!stats && !advisory && !qualityOps);

  if (loading) {
    return (
      <AdminGateShell title="관리자" subtitle="접근 권한을 확인하는 중입니다…">
        <p className={ADMIN_SUB}>잠시만 기다려 주세요.</p>
      </AdminGateShell>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <AdminGateShell
        title="설정 필요"
        footer={
          <Link href="/" className={ADMIN_LINK}>
            작업실로 돌아가기
          </Link>
        }
      >
        <p className={ADMIN_SUB}>Supabase 연동이 되어 있지 않아 관리자 페이지를 열 수 없습니다.</p>
      </AdminGateShell>
    );
  }

  if (!user) {
    return (
      <>
        <AdminGateShell
          title="관리자 로그인"
          subtitle="운영자 계정으로 로그인하면 가입·품질·시스템 현황을 볼 수 있습니다."
          footer={
            <Link href="/" className={ADMIN_LINK}>
              작업실(랜딩)으로
            </Link>
          }
        >
          <AuthForm
            embedded
            initialMode="login"
            authContext="admin_gate"
            onClose={() => {}}
            onToast={(message, type) => showToast(message, type)}
            onAuthSuccess={() => {
              setLoading(true);
              syncUser();
            }}
          />
        </AdminGateShell>
        <Toast visible={toast.visible} message={toast.message} type={toast.type} />
      </>
    );
  }

  if (accessChecking) {
    return (
      <AdminGateShell title="관리자" subtitle="운영자 권한을 확인하는 중입니다…">
        <p className={ADMIN_SUB}>잠시만 기다려 주세요.</p>
      </AdminGateShell>
    );
  }

  if (!hasAdminAccess) {
    const email = user.email || profile?.email || "(이메일 없음)";
    return (
      <AdminGateShell
        title="운영자 전용"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                setLoading(true);
                syncUser();
              }}
              className={ADMIN_GHOST_BTN}
            >
              다른 계정으로 로그인
            </button>
            <Link href="/" className={ADMIN_LINK}>
              작업실로
            </Link>
          </div>
        }
      >
        <p className={ADMIN_SUB}>
          현재 로그인: <strong className="text-[var(--admin-ink,#0f1a14)]">{email}</strong>
        </p>
        <p className={`${ADMIN_SUB} mt-3`}>
          이 계정은 운영자 목록(
          <code className="rounded bg-[var(--admin-paper,#f7faf8)] px-1 text-[12px]">
            BRICLOG_ADMIN_EMAILS
          </code>
          )에 없습니다.
        </p>
      </AdminGateShell>
    );
  }

  const mem = stats?.memory;
  const operatorEmail = user.email || profile?.email || "";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLoading(true);
    syncUser();
  };

  return (
    <div className={ADMIN_PAGE}>
      <div className={ADMIN_INNER}>
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={ADMIN_EYEBROW}>BRICLOG · Admin</p>
            <h1 className={`${ADMIN_HEADLINE} md:text-[28px]`}>관리자</h1>
            <p className={`${ADMIN_SUB} mt-1 text-[12px]`}>
              {operatorEmail ? `${operatorEmail} · ` : ""}
              가입 · 품질 · 시스템
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link href="/" className={ADMIN_GHOST_BTN}>
              작업실로
            </Link>
            <button type="button" onClick={() => void handleSignOut()} className={ADMIN_LINK}>
              로그아웃
            </button>
          </div>
        </header>

        {warnings.length > 0 && (
          <ul className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-900">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        <AdminCommandCenter view={commandCenter} loading={commandLoading} />

        <AdminSectionNav active={adminSection} onChange={setAdminSection} />

        {adminSection === "now" && (
          <>
            <AdminCtaSourcePanel funnel={signupFunnel} compact />
            <AdminLoginHintsPanel funnel={signupFunnel} compact />
            <AdminSignupFunnelPanel funnel={signupFunnel} compact />
            <AdminAdvisoryPanel
              advisory={advisory}
              loading={advisoryLoading}
              insights={insights}
              insightsLoading={insightsLoading}
              onRefreshInsights={loadInsights}
              onApproveInsight={approveInsight}
              compact
            />
          </>
        )}

        {adminSection === "growth" && (
          <>
            <AdminCtaSourcePanel funnel={signupFunnel} />
            <AdminLoginHintsPanel funnel={signupFunnel} />
            <AdminOpsHub onToast={showToast} signupFunnel={signupFunnel} />
            <AdminAdvisoryPanel
              advisory={advisory}
              loading={advisoryLoading}
              insights={[]}
              insightsLoading={false}
              onRefreshInsights={loadInsights}
              onApproveInsight={approveInsight}
              compact={false}
            />
            <AdminProductOverviewPanel
              snapshot={productOverview}
              publicTest={stats?.dashboard?.publicBrandTest || {}}
            />
          </>
        )}

        {adminSection === "quality" && (
          <>
            <AdminQualityOpsPanel
              snapshot={qualityOps}
              loading={qualityOpsLoading}
              showHero={false}
            />
            <AutoEvolutionStatusPanel />
          </>
        )}

        {adminSection === "system" && (
          <>
            {!stats ? (
              <p className="text-[14px] text-[#8B95A1]">통계를 불러오는 중...</p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[15px] font-bold text-[#191F28]">상세 지표</h2>
                  <button
                    type="button"
                    onClick={() => setShowDetailMetrics((v) => !v)}
                    className="rounded-lg border border-[#E8EBED] bg-white px-3 py-1.5 text-[12px] text-[#4E5968]"
                  >
                    {showDetailMetrics ? "접기" : "펼치기"}
                  </button>
                </div>
                {showDetailMetrics && (
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
            <HaeshinContentHub showToast={showToast} />

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

            <p className="mt-4 text-[12px] text-[#8B95A1]">
              사용자당 일일 한도: {stats?.dailyLimitPerUser ?? 20}회
            </p>
          </>
        )}
      </>
    )}
      </div>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
      />
    </div>
  );
}

