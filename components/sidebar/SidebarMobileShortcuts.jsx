"use client";

import Icon from "@/components/Icon";
import { CHANNEL_PRODUCTS } from "@/lib/channels/channelProducts";
import {
  VISION_EYEBROW,
  VISION_PANEL,
  VISION_SUB,
} from "@/lib/landing/vision2030Styles";

/** 모바일 드로어 상단 — 하단 탭에 없는 운영 계획·기록 바로가기 */
export default function SidebarMobileShortcuts({
  activeMenu,
  onSelect,
  onClose,
}) {
  const items = [
    { id: "plan", ...CHANNEL_PRODUCTS.plan },
    { id: "history", ...CHANNEL_PRODUCTS.history },
  ];

  return (
    <div className="mb-2 border-b border-[var(--vision-line)]/80 px-2 pb-2 lg:hidden">
      <p className={`px-2.5 pb-1.5 ${VISION_EYEBROW}`}>자주 쓰는 메뉴</p>
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((item) => {
          const active =
            activeMenu === item.id ||
            (item.id === "plan" && (activeMenu === "review" || activeMenu === "image"));
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
                  ? "bg-[var(--vision-accent)] text-white shadow-[var(--vision-shadow-soft)]"
                  : "border border-[var(--vision-line)] bg-[var(--vision-panel-bg,#fff)] text-[var(--vision-muted)]"
              }`}
            >
              <Icon
                name={item.icon}
                className={`h-5 w-5 ${active ? "text-white" : "text-[var(--vision-muted)]"}`}
              />
              <span>{item.shortLabel || item.menuLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
