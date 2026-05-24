"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IDLE_HINT_DISMISS_KEY,
  pickIdleHint,
} from "@/lib/dashboard/idleHints";

const IDLE_MS = 15_000;

/**
 * 로그인 후 작업 화면 — 15초 무활동 시 상단 힌트, 상호작용·닫기 시 숨김
 */
export default function WorkspaceIdleHint({ active }) {
  const [visible, setVisible] = useState(false);
  const [message] = useState(() => pickIdleHint());
  const timerRef = useRef(null);

  const clearIdleTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleIdleTimer = useCallback(() => {
    clearIdleTimer();
    if (!active) return;
    try {
      if (sessionStorage.getItem(IDLE_HINT_DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    timerRef.current = setTimeout(() => setVisible(true), IDLE_MS);
  }, [active, clearIdleTimer]);

  const hideAndReset = useCallback(() => {
    setVisible(false);
    scheduleIdleTimer();
  }, [scheduleIdleTimer]);

  const dismiss = useCallback(() => {
    setVisible(false);
    clearIdleTimer();
    try {
      sessionStorage.setItem(IDLE_HINT_DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [clearIdleTimer]);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      clearIdleTimer();
      return;
    }

    const onActivity = () => hideAndReset();
    const resetTimerOnly = () => scheduleIdleTimer();

    const events = ["mousedown", "keydown", "scroll", "touchstart", "focusin"];
    events.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );
    window.addEventListener("mousemove", resetTimerOnly, { passive: true });
    scheduleIdleTimer();

    return () => {
      clearIdleTimer();
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener("mousemove", resetTimerOnly);
    };
  }, [active, hideAndReset, scheduleIdleTimer, clearIdleTimer]);

  if (!active || !visible) return null;

  return (
    <div
      role="status"
      className="shrink-0 border-b border-[#03C75A]/20 bg-gradient-to-r from-[#E8F9EF] to-[#F7F8FA] px-4 py-2.5"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#191F28]">
          {message}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-medium text-[#4E5968] hover:bg-white/80"
          aria-label="힌트 닫기"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
