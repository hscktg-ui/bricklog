import { getPublicTestSessionId } from "@/lib/publicTest/publicTestQuotaClient";

const VISIT_KEY = "briclog_visit_sid";

function visitSessionId() {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem(VISIT_KEY);
  if (!sid) {
    sid = getPublicTestSessionId() || `v_${Date.now().toString(36)}`;
    try {
      sessionStorage.setItem(VISIT_KEY, sid);
    } catch {
      /* ignore */
    }
  }
  return sid;
}

/** 가입 CTA 클릭 — site_visits path로 집계 (관리자 전환율) */
export function recordSignupIntent(source = "unknown") {
  if (typeof window === "undefined") return;
  const sessionId = visitSessionId();
  if (!sessionId) return;
  const path = `__intent/signup:${String(source).slice(0, 40)}`;
  void fetch("/api/public/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      path,
      referrer: typeof document !== "undefined" ? document.referrer : "",
    }),
  }).catch(() => {});
}

export const SIGNUP_INTENT_PATH_PREFIX = "__intent/signup:";
