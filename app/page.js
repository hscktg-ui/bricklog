"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Dashboard from "@/components/Dashboard";
import AuthForm from "@/components/AuthForm";
import LandingPage from "@/components/landing/LandingPage";
import { LandingPreviewProvider } from "@/components/landing/LandingPreviewContext";
import LandingDevicePreviewToggle from "@/components/landing/LandingDevicePreviewToggle";
import Toast from "@/components/Toast";
import BriclogAssistant from "@/components/assistant/BriclogAssistant";
import TermsConsentModal from "@/components/auth/TermsConsentModal";
import ProfileCompletionModal from "@/components/auth/ProfileCompletionModal";
import {
  clearProfileModalDefer,
  deferProfileModalUntilNextSignIn,
  isProfileModalDeferredForUser,
  profileNeedsSetup,
  profileNeedsSetupModal,
} from "@/lib/auth/profilePersonalization";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { isEmailVerified } from "@/lib/auth/emailVerification";
import EmailVerifyBanner from "@/components/auth/EmailVerifyBanner";
import LoggedInDebugTools from "@/components/dev/LoggedInDebugTools";
import PageLoadingState from "@/components/ui/PageLoadingState";
import { LOADING } from "@/lib/product/craft";

export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState(null);
  const [profileModalDeferred, setProfileModalDeferred] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const lastUserIdRef = useRef(null);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info",
  });
  const [forceLanding, setForceLanding] = useState(false);

  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type });
  }, []);

  const loadProfile = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const data = await Promise.race([
        fetchWithAuth("/api/auth/profile"),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("profile_timeout")), 8_000)
        ),
      ]);
      setProfile(data.profile ?? null);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
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
      } catch (err) {
        // 세션 읽기 타임아웃은 로그아웃이 아님 — 기존 로그인 UI 유지
        if (err?.message === "auth_timeout") {
          setLoading(false);
          return;
        }
        setUser(null);
        setProfile(null);
        return;
      }
      const u = sessionData?.session?.user;
      if (u) {
        setUser({
          id: u.id,
          email: u.email ?? "",
          emailVerified: isEmailVerified(u),
        });
        setAuthMode(null);
        setLoading(false);
        void loadProfile();
        void (async () => {
          try {
            await Promise.race([
              fetchWithAuth("/api/auth/profile", { method: "POST" }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("profile_upsert_timeout")), 8_000)
              ),
            ]);
            await loadProfile();
          } catch {
            /* profiles 테이블 미적용·타임아웃 시 대시보드는 유지 */
          }
        })();
      } else {
        setUser(null);
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      showToast(decodeURIComponent(err), "error");
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
    if (params.get("landing") === "1") {
      setForceLanding(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("landing");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [showToast]);

  useEffect(() => {
    if (!user?.id) return;
    lastUserIdRef.current = user.id;
    setProfileModalDeferred(isProfileModalDeferredForUser(user.id));
    setAuthMode(null);
    setLoading(false);
    if (typeof document !== "undefined") {
      document.body.style.pointerEvents = "";
      document.documentElement.style.pointerEvents = "";
    }
    window.dispatchEvent(new CustomEvent("briclog-dismiss-loading-overlay"));
  }, [user?.id]);

  useEffect(() => {
    if (!loading) return undefined;
    const t = window.setTimeout(() => setLoading(false), 3_000);
    return () => window.clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (!profileLoading) return undefined;
    const t = window.setTimeout(() => setProfileLoading(false), 10_000);
    return () => window.clearTimeout(t);
  }, [profileLoading]);

  useEffect(() => {
    syncUser();
    if (!isSupabaseConfigured) return undefined;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && lastUserIdRef.current) {
        clearProfileModalDefer(lastUserIdRef.current);
        lastUserIdRef.current = null;
        setProfileModalDeferred(false);
      }
      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "SIGNED_OUT"
      ) {
        syncUser();
      } else {
        syncUser();
      }
    });
    return () => subscription.unsubscribe();
  }, [syncUser]);

  useEffect(() => {
    if (!toast.visible) return;
    const ms =
      toast.type === "error" ? 4200 : toast.type === "success" ? 2400 : 3000;
    const t = setTimeout(
      () => setToast((prev) => ({ ...prev, visible: false })),
      ms
    );
    return () => clearTimeout(t);
  }, [toast.visible, toast.message, toast.type]);

  const openAuth = useCallback((mode) => {
    setAuthMode(mode === "signup" ? "signup" : "login");
  }, []);

  const openStart = useCallback(() => {
    setAuthMode("signup");
  }, []);

  const handleTermsComplete = useCallback(() => {
    loadProfile();
  }, [loadProfile]);

  const needsTerms =
    Boolean(user) &&
    !profileLoading &&
    profile?.needsTermsConsent === true;

  const profileIncomplete =
    Boolean(user) && !profileLoading && !needsTerms && profileNeedsSetup(profile);

  const autoProfileModal =
    profileIncomplete &&
    profileNeedsSetupModal(profile, {
      userId: user?.id,
      deferredUntilNextSignIn: profileModalDeferred,
    });

  const showProfileModal = autoProfileModal || profileModalOpen;

  const pageDebugSnapshot = useMemo(
    () => ({
      loading,
      profileLoading,
      needsTerms,
      profileIncomplete,
      showProfileModal,
      hasUser: Boolean(user?.id),
    }),
    [
      loading,
      profileLoading,
      needsTerms,
      profileIncomplete,
      showProfileModal,
      user?.id,
    ]
  );

  const handleProfileModalDefer = useCallback(() => {
    if (user?.id) {
      deferProfileModalUntilNextSignIn(user.id);
      setProfileModalDeferred(true);
    }
    setProfileModalOpen(false);
  }, [user?.id]);

  const handleProfileModalComplete = useCallback(() => {
    setProfileModalOpen(false);
    loadProfile();
  }, [loadProfile]);

  const handleRequestProfileSetup = useCallback(() => {
    setProfileModalOpen(true);
  }, []);

  if (loading) {
    return (
      <PageLoadingState
        message="브릭로그를 준비하는 중…"
        hint="3초 이상 걸리면 네트워크를 확인한 뒤 새로고침해 주세요."
      />
    );
  }

  if (!user || forceLanding) {
    return (
      <LandingPreviewProvider>
        {user && forceLanding ? (
          <div className="fixed left-0 right-0 top-0 z-[110] flex justify-center p-3 pointer-events-none">
            <button
              type="button"
              onClick={() => setForceLanding(false)}
              className="pointer-events-auto rounded-full border border-[#E8EBED] bg-white px-4 py-2 text-[13px] font-semibold text-[#191F28] shadow-md hover:bg-[#F7F8FA]"
            >
              작업실로 돌아가기
            </button>
          </div>
        ) : null}
        <LandingPage onAuthOpen={openAuth} onStart={openStart} />
        {authMode && (
          <div
            className="pointer-events-none fixed inset-0 z-[95] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
            role="dialog"
            aria-modal="true"
          >
            <div
              role="presentation"
              aria-hidden
              className="pointer-events-auto absolute inset-0 bg-black/40"
              onClick={() => setAuthMode(null)}
            />
            <div className="pointer-events-auto relative z-10 w-full max-h-[92dvh] overflow-y-auto sm:max-w-md">
              <AuthForm
                embedded
                initialMode={authMode}
                onClose={() => setAuthMode(null)}
                onToast={showToast}
                onAuthSuccess={syncUser}
              />
            </div>
          </div>
        )}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
        />
        {!authMode && (
          <>
            <LandingDevicePreviewToggle />
            <BriclogAssistant layout="landing" />
          </>
        )}
      </LandingPreviewProvider>
    );
  }

  if (profileLoading && !profile) {
    return (
      <PageLoadingState
        message={LOADING.profile}
        hint={LOADING.profileHint}
      />
    );
  }

  if (needsTerms) {
    return (
      <LoggedInDebugTools pageSnapshot={pageDebugSnapshot}>
        <div
          className="pointer-events-none flex min-h-[100dvh] items-center justify-center bg-[#F7F8FA] p-4 opacity-40"
          aria-hidden
        >
          <Dashboard
            user={user}
            profile={profile}
            demoMode={false}
            onProfileRefresh={loadProfile}
          />
        </div>
        <TermsConsentModal
          onToast={showToast}
          onComplete={handleTermsComplete}
        />
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
        />
      </LoggedInDebugTools>
    );
  }

  if (profileIncomplete) {
    return (
      <LoggedInDebugTools pageSnapshot={pageDebugSnapshot}>
        <Dashboard
          user={user}
          profile={profile}
          demoMode={false}
          onProfileRefresh={loadProfile}
          suppressProfileBanner={showProfileModal}
          onRequestProfileSetup={handleRequestProfileSetup}
        />
        {showProfileModal ? (
          <ProfileCompletionModal
            userId={user.id}
            onToast={showToast}
            onComplete={handleProfileModalComplete}
            onDefer={handleProfileModalDefer}
          />
        ) : null}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
        />
      </LoggedInDebugTools>
    );
  }

  return (
    <LoggedInDebugTools pageSnapshot={pageDebugSnapshot}>
      <div className="flex min-h-dvh flex-1 flex-col">
        {user && user.emailVerified === false ? (
          <EmailVerifyBanner email={user.email} onToast={showToast} />
        ) : null}
        <div className="min-h-0 flex-1 pointer-events-auto">
          <Dashboard
            user={user}
            profile={profile}
            demoMode={false}
            onProfileRefresh={loadProfile}
            suppressProfileBanner={false}
            onRequestProfileSetup={handleRequestProfileSetup}
          />
          {profileModalOpen && profileNeedsSetup(profile) ? (
            <ProfileCompletionModal
              userId={user.id}
              onToast={showToast}
              onComplete={handleProfileModalComplete}
              onDefer={handleProfileModalDefer}
            />
          ) : null}
        </div>
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
        />
      </div>
    </LoggedInDebugTools>
  );
}
