"use client";

import Icon from "@/components/Icon";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";

/** 모바일 드로어 상단 — 하단 탭에 없는 검수·기록 바로가기 */
export default function SidebarMobileShortcuts({
  activeMenu,
  onSelect,
  onClose,
}) {
  const items = [
    { id: "review", ...CHANNEL_PRODUCTS.review },
    { id: "history", ...CHANNEL_PRODUCTS.history },
  ];

  return (
    <div className="mb-2 border-b border-[#E8EBED]/80 px-2 pb-2 lg:hidden">
      <p className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-wide text-[#8B95A1]">
        자주 쓰는 메뉴
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => {
          const active = activeMenu === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onClose?.();
              }}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-center text-[11px] font-semibold ${
                active
                  ? "bg-[#03C75A] text-white"
                  : "border border-[#E8EBED] bg-[#FAFBFC] text-[#4E5968]"
              }`}
            >
              <Icon
                name={item.icon}
                className={`h-5 w-5 ${active ? "text-white" : "text-[#8B95A1]"}`}
              />
              <span>{item.shortLabel || item.menuLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
