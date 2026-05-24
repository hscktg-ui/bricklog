"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isSimpleWorkspaceMode,
  setSimpleWorkspaceMode,
  SIMPLE_MODE_CHANGED_EVENT,
} from "@/lib/user/simpleWorkspaceMode";

export function useSimpleWorkspaceMode(userId) {
  const [simpleMode, setSimpleMode] = useState(true);

  const refresh = useCallback(() => {
    setSimpleMode(isSimpleWorkspaceMode(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(SIMPLE_MODE_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SIMPLE_MODE_CHANGED_EVENT, onChange);
  }, [refresh]);

  const toggleSimpleMode = useCallback(
    (next) => {
      const value = typeof next === "boolean" ? next : !simpleMode;
      setSimpleWorkspaceMode(userId, value);
      setSimpleMode(value);
    },
    [userId, simpleMode]
  );

  return { simpleMode, setSimpleMode: toggleSimpleMode, refresh };
}
