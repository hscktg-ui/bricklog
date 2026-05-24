import Icon from "./Icon";
import HeaderProfileMenu from "@/components/HeaderProfileMenu";
import HeaderPlanControl from "@/components/workspace/HeaderPlanControl";
import { channelHeaderTitle } from "@/lib/channels/channelProducts";

export default function Header({
  onHome,
  userName = "사용자",
  activeMenu = "blog",
  headerTitle,
  onOpenSidebar,
  onPlanChange,
  billingPlanId = "free",
  billingBetaActive = false,
  demoMode = false,
  onOpenProfile,
  onLogout,
}) {
  const title = headerTitle ?? channelHeaderTitle(activeMenu);
  const showPlanControl = !demoMode && typeof onPlanChange === "function";

  return (
    <header className="briclog-workspace-header sticky top-0 z-30 flex h-11 shrink-0 items-center justify-between gap-1.5 px-2.5 sm:h-12 sm:gap-2 sm:px-4 md:h-14 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
        {onOpenSidebar ? (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 border-[#03C75A]/40 bg-[#F8FDF9] text-[#03A94D] hover:bg-[#E8F9EF] sm:h-10 sm:w-10 lg:hidden"
            aria-label="메뉴 열기"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
        ) : null}
        <h1 className="truncate text-[13px] font-semibold leading-tight text-[#191F28] sm:text-[15px] md:text-[16px]">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {showPlanControl && (
          <HeaderPlanControl
            planId={billingPlanId}
            betaActive={billingBetaActive}
            onPlanChange={onPlanChange}
          />
        )}
        <HeaderProfileMenu
          userName={userName}
          onOpenProfile={onOpenProfile}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
