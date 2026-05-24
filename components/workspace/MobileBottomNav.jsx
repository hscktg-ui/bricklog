"use client";

import Icon from "@/components/Icon";
import {
  CHANNEL_PRODUCTS,
  MAIN_CHANNEL_IDS,
} from "@/lib/channels/channelProducts";
import { unlockAudioFromUserGesture } from "@/lib/audio/briclogSounds";

export default function MobileBottomNav({
  activeMenu,
  onSelect,
  onOpenDrawer,
  drawerOpen = false,
  navigateBlocked = false,
}) {
  const trySelect = (id) => {
    if (navigateBlocked) return;
    onSelect(id);
  };
  const moreActive =
    drawerOpen ||
    !MAIN_CHANNEL_IDS.includes(activeMenu);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[45] flex h-14 shrink-0 items-stretch border-t border-[#E8EBED] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="채널 바로가기"
    >
      {MAIN_CHANNEL_IDS.map((id) => {
        const product = CHANNEL_PRODUCTS[id];
        const isActive = activeMenu === id && !drawerOpen;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              unlockAudioFromUserGesture();
              trySelect(id);
            }}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 ${
              isActive ? "text-[#03C75A]" : "text-[#8B95A1]"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="flex flex-col items-center justify-center gap-0.5">
              <Icon name={product.icon} className="h-5 w-5 shrink-0" />
              <span className="max-w-full truncate text-[10px] font-medium leading-none">
                {product.shortLabel}
              </span>
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          unlockAudioFromUserGesture();
          if (navigateBlocked) return;
          onOpenDrawer();
        }}
        className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 ${
          moreActive ? "text-[#03C75A]" : "text-[#8B95A1]"
        }`}
        aria-expanded={drawerOpen}
        aria-label="전체 메뉴 · 검수 · 기록"
      >
        <span className="flex flex-col items-center justify-center gap-0.5">
          <Icon name="menu" className="h-5 w-5 shrink-0" />
          <span className="text-[10px] font-medium leading-none">더보기</span>
        </span>
      </button>
    </nav>
  );
}
