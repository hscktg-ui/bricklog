"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/**
 * Animates an integer from `from` to `to` (stock-ticker style).
 */
export function useCountUp(to, { from = 0, duration = 2000, delay = 0, enabled = true } = {}) {
  const [value, setValue] = useState(enabled ? from : to);
  const [done, setDone] = useState(!enabled);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setValue(Math.floor(Number(to) || 0));
      setDone(true);
      return undefined;
    }

    const target = Math.max(0, Math.floor(Number(to) || 0));
    const startVal = Math.max(0, Math.floor(Number(from) || 0));
    setValue(startVal);
    setDone(false);

    let timeoutId;
    const run = () => {
      const startTime = performance.now();
      const tick = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        setValue(Math.floor(startVal + (target - startVal) * easeOutCubic(t)));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setValue(target);
          setDone(true);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    if (delay > 0) {
      timeoutId = window.setTimeout(run, delay);
    } else {
      run();
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [to, from, duration, delay, enabled]);

  return { value, done };
}
