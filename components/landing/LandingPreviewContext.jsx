"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useViewport } from "@/hooks/useViewport";
import {
  DEVICE_LABELS,
  DEVICE_WIDTHS,
  isSimulatedPreview,
  nativeDeviceFromViewport,
  nextPreviewDevice,
} from "@/lib/workspace/devicePreviewCycle";

const LandingPreviewContext = createContext(null);

export function LandingPreviewProvider({ children }) {
  const vp = useViewport();
  const native = useMemo(() => nativeDeviceFromViewport(vp), [vp]);
  const [preview, setPreview] = useState("desktop");

  useEffect(() => {
    setPreview(native);
  }, [native]);

  const simulating = isSimulatedPreview(preview, native);
  const maxWidth = simulating ? DEVICE_WIDTHS[preview] : null;

  const value = useMemo(
    () => ({
      preview,
      native,
      simulating,
      maxWidth,
      setPreview,
      cyclePreview: () => setPreview((prev) => nextPreviewDevice(prev)),
      label: DEVICE_LABELS[preview],
    }),
    [preview, native, simulating, maxWidth]
  );

  return (
    <LandingPreviewContext.Provider value={value}>
      {children}
    </LandingPreviewContext.Provider>
  );
}

export function useLandingPreview() {
  const ctx = useContext(LandingPreviewContext);
  if (!ctx) {
    throw new Error("useLandingPreview requires LandingPreviewProvider");
  }
  return ctx;
}

/** Provider 없이도 쓸 수 있는 optional hook (Auth 단독 테스트용) */
export function useLandingPreviewOptional() {
  return useContext(LandingPreviewContext);
}
