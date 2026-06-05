"use client";

import { useEffect, useState } from "react";
import { CHANNEL_EXPAND } from "@/lib/product/craft";

const DISMISS_KEY = "briclog-channel-expand-dismissed";

/**
 * 첫 편집본 완료 후 — 플레이스·인스타 이어 만들기 안내
 */
export default function ChannelExpandCard({
  onGoPlace,
  onGoInsta,
  className = "",
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <div
      className={`rounded-xl border border-[#03C75A]/30 bg-gradient-to-br from-[#F6FDF9] to-white p-4 ${className}`}
      role="status"
    >
      <p className="text-[14px] font-bold text-[#191F28]">{CHANNEL_EXPAND.title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#4E5968]">
        {CHANNEL_EXPAND.body}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGoPlace}
          className="rounded-lg bg-[#03C75A] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#02B350]"
        >
          {CHANNEL_EXPAND.placeCta}
        </button>
        <button
          type="button"
          onClick={onGoInsta}
          className="rounded-lg border border-[#03C75A]/40 bg-white px-3 py-2 text-[12px] font-semibold text-[#03A94D] hover:bg-[#F6FDF9]"
        >
          {CHANNEL_EXPAND.instaCta}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-3 py-2 text-[12px] font-medium text-[#8B95A1] hover:text-[#4E5968]"
        >
          {CHANNEL_EXPAND.dismiss}
        </button>
      </div>
    </div>
  );
}
