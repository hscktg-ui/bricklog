"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { parseUtmFromSearch } from "@/lib/analytics/visitSource";
import {
  ACQUISITION_SENT_KEY,
  FIRST_TOUCH_STORAGE_KEY,
} from "@/lib/analytics/userAcquisition";
import { getUnifiedVisitSessionId } from "@/lib/analytics/visitSessionClient";

const VISIT_SENT_KEY = "briclog_visit_sent";

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

function persistFirstTouch(path, utm = {}) {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(FIRST_TOUCH_STORAGE_KEY)) return;
  try {
    sessionStorage.setItem(
      FIRST_TOUCH_STORAGE_KEY,
      JSON.stringify({
        path,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        utmSource: utm.utmSource || "",
        utmMedium: utm.utmMedium || "",
        utmCampaign: utm.utmCampaign || "",
        recordedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* ignore */
  }
}

function readFirstTouch() {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(FIRST_TOUCH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function recordVisit(path, utm = {}) {
  const sid = getUnifiedVisitSessionId();
  if (!sid) return;
  const visitKey = `${path}|${utm.utmSource || ""}|${utm.utmMedium || ""}`;
  const sent = sessionStorage.getItem(VISIT_SENT_KEY);
  if (sent === visitKey) return;

  const headers = { "Content-Type": "application/json" };
  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch("/api/public/visit", {
      method: "POST",
      headers,
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

async function sendAcquisitionStamp() {
  if (!isSupabaseConfigured) return;
  if (sessionStorage.getItem(ACQUISITION_SENT_KEY)) return;

  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return;

  const sid = getUnifiedVisitSessionId();
  const firstTouch = readFirstTouch();
  const body = firstTouch
    ? {
        sessionId: sid,
        path: firstTouch.path,
        referrer: firstTouch.referrer,
        utmSource: firstTouch.utmSource,
        utmMedium: firstTouch.utmMedium,
        utmCampaign: firstTouch.utmCampaign,
      }
    : { sessionId: sid };

  try {
    const res = await fetch("/api/presence/acquisition", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.ok) sessionStorage.setItem(ACQUISITION_SENT_KEY, "1");
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
    persistFirstTouch(pathname, utm);
    void recordVisit(pathname, utm);
  }, [pathname, search]);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    void sendAcquisitionStamp();
    void sendHeartbeat(pathname);
    const id = setInterval(() => {
      void sendAcquisitionStamp();
      void sendHeartbeat(pathname);
    }, 90_000);
    return () => clearInterval(id);
  }, [pathname]);

  return null;
}
