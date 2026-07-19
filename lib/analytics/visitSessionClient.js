/** 방문·무료 테스트·가입 퍼널 공용 session_id (브라우저 전용) */
export const VISIT_SESSION_KEY = "briclog_visit_sid";
export const PUBLIC_TEST_SESSION_KEY = "briclog-public-test-session-id";

export function getUnifiedVisitSessionId() {
  if (typeof window === "undefined") return "";
  let id =
    sessionStorage.getItem(VISIT_SESSION_KEY) ||
    sessionStorage.getItem(PUBLIC_TEST_SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
  sessionStorage.setItem(VISIT_SESSION_KEY, id);
  sessionStorage.setItem(PUBLIC_TEST_SESSION_KEY, id);
  return id;
}
