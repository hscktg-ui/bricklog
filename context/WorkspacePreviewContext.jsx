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

/** @typedef {import('@/lib/workspace/devicePreviewCycle').DeviceId} DeviceId */

const WorkspacePreviewContext = createContext(null);

export function WorkspacePreviewProvider({ children }) {
  const viewport = useViewport();
  const native = useMemo(
    () => nativeDeviceFromViewport(viewport),
    [viewport.isMobile, viewport.isTablet, viewport.isDesktop]
  );

  const [preview, setPreview] = useState("desktop");

  useEffect(() => {
    setPreview(native);
  }, [native]);

  const cycle = useCallback(() => {
    setPreview((prev) => nextPreviewDevice(prev));
  }, []);

  const simulating = isSimulatedPreview(preview, native);

  const value = useMemo(
    () => ({
      preview,
      native,
      simulating,
      maxWidth: simulating ? DEVICE_WIDTHS[preview] : null,
      label: DEVICE_LABELS[preview],
      cycle,
    }),
    [preview, native, simulating, cycle]
  );

  return (
    <WorkspacePreviewContext.Provider value={value}>
      {children}
    </WorkspacePreviewContext.Provider>
  );
}

export function useWorkspacePreview() {
  const ctx = useContext(WorkspacePreviewContext);
  if (!ctx) {
    throw new Error("useWorkspacePreview must be used within WorkspacePreviewProvider");
  }
  return ctx;
}
