"use client";

import { useCallback, useEffect, useState } from "react";
import { useNarrowWorkspace } from "@/hooks/useNarrowWorkspace";

const storageKey = (channel) => `briclog-layout-${channel}`;

/**
 * Per-channel layout: concise (body + copy first) vs full (all panels).
 * Defaults to concise on first visit under 1024px width.
 */
export function useChannelLayoutMode(channel) {
  const { narrow } = useNarrowWorkspace();
  const [layoutMode, setLayoutModeState] = useState("full");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey(channel));
      if (stored === "concise" || stored === "full") {
        setLayoutModeState(stored);
      } else if (narrow) {
        setLayoutModeState("concise");
      }
    } catch {
      if (narrow) setLayoutModeState("concise");
    }
    setHydrated(true);
  }, [channel, narrow]);

  const setLayoutMode = useCallback(
    (mode) => {
      setLayoutModeState(mode);
      try {
        localStorage.setItem(storageKey(channel), mode);
      } catch {
        /* ignore */
      }
    },
    [channel]
  );

  const concise = layoutMode === "concise";

  return {
    layoutMode,
    concise,
    hydrated,
    setLayoutMode,
    setConcise: () => setLayoutMode("concise"),
    setFull: () => setLayoutMode("full"),
  };
}
