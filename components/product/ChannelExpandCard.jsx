"use client";

import { useEffect, useState } from "react";
import { CHANNEL_EXPAND } from "@/lib/product/craft";
import {
  VISION_CTA_ACCENT,
  VISION_GHOST_BTN,
  VISION_STATUS_OK,
} from "@/lib/landing/vision2030Styles";

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
      className={`p-4 ${VISION_STATUS_OK} ${className}`}
      role="status"
    >
      <p className="text-[14px] font-bold text-[var(--vision-ink)]">
        {CHANNEL_EXPAND.title}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--vision-muted)]">
        {CHANNEL_EXPAND.body}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onGoPlace}
          className={`${VISION_CTA_ACCENT} !min-h-[40px] !w-auto !px-4 !py-2 !text-[12px]`}
        >
          {CHANNEL_EXPAND.placeCta}
        </button>
        <button
          type="button"
          onClick={onGoInsta}
          className={VISION_GHOST_BTN}
        >
          {CHANNEL_EXPAND.instaCta}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full px-3 py-2 text-[12px] font-medium text-[var(--vision-muted)] hover:text-[var(--vision-ink)]"
        >
          {CHANNEL_EXPAND.dismiss}
        </button>
      </div>
    </div>
  );
}
