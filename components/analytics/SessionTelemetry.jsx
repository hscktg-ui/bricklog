"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

const VISIT_KEY = "briclog_visit_sid";
const VISIT_SENT_KEY = "briclog_visit_sent";

function visitSessionId() {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem(VISIT_KEY);
  if (!sid) {
    sid = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(VISIT_KEY, sid);
  }
  return sid;
}

async function recordVisit(path) {
  const sid = visitSessionId();
  if (!sid) return;
  const sent = sessionStorage.getItem(VISIT_SENT_KEY);
  if (sent === path) return;
  try {
    const res = await fetch("/api/public/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sid,
        path,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      }),
    });
    if (res.ok) sessionStorage.setItem(VISIT_SENT_KEY, path);
  } catch {
    /* non-blocking */
  }
}

async function sendHeartbeat(path) {
  if (!isSupabaseConfigured) return;
  const { data } = await supabase.auth.getSession();
  if (!data?.session?.access_token) return;
  try {
    await fetch("/api/presence/heartbeat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body: JSON.stringify({ page: path }),
    });
  } catch {
    /* non-blocking */
  }
}

/** 로그인 접속·익명 방문 집계 — 관리자 현황용 */
export default function SessionTelemetry() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    void recordVisit(pathname);
  }, [pathname]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    void sendHeartbeat(pathname);
    const id = setInterval(() => void sendHeartbeat(pathname), 90_000);
    return () => clearInterval(id);
  }, [pathname]);

  return null;
}
