import { getUnifiedVisitSessionId } from "@/lib/analytics/visitSessionClient";

const ATTRIBUTION_KEY = "briclog_signup_source";
const FUNNEL_SENT_PREFIX = "briclog_funnel_sent:";

export const SIGNUP_INTENT_PATH_PREFIX = "__intent/signup:";
export const SIGNUP_FUNNEL_PATH_PREFIX = "__funnel/signup:";
export const LOGIN_INTENT_PATH_PREFIX = "__intent/login:";
export const LOGIN_FAIL_PATH_PREFIX = "__funnel/login_fail:";

function visitSessionId() {
  return getUnifiedVisitSessionId();
}

function postVisitPath(path) {
  const sessionId = visitSessionId();
  if (!sessionId) return;
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

export function setSignupAttributionSource(source = "unknown") {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, String(source).slice(0, 40));
  } catch {
    /* ignore */
  }
}

export function getSignupAttributionSource() {
  if (typeof window === "undefined") return "unknown";
  try {
    return sessionStorage.getItem(ATTRIBUTION_KEY) || "unknown";
  } catch {
    return "unknown";
  }
}

/** 가입 CTA 클릭 — site_visits path로 집계 (관리자 전환율) */
export function recordSignupIntent(source = "unknown") {
  if (typeof window === "undefined") return;
  setSignupAttributionSource(source);
  postVisitPath(`${SIGNUP_INTENT_PATH_PREFIX}${String(source).slice(0, 40)}`);
}

/**
 * 가입 퍼널 단계 — modal_open · form_submit · signup_success
 */
export function recordSignupFunnelStep(step, source) {
  if (typeof window === "undefined") return;
  const src = String(source || getSignupAttributionSource() || "unknown").slice(
    0,
    40
  );
  const key = `${FUNNEL_SENT_PREFIX}${step}:${src}`;
  if (step === "modal_open") {
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }
  postVisitPath(`${SIGNUP_FUNNEL_PATH_PREFIX}${step}:${src}`);
}

/** 로그인 시도 — site_visits (admin 로그인 힌트) */
export function recordLoginIntent(source = "auth_modal") {
  if (typeof window === "undefined") return;
  postVisitPath(`${LOGIN_INTENT_PATH_PREFIX}${String(source).slice(0, 40)}`);
}

/** 로그인 실패 — code:source (admin 집계) */
export function recordLoginFailure(errorCode = "unknown", source = "auth_modal") {
  if (typeof window === "undefined") return;
  const code = String(errorCode || "unknown").slice(0, 32);
  const src = String(source || "auth_modal").slice(0, 30);
  postVisitPath(`${LOGIN_FAIL_PATH_PREFIX}${code}:${src}`);
}
