"use client";

import { VISION_NAV_ITEM_ACTIVE, VISION_NAV_ITEM_IDLE } from "@/lib/landing/vision2030Styles";

/**
 * 작업실 ↔ 브릭로그 다음 전환 (임현규 피드백 — 상단 고정 탭)
 */
export default function WorkspaceRhythmTabs({
  active = "studio",
  onChange,
  className = "",
}) {
  if (typeof onChange !== "function") return null;

  const tabs = [
    { id: "studio", label: "콘텐츠 작업실" },
    { id: "next", label: "브릭로그 다음" },
  ];

  return (
    <nav
      className={`flex gap-1 border-b border-[var(--vision-line,#E8EBED)] bg-[var(--vision-paper,#F7F8FA)] px-3 py-2 sm:px-5 md:px-6 ${className}`}
      aria-label="작업실 보기 전환"
    >
      <div className="mx-auto flex w-full max-w-5xl gap-1">
        {tabs.map((tab) => {
          const on = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={on ? VISION_NAV_ITEM_ACTIVE : VISION_NAV_ITEM_IDLE}
              aria-current={on ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
