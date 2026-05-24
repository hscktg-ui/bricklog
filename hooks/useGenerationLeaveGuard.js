"use client";

import { useEffect } from "react";

/**
 * 생성·결과 표시 중 새로고침/탭 닫기 경고
 * @param {boolean} active
 * @param {string} [message]
 */
export function useGenerationLeaveGuard(
  active,
  message = "이야기를 표시하는 중입니다. 지금 나가면 결과를 못 볼 수 있어요."
) {
  useEffect(() => {
    if (!active || typeof window === "undefined") return undefined;

    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active, message]);
}
