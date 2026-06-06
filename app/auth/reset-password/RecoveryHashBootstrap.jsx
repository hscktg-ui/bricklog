"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * React hydration 전에 hash 토큰이 사라지기 전 세션 주입 보조
 */
export default function RecoveryHashBootstrap() {
  useEffect(() => {
    const hash = window.location.hash?.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    if (!hash) return;

    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    void supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(() => {
        const url = new URL(window.location.href);
        url.hash = "";
        window.history.replaceState({}, "", url.pathname + url.search);
      });
  }, []);

  return null;
}
