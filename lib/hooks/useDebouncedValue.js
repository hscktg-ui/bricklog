"use client";

import { useEffect, useState } from "react";

/** 입력값 디바운스 (맥락 힌트 등 실시간 연동용) */
export function useDebouncedValue(value, delayMs = 320) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
