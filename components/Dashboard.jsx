"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import BlogEditor from "@/components/BlogEditor";
import PlaceGenerator from "@/components/PlaceGenerator";
import InstagramGenerator from "@/components/InstagramGenerator";
import DailyTimelinessPanel from "@/components/DailyTimelinessPanel";
import PricingModal from "@/components/billing/PricingModal";
import { BrandWorkspaceProvider, useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import BrandWorkspaceGate from "@/components/BrandWorkspaceGate";
import Header from "@/components/Header";
import ChannelWelcomeScreen from "@/components/ChannelWelcomeScreen";
import {
  completeChannelOnboarding,
  DEFAULT_USER_PREFERENCES,
  loadUserPreferences,
  resetChannelOnboarding,
  saveUserPreferences,
  seedPreferencesAfterWorkspaceReset,
} from "@/lib/user/userPreferences";
import {
  resetBriclogWorkspace,
  reloadAfterReset,
} from "@/lib/user/resetWorkspace";
import HistoryWorkspace from "@/components/history/HistoryWorkspace";
import Sidebar from "@/components/Sidebar";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";
import { CONTENT_HISTORY_SAVED_EVENT } from "@/lib/history/contentHistoryEvents";
import {
  ContentProvider,
  useContentForm,
  useContentPipeline,
  useContentPipelineState,
} from "@/context/ContentContext";
import ClickBlockerDebugPanel from "@/components/dev/ClickBlockerDebugPanel";
import GenerationLoadingOverlayHost from "@/components/GenerationLoadingOverlayHost";
import GenerationWakeLockHost from "@/components/GenerationWakeLockHost";
import BriclogAssistantHost from "@/components/BriclogAssistantHost";
import BriclogAssistant from "@/components/assistant/BriclogAssistant";
import WorkspaceIdleHint from "@/components/WorkspaceIdleHint";
import WelcomeOverlay, {
  WELCOME_DISMISS_SESSION_KEY,
  isWelcomeDismissedPermanent,
} from "@/components/WelcomeOverlay";
import GrowthStudio from "@/components/growth/GrowthStudio";
import ContentPlanWorkspace from "@/components/workspace/ContentPlanWorkspace";
import { recordDashboardVisit } from "@/lib/dashboard/visitCounter";
import {
  mapLastContentItem,
  resolveDirectorName,
} from "@/lib/dashboard/welcomeDirector";
import {
  buildWelcomeGreeting,
  defaultMenuFromProfile,
  profileNeedsSetup,
} from "@/lib/auth/profilePersonalization";
import ProfileSetupBanner from "@/components/ProfileSetupBanner";
import BriclogNextHomeStrip from "@/components/BriclogNextHomeStrip";
import { WorkspacePreviewProvider } from "@/context/WorkspacePreviewContext";
import MobileBottomNav from "@/components/workspace/MobileBottomNav";
import { useMobileSidebar } from "@/hooks/useMobileSidebar";
import { CHANNEL_PRODUCTS, normalizeWorkspaceMenuId } from "@/lib/channels/channelProducts";
import {
  fetchGenerationById,
  fetchGenerations,
  mapRecordToResults,
} from "@/lib/generations";
import { isProfileAdmin } from "@/lib/auth/profileClient";
import { supabase } from "@/lib/supabaseClient";
import { fetchWithAuth } from "@/lib/api/clientAuth";
import { stopBgm } from "@/lib/audio/briclogBgm";
import DebugStatePublisher from "@/components/dev/DebugStatePublisher";
import { isFastOnboarding } from "@/lib/config/productFlags";

export default function Dashboard({
  user,
  profile = null,
  demoMode = false,
  onProfileRefresh,
  suppressProfileBanner = false,
  onRequestProfileSetup,
}) {
  const [activeMenu, setActiveMenu] = useState(() =>
    defaultMenuFromProfile(profile)
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [historyResults, setHistoryResults] = useState({
    blog: null,
    smartplace: null,
    insta: null,
    hashtag: null,
    imagePrompt: null,
  });

  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "info",
  });
  const showToast = useCallback((message, type = "info") => {
    setToast({ visible: true, message, type });
  }, []);

  const [billingPlanId, setBillingPlanId] = useState("free");
  const [billingBypassQuotas, setBillingBypassQuotas] = useState(false);
  const profileMenuInitRef = useRef(false);

  const refreshBillingPlan = useCallback(() => {
    if (demoMode) return;
    fetchWithAuth("/api/billing/usage")
      .then((res) => {
        if (res?.usage?.planId) setBillingPlanId(res.usage.planId);
        if (res?.usage?.bypassQuotas != null) {
          setBillingBypassQuotas(Boolean(res.usage.bypassQuotas));
        }
      })
      .catch(() => {});
  }, [demoMode]);

  useEffect(() => () => stopBgm({ immediate: true }), []);

  useEffect(() => {
    if (!profile || profileMenuInitRef.current) return;
    profileMenuInitRef.current = true;
    setActiveMenu(defaultMenuFromProfile(profile));
  }, [profile]);

  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    fetchWithAuth("/api/billing/usage")
      .then((res) => {
        if (!cancelled && res?.usage?.planId) {
          setBillingPlanId(res.usage.planId);
          setBillingBypassQuotas(Boolean(res.usage.bypassQuotas));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [demoMode, user?.id]);

  useEffect(() => {
    try {
      const msg = sessionStorage.getItem("briclog-flash");
      if (msg) {
        sessionStorage.removeItem("briclog-flash");
        showToast(msg, "info");
      }
    } catch {
      /* ignore */
    }
  }, [showToast]);

  useEffect(() => {
    if (!toast.visible) return;
    const t = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2800);
    return () => clearTimeout(t);
  }, [toast.visible, toast.message]);

  const loadHistory = useCallback(async (brandId) => {
    if (demoMode) {
      setHistoryRecords([]);
      return;
    }
    setHistoryLoading(true);
    try {
      let sinceIso = null;
      try {
        const billing = await fetchWithAuth("/api/billing/usage");
        const days = billing?.usage?.entitlements?.historyDays;
        if (days != null) {
          const d = new Date();
          d.setDate(d.getDate() - days);
          sinceIso = d.toISOString();
        }
      } catch {
        /* ignore */
      }
      const list = await fetchGenerations(user.id, {
        sinceIso,
        brandId: brandId || undefined,
      });
      setHistoryRecords(list);
    } catch (err) {
      showToast(err.message || "기록을 불러오지 못했습니다.", "error");
    } finally {
      setHistoryLoading(false);
    }
  }, [user.id, showToast, demoMode]);

  useEffect(() => {
    if (activeMenu === "history") loadHistory();
  }, [activeMenu, loadHistory]);

  useEffect(() => {
    const onHistorySaved = () => {
      if (activeMenu === "history") void loadHistory();
    };
    window.addEventListener(CONTENT_HISTORY_SAVED_EVENT, onHistorySaved);
    return () =>
      window.removeEventListener(CONTENT_HISTORY_SAVED_EVENT, onHistorySaved);
  }, [activeMenu, loadHistory]);

  useEffect(() => {
    if (!selectedHistoryId) {
      setSelectedRecord(null);
      setHistoryResults({
        blog: null,
        smartplace: null,
        insta: null,
        hashtag: null,
        imagePrompt: null,
      });
      return;
    }
    (async () => {
      try {
        const record = await fetchGenerationById(user.id, selectedHistoryId);
        setSelectedRecord(record);
        setHistoryResults(mapRecordToResults(record));
      } catch (err) {
        showToast(err.message || "상세를 불러오지 못했습니다.", "error");
      }
    })();
  }, [selectedHistoryId, user.id, showToast]);

  const handleCopy = async (text, message) => {
    if (!text) {
      showToast("복사할 내용이 없습니다.", "error");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast(message || "클립보드에 복사되었습니다.", "success");
    } catch {
      showToast("복사에 실패했습니다.", "error");
    }
  };

  const handleLogout = async () => {
    if (demoMode) {
      showToast("데모 모드", "info");
      return;
    }
    await supabase.auth.signOut();
    showToast("로그아웃되었습니다.", "info");
  };

  const userLabel = demoMode
    ? "데모"
    : resolveDirectorName(profile, user);

  return (
    <BrandWorkspaceProvider userId={user.id} demoMode={demoMode}>
      <WorkspacePreviewProvider>
        <DashboardWithBrands
          user={user}
          profile={profile}
          demoMode={demoMode}
          billingPlanId={billingPlanId}
          billingBypassQuotas={billingBypassQuotas}
          showToast={showToast}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          historyRecords={historyRecords}
          historyLoading={historyLoading}
          loadHistory={loadHistory}
          selectedHistoryId={selectedHistoryId}
          setSelectedHistoryId={setSelectedHistoryId}
          selectedRecord={selectedRecord}
          historyResults={historyResults}
          onHistoryResultsChange={setHistoryResults}
          handleCopy={handleCopy}
          handleLogout={handleLogout}
          userLabel={userLabel}
          toast={toast}
          onProfileRefresh={onProfileRefresh}
          onBillingPlanRefresh={refreshBillingPlan}
          suppressProfileBanner={suppressProfileBanner}
          onRequestProfileSetup={onRequestProfileSetup}
        />
      </WorkspacePreviewProvider>
    </BrandWorkspaceProvider>
  );
}

function DashboardWithBrands({
  user,
  profile,
  demoMode,
  billingPlanId = "free",
  billingBypassQuotas = false,
  showToast,
  activeMenu,
  setActiveMenu,
  mobileOpen,
  setMobileOpen,
  historyRecords,
  historyLoading,
  loadHistory,
  selectedHistoryId,
  setSelectedHistoryId,
  selectedRecord,
  historyResults,
  onHistoryResultsChange,
  handleCopy,
  handleLogout,
  userLabel,
  toast,
  onProfileRefresh,
  onBillingPlanRefresh,
  suppressProfileBanner = false,
  onRequestProfileSetup,
}) {
  const brandWs = useBrandWorkspace();
  const loadHistoryForBrand = useCallback(
    () => loadHistory(brandWs.activeBrandId),
    [loadHistory, brandWs.activeBrandId]
  );
  const brandHooks = useMemo(
    () => ({
      activeBrand: brandWs.activeBrand,
      activeBrandId: brandWs.activeBrandId,
      blankBrandMode: brandWs.blankBrandMode,
      ensureBrandFromForm: brandWs.ensureBrandFromForm,
      resolveBrandFromFormSync: brandWs.resolveBrandFromFormSync,
      buildProvisionalBrandFromForm: brandWs.buildProvisionalBrandFromForm,
      updateActiveBrand: brandWs.updateActiveBrand,
      onChannelSaved: (channel, content, plain) =>
        brandWs.saveChannelContent(channel, content, plain),
      onFormPersist: brandWs.persistFormToBrand,
      scheduleRefreshTick: brandWs.scheduleRefreshTick,
      launchFromPlan: brandWs.launchFromPlan,
      planLaunchIntent: brandWs.planLaunchIntent,
      consumePlanLaunchIntent: brandWs.consumePlanLaunchIntent,
      bumpScheduleRefresh: brandWs.bumpScheduleRefresh,
    }),
    [
      brandWs.activeBrand,
      brandWs.activeBrandId,
      brandWs.blankBrandMode,
      brandWs.ensureBrandFromForm,
      brandWs.resolveBrandFromFormSync,
      brandWs.buildProvisionalBrandFromForm,
      brandWs.updateActiveBrand,
      brandWs.saveChannelContent,
      brandWs.persistFormToBrand,
      brandWs.scheduleRefreshTick,
      brandWs.launchFromPlan,
      brandWs.planLaunchIntent,
      brandWs.consumePlanLaunchIntent,
      brandWs.bumpScheduleRefresh,
    ]
  );

  return (
    <ContentProvider
      user={user}
      demoMode={demoMode}
      billingPlanId={billingPlanId}
      billingBypassQuotas={billingBypassQuotas}
      onToast={showToast}
      onBillingPlanRefresh={refreshBillingPlan}
      brandHooks={brandHooks}
    >
      <BrandWorkspaceGate />
      <ClickBlockerDebugPanel />
      <DashboardLayout
        user={user}
        profile={profile}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        historyRecords={historyRecords}
        historyLoading={historyLoading}
        loadHistory={loadHistoryForBrand}
        selectedHistoryId={selectedHistoryId}
        setSelectedHistoryId={setSelectedHistoryId}
        selectedRecord={selectedRecord}
        historyResults={historyResults}
        onHistoryResultsChange={onHistoryResultsChange}
        handleCopy={handleCopy}
        handleLogout={handleLogout}
        userLabel={userLabel}
        demoMode={demoMode}
        toast={toast}
        showToast={showToast}
        onProfileRefresh={onProfileRefresh}
        onBillingPlanRefresh={onBillingPlanRefresh}
        suppressProfileBanner={suppressProfileBanner}
        onRequestProfileSetup={onRequestProfileSetup}
        billingPlanId={billingPlanId}
        billingBypassQuotas={billingBypassQuotas}
      />
    </ContentProvider>
  );
}

function DashboardLayout({
  user,
  profile,
  activeMenu,
  setActiveMenu,
  mobileOpen,
  setMobileOpen,
  historyRecords,
  historyLoading,
  loadHistory,
  selectedHistoryId,
  setSelectedHistoryId,
  selectedRecord,
  historyResults,
  onHistoryResultsChange,
  handleCopy,
  handleLogout,
  userLabel,
  demoMode,
  toast,
  showToast,
  onProfileRefresh,
  onBillingPlanRefresh,
  suppressProfileBanner = false,
  onRequestProfileSetup,
  billingPlanId = "free",
  billingBypassQuotas = false,
}) {
  useMobileSidebar(mobileOpen, setMobileOpen);

  const { blogInput, setBlogInput } = useContentForm();
  const {
    resetToHome,
    loadingOverlay,
    blogContent,
    placeContent,
    instagramContent,
    loadMemoryContentIntoWorkspace,
  } = useContentPipeline();
  const {
    switchBrand,
    activeBrandId,
    activeBrand,
    brandsLoading,
    resetAllBrands,
  } = useBrandWorkspace();
  const [confirmFreshStart, setConfirmFreshStart] = useState(false);
  const [freshStartBusy, setFreshStartBusy] = useState(false);
  const [userPrefs, setUserPrefs] = useState(DEFAULT_USER_PREFERENCES);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);
  const [visitCount, setVisitCount] = useState(1);
  const [lastPost, setLastPost] = useState(null);
  const welcomeInitRef = useRef(false);
  const resetAllBrandsRef = useRef(resetAllBrands);
  resetAllBrandsRef.current = resetAllBrands;

  useEffect(() => {
    setUserPrefs(loadUserPreferences(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("fresh") === "1" || params.get("reset") === "1") {
      void resetAllBrandsRef.current().catch(() => {});
      resetBriclogWorkspace(user.id, { full: true });
      seedPreferencesAfterWorkspaceReset(user.id);
      try {
        sessionStorage.setItem(
          "briclog-flash",
          "초기화되었습니다. 사이드바에서 브랜드를 추가하거나 샘플을 불러온 뒤 글을 작성해 주세요."
        );
      } catch {
        /* ignore */
      }
      window.history.replaceState({}, "", "/");
      reloadAfterReset();
    }
  }, [user.id]);

  const handleFreshStart = useCallback(async () => {
    setFreshStartBusy(true);
    try {
      await resetAllBrands();
      resetBriclogWorkspace(user.id, { full: true });
      seedPreferencesAfterWorkspaceReset(user.id);
      try {
        sessionStorage.setItem(
          "briclog-flash",
          "비웠습니다. 사이드바에서 「+ 브랜드 추가」로 시작해 주세요."
        );
      } catch {
        /* ignore */
      }
      setConfirmFreshStart(false);
      reloadAfterReset();
    } catch (err) {
      showToast(err?.message || "초기화에 실패했습니다.", "error");
    } finally {
      setFreshStartBusy(false);
    }
  }, [user.id, resetAllBrands, showToast]);

  const showChannelWelcome = !userPrefs.onboardingComplete;
  const blogGenerationCount = activeBrand?.contentArchive?.blog?.length ?? 0;
  const firstStoryFocus =
    !demoMode &&
    !showChannelWelcome &&
    activeMenu === "blog" &&
    blogGenerationCount === 0;
  const welcomeGreeting = buildWelcomeGreeting(profile, user);

  useEffect(() => {
    if (!isFastOnboarding() || demoMode || userPrefs.onboardingComplete) return;
    const next = completeChannelOnboarding(
      user.id,
      userPrefs.primaryChannel || "blog"
    );
    setUserPrefs(next);
    setActiveMenu(next.primaryChannel || "blog");
  }, [
    user.id,
    demoMode,
    userPrefs.onboardingComplete,
    userPrefs.primaryChannel,
    setActiveMenu,
  ]);

  useEffect(() => {
    if (welcomeInitRef.current || demoMode || showChannelWelcome || brandsLoading) {
      return undefined;
    }
    if (isWelcomeDismissedPermanent()) {
      welcomeInitRef.current = true;
      return undefined;
    }
    try {
      if (sessionStorage.getItem(WELCOME_DISMISS_SESSION_KEY) === "1") {
        welcomeInitRef.current = true;
        return undefined;
      }
    } catch {
      /* ignore */
    }

    welcomeInitRef.current = true;
    const count = recordDashboardVisit();
    setVisitCount(count);

    let cancelled = false;
    (async () => {
      let last = null;
      if (activeBrandId) {
        try {
          const q = new URLSearchParams({ brandId: activeBrandId });
          const data = await fetchWithAuth(`/api/memory/content?${q}`);
          last = mapLastContentItem(data.items?.[0]);
        } catch {
          /* memory optional */
        }
      }

      if (cancelled) return;
      setLastPost(last);
      setWelcomeOpen(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [showChannelWelcome, demoMode, brandsLoading, activeBrandId]);

  const [confirmChannelPicker, setConfirmChannelPicker] = useState(false);

  const reopenChannelWelcome = useCallback(() => {
    const next = resetChannelOnboarding(user.id);
    setUserPrefs(next);
    setActiveMenu(userPrefs.primaryChannel || "blog");
    setSelectedHistoryId(null);
    setMobileOpen(false);
  }, [user.id, userPrefs.primaryChannel, setMobileOpen]);

  const handleBrandChange = useCallback(
    (brandId) => {
      switchBrand(brandId);
    },
    [switchBrand]
  );

  const handleChannelSelect = useCallback(
    (channelId) => {
      const next = completeChannelOnboarding(user.id, channelId);
      setUserPrefs(next);
      setActiveMenu("plan");
      setSelectedHistoryId(null);
      setMobileOpen(false);
    },
    [user.id, setActiveMenu, setSelectedHistoryId, setMobileOpen]
  );

  const generationBusy = Boolean(loadingOverlay?.active);

  const handleMenuNavigate = useCallback(
    (menuId) => {
      const target = normalizeWorkspaceMenuId(menuId);
      if (generationBusy) {
        showToast?.(
          "이야기를 만드는 중이에요. 완료된 뒤 다른 메뉴로 이동할 수 있어요.",
          "info"
        );
        return;
      }
      startTransition(() => {
        if (showChannelWelcome) {
          if (["blog", "place", "insta", "image"].includes(target)) {
            handleChannelSelect(target);
            return;
          }
          const next = completeChannelOnboarding(
            user.id,
            userPrefs.primaryChannel || "blog"
          );
          setUserPrefs(next);
        }
        setActiveMenu(target);
        if (target === "history") setSelectedHistoryId(null);
        setMobileOpen(false);
      });
    },
    [
      showChannelWelcome,
      handleChannelSelect,
      user.id,
      userPrefs.primaryChannel,
      setMobileOpen,
      setSelectedHistoryId,
      generationBusy,
      showToast,
    ]
  );

  useEffect(() => {
    if (generationBusy) setWelcomeOpen(false);
  }, [generationBusy]);

  const goHome = useCallback(() => {
    if (generationBusy) {
      showToast(
        "이야기를 만드는 중이에요. 완료된 뒤 이동할 수 있어요.",
        "info"
      );
      return;
    }
    const home = userPrefs.primaryChannel || "blog";
    setActiveMenu(home);
    setSelectedHistoryId(null);
    resetToHome();
    setMobileOpen(false);
  }, [
    userPrefs.primaryChannel,
    setActiveMenu,
    setSelectedHistoryId,
    resetToHome,
    setMobileOpen,
    generationBusy,
    showToast,
  ]);

  const goBlog = () => setActiveMenu("blog");
  const navigate = (menu) => setActiveMenu(normalizeWorkspaceMenuId(menu));

  const workspaceMenus = new Set(["blog", "place", "insta", "plan", "growth"]);
  const idleHintActive =
    !showChannelWelcome && workspaceMenus.has(activeMenu);
  const showProfileSetupBanner =
    !demoMode &&
    !suppressProfileBanner &&
    !profileBannerDismissed &&
    profileNeedsSetup(profile);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    if (showChannelWelcome) setWelcomeOpen(false);
  }, [showChannelWelcome]);

  return (
    <div className="briclog-vision-workspace relative flex h-full min-h-0 flex-1 overflow-hidden">
      <GenerationLoadingOverlayHost />
      <GenerationWakeLockHost />
      {welcomeOpen && !showChannelWelcome ? (
        <WelcomeOverlay
          open
          greetingHeadline={welcomeGreeting.headline}
          greetingSub={welcomeGreeting.sub}
          visitCount={visitCount}
          lastPost={lastPost}
          onDismiss={() => setWelcomeOpen(false)}
        />
      ) : null}

      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 pointer-events-auto">
      <Sidebar
        activeMenu={activeMenu}
        onHome={goHome}
        onMenuChange={handleMenuNavigate}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        focusMode={firstStoryFocus}
        menuNavigateBlocked={generationBusy}
        onMenuNavigateBlocked={() =>
          showToast(
            "이야기를 만드는 중이에요. 완료된 뒤 다른 메뉴로 이동할 수 있어요.",
            "info"
          )
        }
        onLogout={handleLogout}
        showAdminLink={!demoMode && isProfileAdmin(profile)}
        demoMode={demoMode}
        primaryChannel={userPrefs.primaryChannel}
        showChannelWelcome={showChannelWelcome}
        onChangeStartChannel={() => setConfirmChannelPicker(true)}
        onResetWorkspace={() => setConfirmFreshStart(true)}
        onUpgradeClick={() => setPricingOpen(true)}
        onBrandChange={handleBrandChange}
        userId={user?.id}
        onToast={showToast}
        profile={profile}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Header
          onHome={goHome}
          userName={userLabel}
          activeMenu={activeMenu}
          headerTitle={
            showChannelWelcome
              ? "시작하기"
              : firstStoryFocus
                ? "오늘의 편집본"
                : undefined
          }
          onOpenSidebar={() => setMobileOpen(true)}
          demoMode={demoMode}
          billingPlanId={billingPlanId}
          billingBetaActive={billingBypassQuotas}
          onPlanChange={() => setPricingOpen(true)}
          onOpenProfile={onRequestProfileSetup}
          onLogout={handleLogout}
        />

        {showProfileSetupBanner && (
          <ProfileSetupBanner
            userId={user?.id}
            onToast={showToast}
            onOpenSetup={onRequestProfileSetup}
            onDismiss={() => setProfileBannerDismissed(true)}
          />
        )}

        {!showChannelWelcome && (
          <BriclogNextHomeStrip
            activeMenu={activeMenu}
            blogInput={blogInput}
            blogContent={blogContent}
            hasPlace={Boolean(placeContent)}
            hasInsta={Boolean(instagramContent)}
            onNavigate={navigate}
            generationBusy={generationBusy}
          />
        )}

        <WorkspaceIdleHint active={idleHintActive} />

        <main
          className="workspace-shell flex min-h-0 flex-1 flex-col overflow-hidden overflow-x-hidden pb-[calc(var(--workspace-mobile-nav-h)+env(safe-area-inset-bottom,0px))] lg:pb-0"
        >
          {showChannelWelcome ? (
            <ChannelWelcomeScreen
              onSelectChannel={handleChannelSelect}
              onSkip={() => handleChannelSelect("blog")}
              brandType={activeBrand?.brandType || "other"}
              industryLabel={activeBrand?.industry || ""}
              brandName={activeBrand?.brandName || ""}
            />
          ) : activeMenu === "blog" ? (
            <BlogEditor
              onNavigate={navigate}
              onCopy={(t) => handleCopy(t, "전체 콘텐츠가 복사되었습니다.")}
              userId={user.id}
              brandId={activeBrandId}
              onPlanChange={() => setPricingOpen(true)}
            />
          ) : activeMenu === "plan" || activeMenu === "review" || activeMenu === "image" ? (
            <ContentPlanWorkspace
              userId={user.id}
              brandId={activeBrandId}
              contentArchive={activeBrand?.contentArchive}
              onNavigate={navigate}
              onToast={showToast}
            />
          ) : activeMenu === "place" ? (
            <PlaceGenerator
              onGoBlog={goBlog}
              onCopy={(t) => handleCopy(t, "전체 콘텐츠가 복사되었습니다.")}
              userId={user.id}
              brandId={activeBrandId}
            />
          ) : activeMenu === "insta" ? (
            <InstagramGenerator
              onGoBlog={goBlog}
              onCopy={(t) => handleCopy(t, "전체 콘텐츠가 복사되었습니다.")}
              userId={user.id}
              brandId={activeBrandId}
            />
          ) : activeMenu === "growth" ? (
            <GrowthStudio
              userId={user.id}
              brandId={activeBrandId}
              brandName={activeBrand?.brandName || ""}
              contentArchive={activeBrand?.contentArchive}
              billingPlanId={billingPlanId}
              onCopy={(t) => handleCopy(t, "클립보드에 복사되었습니다.")}
              onToast={showToast}
              onUpgradeClick={() => setPricingOpen(true)}
              onOpenInWorkspace={(item) => {
                const ok = loadMemoryContentIntoWorkspace(item);
                if (!ok) return false;
                const menu =
                  item.channel === "blog"
                    ? "blog"
                    : item.channel === "place"
                      ? "place"
                      : "insta";
                handleMenuNavigate(menu);
                return true;
              }}
              onGoPlan={() => handleMenuNavigate("plan")}
            />
          ) : activeMenu === "history" ? (
            <HistoryWorkspace
              records={historyRecords}
              loading={historyLoading}
              selectedId={selectedHistoryId}
              onSelectId={setSelectedHistoryId}
              selectedRecord={selectedRecord}
              results={historyResults}
              onCopy={handleCopy}
              userId={user.id}
              demoMode={demoMode}
              onResultsChange={onHistoryResultsChange}
              onHistoryRefresh={loadHistory}
              onToast={showToast}
            />
          ) : null}
        </main>
      </div>
      </div>

      <MobileBottomNav
          activeMenu={showChannelWelcome ? null : activeMenu}
          drawerOpen={mobileOpen}
          onSelect={handleMenuNavigate}
          onOpenDrawer={() => setMobileOpen(true)}
          navigateBlocked={generationBusy}
        />
      <Toast toast={toast} />
      <ConfirmModal
        open={confirmChannelPicker}
        title="시작 채널 다시 고르기"
        message={
          "채널 선택 화면으로 돌아갑니다.\n\n· 지금 작성 중인 글은 유지됩니다\n· 왼쪽 메뉴에서 다른 채널을 기본으로 고를 수 있어요"
        }
        confirmLabel="채널 선택 화면 열기"
        onCancel={() => setConfirmChannelPicker(false)}
        onConfirm={() => {
          setConfirmChannelPicker(false);
          reopenChannelWelcome();
        }}
      />
      <ConfirmModal
        open={confirmFreshStart}
        title="기기·창고 비우기"
        message={
          "서버에 저장한 브랜드와 이 기기의 설정·작성 중인 내용을 모두 지웁니다.\n\n· 되돌릴 수 없습니다\n· 가입 계정(이메일)은 그대로입니다\n\n계속할까요?"
        }
        confirmLabel="비우기"
        variant="danger"
        busy={freshStartBusy}
        onCancel={() => setConfirmFreshStart(false)}
        onConfirm={handleFreshStart}
      />
      <PricingModal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        onToast={showToast}
        onPlanActivated={onBillingPlanRefresh}
      />
      <BriclogAssistantHost suppress={showChannelWelcome || firstStoryFocus} />
      <DebugStatePublisher
        fragmentKey="dashboard"
        snapshot={{
          loadingOverlayActive: Boolean(loadingOverlay?.active),
          loadingOverlay,
          welcomeOpen,
          showChannelWelcome,
          pricingOpen,
          confirmChannelPicker,
          confirmFreshStart,
          mobileOpen,
        }}
      />
    </div>
  );
}
