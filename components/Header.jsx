import Icon from "./Icon";
import HeaderProfileMenu from "@/components/HeaderProfileMenu";
import HeaderPlanControl from "@/components/workspace/HeaderPlanControl";
import { channelHeaderTitle } from "@/lib/channels/channelProducts";

const MENU_JOURNEY = {
  today: "Today",
  growth: "Brief",
  plan: "Brief",
  blog: "Create",
  place: "Create",
  insta: "Create",
  review: "Review",
  history: "Library",
};

export default function Header({
  onHome,
  userName = "사용자",
  activeMenu = "blog",
  headerTitle,
  brandName = "",
  onOpenSidebar,
  onPlanChange,
  billingPlanId = "free",
  billingBetaActive = false,
  billingFreeLaunch = false,
  demoMode = false,
  onOpenProfile,
  onLogout,
}) {
  const title = headerTitle ?? channelHeaderTitle(activeMenu);
  const journey = MENU_JOURNEY[activeMenu] || "Today";
  const isToday = activeMenu === "today" || headerTitle === "Today";
  const showPlanControl =
    !demoMode && !isToday && typeof onPlanChange === "function";
  const contextLine = isToday
    ? brandName
      ? brandName
      : "지금 무엇을"
    : brandName
      ? `${brandName}`
      : "오늘 적용할 브랜드를 고르세요";

  return (
    <header className="briclog-workspace-header sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-1.5 border-b border-[var(--vision-line)] bg-[var(--vision-glass-strong)] px-2.5 backdrop-blur-xl sm:h-14 sm:gap-2 sm:px-4 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
        {onOpenSidebar ? (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--vision-line-strong)] bg-[var(--vision-btn-surface,rgba(3,199,90,0.1))] text-[var(--vision-ink)] backdrop-blur-sm hover:bg-[var(--vision-btn-surface-hover,rgba(3,199,90,0.16))] sm:h-10 sm:w-10 lg:hidden"
            aria-label="메뉴 열기"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
        ) : null}
        <div className="min-w-0">
          {isToday ? (
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--vision-muted)] sm:text-[11px]">
              {contextLine}
            </p>
          ) : (
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--vision-muted)] sm:text-[11px]">
              {journey}
              <span className="mx-1.5 text-[var(--vision-line-strong)]">·</span>
              <span className="normal-case tracking-normal text-[var(--vision-muted)]">
                {contextLine}
              </span>
            </p>
          )}
          <h1 className="truncate text-[14px] font-semibold leading-tight tracking-[-0.02em] text-[var(--vision-ink)] sm:text-[16px] md:text-[17px]">
            {onHome && !isToday ? (
              <button
                type="button"
                onClick={onHome}
                className="truncate text-left hover:opacity-80"
              >
                {title}
              </button>
            ) : (
              title
            )}
          </h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
        {showPlanControl && (
          <HeaderPlanControl
            planId={billingPlanId}
            betaActive={billingBetaActive}
            freeLaunchActive={billingFreeLaunch}
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
