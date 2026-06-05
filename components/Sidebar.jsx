import Icon from "./Icon";
import Logo from "./Logo";
import SidebarBrandStrip from "@/components/sidebar/SidebarBrandStrip";
import { useWorkspaceMaturity } from "@/hooks/useWorkspaceMaturity";
import { useBrandWorkspace } from "@/context/BrandWorkspaceContext";
import SidebarMoreSection from "@/components/sidebar/SidebarMoreSection";
import SidebarMobileShortcuts from "@/components/sidebar/SidebarMobileShortcuts";
import SidebarAccountMenu from "./SidebarAccountMenu";
import UsageMeter from "@/components/billing/UsageMeter";
import { useEffect, useMemo, useState } from "react";
import SoundLabelToggle from "@/components/audio/SoundLabelToggle";
import {
  areSoundsEnabled,
  setSoundsEnabled,
  unlockAudioFromUserGesture,
} from "@/lib/audio/briclogSounds";
import {
  areBgmEnabled,
  setBgmEnabled,
  startBgm,
  stopBgm,
} from "@/lib/audio/briclogBgm";
import { buildSidebarMenuSections } from "@/lib/channels/channelProducts";
import { buildSidebarPersonalization } from "@/lib/dashboard/sidebarPersonalization";
import {
  DEFAULT_USER_PREFERENCES,
  getSidebarMenuOrder,
} from "@/lib/user/userPreferences";
import { useSimpleWorkspaceMode } from "@/hooks/useSimpleWorkspaceMode";

function menuSectionsForMode(demoMode, menuOrder, simpleMode) {
  return buildSidebarMenuSections({ demoMode, menuOrder, simpleMode });
}

export default function Sidebar({
  activeMenu,
  onMenuChange,
  onHome,
  onBrandChange,
  mobileOpen,
  onMobileClose,
  menuNavigateBlocked = false,
  onMenuNavigateBlocked,
  onLogout,
  showAdminLink = false,
  demoMode = false,
  primaryChannel = "blog",
  showChannelWelcome = false,
  onResetWorkspace,
  onChangeStartChannel,
  onUpgradeClick,
  userId = null,
  onToast,
  profile = null,
  focusMode = false,
}) {
  const { activeBrand, brands } = useBrandWorkspace();
  const { showBrandWarehouse } = useWorkspaceMaturity({
    userId,
    brandCount: brands?.length ?? 0,
    enabled: Boolean(userId) && !demoMode,
  });
  const [mounted, setMounted] = useState(false);
  const [soundsOn, setSoundsOn] = useState(true);
  const [bgmOn, setBgmOn] = useState(false);
  const [menuOrder, setMenuOrder] = useState(null);
  const { simpleMode } = useSimpleWorkspaceMode(userId);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    setMenuOrder(getSidebarMenuOrder(userId));
  }, [userId]);

  const hub = useMemo(
    () =>
      buildSidebarPersonalization(profile, activeBrand, {
        primaryChannel: mounted ? primaryChannel : "blog",
      }),
    [profile, activeBrand, primaryChannel, mounted]
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setSoundsOn(areSoundsEnabled());
    setBgmOn(areBgmEnabled());
    const onSounds = () => setSoundsOn(areSoundsEnabled());
    const onBgm = () => setBgmOn(areBgmEnabled());
    window.addEventListener("briclog-sounds-changed", onSounds);
    window.addEventListener("briclog-bgm-changed", onBgm);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      setSoundsOn(areSoundsEnabled());
      setBgmOn(areBgmEnabled());
    };
    mq.addEventListener("change", onMotion);
    return () => {
      window.removeEventListener("briclog-sounds-changed", onSounds);
      window.removeEventListener("briclog-bgm-changed", onBgm);
      mq.removeEventListener("change", onMotion);
    };
  }, []);

  const effectivePrimary = mounted
    ? primaryChannel
    : DEFAULT_USER_PREFERENCES.primaryChannel;

  const asideMotionClass = focusMode
    ? mobileOpen
      ? "translate-x-0 pointer-events-auto lg:static lg:translate-x-0"
      : "-translate-x-full pointer-events-none lg:flex lg:static lg:translate-x-0 lg:pointer-events-auto"
    : mobileOpen
      ? "translate-x-0 pointer-events-auto"
      : "-translate-x-full pointer-events-none lg:pointer-events-auto lg:translate-x-0";

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? "작업 메뉴" : undefined}
        className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(240px,92vw)] max-w-[260px] flex-col border-r border-[#E8EBED] bg-white shadow-[4px_0_24px_rgba(0,0,0,0.06)] transition-transform duration-300 ease-out lg:static lg:h-auto lg:w-[200px] lg:max-w-none lg:translate-x-0 lg:shadow-none ${asideMotionClass}`}
      >
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between px-3 pt-3 pb-1">
          <Logo
            iconSize={26}
            showWordmark
            onClick={onHome}
            className="hidden lg:flex"
          />
          <p className="text-[13px] font-bold text-[#191F28] lg:hidden">메뉴</p>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg p-1.5 text-[#8B95A1] lg:hidden"
            aria-label="닫기"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <SidebarBrandStrip
          profile={profile}
          onBrandChange={onBrandChange}
          onMobileClose={onMobileClose}
          showBrandWarehouse={showBrandWarehouse}
        />

        {!demoMode && (
          <div className="shrink-0 border-b border-[#E8EBED]/80 px-2.5 py-2">
            <UsageMeter onUpgradeClick={onUpgradeClick} compact />
          </div>
        )}

        <SidebarMobileShortcuts
          activeMenu={activeMenu}
          onSelect={(id) => {
            if (menuNavigateBlocked) {
              onMenuNavigateBlocked?.();
              return;
            }
            onMenuChange(id);
          }}
          onClose={onMobileClose}
        />

        {/* 핵심 메뉴 */}
        <nav
          className="min-h-0 flex-1 overflow-y-auto px-2 py-1"
          aria-label="작업 메뉴"
        >
          {showChannelWelcome && (
            <p className="mx-2 mb-2 rounded-lg border border-[#03C75A]/30 bg-[#F0FFF5] px-2.5 py-2 text-[11px] leading-relaxed text-[#03A94D]">
              추천은 이야기예요. 아래 메뉴에서 바꿀 수 있어요.
            </p>
          )}
          {menuSectionsForMode(
            demoMode,
            mounted ? menuOrder : null,
            simpleMode
          ).map((section) => (
            <div key={section.id} className="mb-2 last:mb-0.5">
              <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold tracking-wide text-[#8B95A1]">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = activeMenu === item.id;
                  const isHomeChannel = item.id === effectivePrimary;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          unlockAudioFromUserGesture();
                          if (menuNavigateBlocked) {
                            onMenuNavigateBlocked?.();
                            return;
                          }
                          onMenuChange(item.id);
                          onMobileClose?.();
                        }}
                        className={`flex min-h-[38px] w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors active:brightness-[0.97] lg:min-h-[40px] lg:py-2 lg:text-[13px] ${
                          isActive
                            ? "bg-[#03C75A] text-white shadow-sm"
                            : "text-[#4E5968] hover:bg-[#F7F8FA]"
                        }`}
                      >
                        <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                          <Icon
                            name={item.icon}
                            className={`h-[17px] w-[17px] shrink-0 ${
                              isActive ? "text-white" : "text-[#8B95A1]"
                            }`}
                          />
                          <span className="flex-1 truncate">{item.label}</span>
                          {isHomeChannel && !isActive && (
                            <span className="shrink-0 text-[10px] text-[#03A94D]">
                              기본
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="mt-0.5 border-t border-[#E8EBED]/70 pt-1">
            <SidebarMoreSection
              onToast={onToast}
              demoMode={demoMode}
              onUpgradeClick={onUpgradeClick}
              showBrandWarehouse={showBrandWarehouse}
              onBrandChange={onBrandChange}
              onMobileClose={onMobileClose}
              brandWarehouseSummary={hub.summaries.warehouse}
              inNav
              userId={userId}
              primaryChannel={effectivePrimary}
              onMenuOrderSaved={setMenuOrder}
              onChangeStartChannel={onChangeStartChannel}
              onResetWorkspace={onResetWorkspace}
            />
          </div>
        </nav>

        {/* 하단: 소리 · 계정 */}
        <div className="shrink-0 border-t border-[#E8EBED] bg-white">
          <div className="flex gap-1 px-2.5 pt-1.5 pb-1 max-lg:pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <SoundLabelToggle
              label="효과음"
              active={soundsOn}
              onClick={() => {
                const next = !soundsOn;
                setSoundsEnabled(next);
                setSoundsOn(next);
                if (next) unlockAudioFromUserGesture();
              }}
            />
            <SoundLabelToggle
              label="배경음악"
              active={bgmOn}
              onClick={() => {
                const next = !bgmOn;
                setBgmEnabled(next);
                setBgmOn(next);
                if (next) {
                  unlockAudioFromUserGesture().then(() => startBgm());
                } else {
                  stopBgm();
                }
              }}
            />
          </div>

          <SidebarAccountMenu
            onLogout={onLogout}
            showAdminLink={showAdminLink}
            demoMode={demoMode}
          />
        </div>
      </aside>
    </>
  );
}
