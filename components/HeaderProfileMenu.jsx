"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";

export default function HeaderProfileMenu({
  userName = "사용자",
  onOpenProfile,
  onLogout,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const initial = (userName || "U").charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${userName} 계정 메뉴`}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#03C75A] text-[12px] font-bold text-white shadow-sm ring-2 ring-white transition hover:bg-[#02B350] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#03C75A]"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[168px] rounded-xl border border-[#E8EBED] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.1)]"
        >
          <p className="border-b border-[#E8EBED] px-3 py-2 text-[12px] font-semibold text-[#191F28]">
            {userName}
          </p>
          {onOpenProfile && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenProfile();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[#4E5968] hover:bg-[#F7F8FA]"
            >
              <Icon name="user" className="h-4 w-4 text-[#8B95A1]" />
              내 정보 · 프로필
            </button>
          )}
          {onLogout && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full px-3 py-2 text-left text-[13px] text-[#8B95A1] hover:bg-[#F7F8FA]"
            >
              로그아웃
            </button>
          )}
        </div>
      )}
    </div>
  );
}
