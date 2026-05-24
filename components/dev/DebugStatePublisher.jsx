"use client";

import { useEffect } from "react";
import { setDebugStateFragment } from "@/lib/dev/debugStateRegistry";

/**
 * Dev-only: publishes React state for click diagnostics.
 */
export default function DebugStatePublisher({ fragmentKey, snapshot }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      try {
        if (new URLSearchParams(window.location.search).get("debugClick") !== "1") {
          return undefined;
        }
      } catch {
        return undefined;
      }
    }
    setDebugStateFragment(fragmentKey, snapshot);
    return () => setDebugStateFragment(fragmentKey, null);
  }, [fragmentKey, snapshot]);

  return null;
}
