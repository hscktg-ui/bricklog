/** 로그인 화면 사용자 설정 (비밀번호·토큰 저장 금지) */

export const SAVED_EMAIL_KEY = "briclog_saved_email";
export const AUTO_LOGIN_KEY = "briclog_auto_login";

export function isAutoLoginEnabled() {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(AUTO_LOGIN_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setAutoLoginEnabled(enabled) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTO_LOGIN_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function loadSavedEmail() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(SAVED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function persistSavedEmail(email, save) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = String(email || "").trim();
    if (save && trimmed) {
      localStorage.setItem(SAVED_EMAIL_KEY, trimmed);
    } else {
      localStorage.removeItem(SAVED_EMAIL_KEY);
    }
  } catch {
    /* ignore */
  }
}
