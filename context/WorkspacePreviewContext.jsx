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

  const [preview, setPreviewState] = useState("desktop");
  const [userPicked, setUserPicked] = useState(false);

  useEffect(() => {
    if (!userPicked) setPreviewState(native);
  }, [native, userPicked]);

  const setPreview = useCallback((id) => {
    setUserPicked(true);
    setPreviewState(id);
  }, []);

  const cycle = useCallback(() => {
    setUserPicked(true);
    setPreviewState((prev) => nextPreviewDevice(prev));
  }, []);

  const simulating = isSimulatedPreview(preview, native);

  const value = useMemo(
    () => ({
      preview,
      native,
      simulating,
      maxWidth: simulating ? DEVICE_WIDTHS[preview] : null,
      label: DEVICE_LABELS[preview],
      setPreview,
      cycle,
    }),
    [preview, native, simulating, setPreview, cycle]
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

export function useWorkspacePreviewOptional() {
  return useContext(WorkspacePreviewContext);
}
