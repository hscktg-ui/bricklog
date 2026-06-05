"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  const [preview, setPreviewState] = useState("desktop");
  const [userPicked, setUserPicked] = useState(false);

  useEffect(() => {
    if (!userPicked) setPreviewState(native);
  }, [native, userPicked]);

  const setPreview = useCallback((id) => {
    setUserPicked(true);
    setPreviewState(id);
  }, []);

  const cyclePreview = useCallback(() => {
    setUserPicked(true);
    setPreviewState((prev) => nextPreviewDevice(prev));
  }, []);

  const simulating = isSimulatedPreview(preview, native);

  const value = useMemo(
    () => ({
      preview,
      native,
      simulating,
      setPreview,
      cyclePreview,
      label: DEVICE_LABELS[preview],
    }),
    [preview, native, simulating, setPreview, cyclePreview]
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
