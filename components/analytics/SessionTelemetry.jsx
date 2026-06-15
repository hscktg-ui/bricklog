"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { parseUtmFromSearch } from "@/lib/analytics/visitSource";

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

function readStoredUtm() {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem("briclog_visit_utm");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistUtmFromSearch(search) {
  const parsed = parseUtmFromSearch(search);
  if (!parsed.utmSource && !parsed.utmMedium && !parsed.utmCampaign) {
    return readStoredUtm();
  }
  try {
    sessionStorage.setItem("briclog_visit_utm", JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
  return parsed;
}

async function recordVisit(path, utm = {}) {
  const sid = visitSessionId();
  if (!sid) return;
  const visitKey = `${path}|${utm.utmSource || ""}|${utm.utmMedium || ""}`;
  const sent = sessionStorage.getItem(VISIT_SENT_KEY);
  if (sent === visitKey) return;
  try {
    const res = await fetch("/api/public/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sid,
        path,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        utm_source: utm.utmSource || "",
        utm_medium: utm.utmMedium || "",
        utm_campaign: utm.utmCampaign || "",
      }),
    });
    if (res.ok) sessionStorage.setItem(VISIT_SENT_KEY, visitKey);
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
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";

  useEffect(() => {
    const utm = persistUtmFromSearch(search);
    void recordVisit(pathname, utm);
  }, [pathname, search]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    void sendHeartbeat(pathname);
    const id = setInterval(() => void sendHeartbeat(pathname), 90_000);
    return () => clearInterval(id);
  }, [pathname]);

  return null;
}
