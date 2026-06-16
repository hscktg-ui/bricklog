"use client";

import { useEffect, useRef } from "react";

function isWakeLockSupported() {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/**
 * 생성·샘플 대기 중 모바일 화면 절전 방지 (Screen Wake Lock API).
 * 탭이 다시 보이면 lock을 재요청합니다.
 *
 * @param {boolean} enabled
 */
export function useScreenWakeLock(enabled) {
  const sentinelRef = useRef(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isWakeLockSupported()) return undefined;

    let cancelled = false;

    const release = async () => {
      try {
        await sentinelRef.current?.release?.();
      } catch {
        /* already released */
      }
      sentinelRef.current = null;
    };

    const acquire = async () => {
      if (cancelled || !enabledRef.current || document.hidden) return;
      if (sentinelRef.current) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await lock.release();
          return;
        }
        sentinelRef.current = lock;
        lock.addEventListener("release", () => {
          if (sentinelRef.current === lock) sentinelRef.current = null;
        });
      } catch {
        sentinelRef.current = null;
      }
    };

    void acquire();

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void release();
    };
  }, [enabled]);
}

export function screenWakeLockSupported() {
  return isWakeLockSupported();
}
