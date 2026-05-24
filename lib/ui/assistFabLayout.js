/** 도움말·기기 미리보기 FAB — 위치·크기·색 통일 */

export const ASSIST_FAB_SIZE =
  "flex h-11 w-11 items-center justify-center sm:h-12 sm:w-12";

export const ASSIST_FAB_SIDE = "right-4 sm:right-6";

export const ASSIST_FAB_SHELL =
  "rounded-full border shadow-md transition active:brightness-[0.97]";

export const ASSIST_FAB_IDLE =
  "border-[#03C75A]/40 bg-[#F8FDF9] text-[#03A94D] hover:border-[#03C75A] hover:bg-[#E8F9EF]";

export const ASSIST_FAB_ACTIVE =
  "border-[#03C75A] bg-[#E8F9EF] ring-2 ring-[#03C75A]/25";

/** @param {"landing"|"workspace"} layout */
export function assistFabBottom(layout) {
  if (layout === "landing") {
    return {
      help:
        "bottom-[calc(var(--landing-cta-h,4.75rem)+0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6",
      device:
        "bottom-[calc(var(--landing-cta-h,4.75rem)+3.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]",
    };
  }
  return {
    help:
      "bottom-[calc(var(--workspace-mobile-nav-h,3.5rem)+0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6",
    device:
      "bottom-[calc(var(--workspace-mobile-nav-h,3.5rem)+3.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]",
  };
}
