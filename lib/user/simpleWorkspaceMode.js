import {
  loadUserPreferences,
  saveUserPreferences,
} from "@/lib/user/userPreferences";

export const SIMPLE_MODE_CHANGED_EVENT = "briclog-simple-mode-changed";

/** 간단 모드 기본: 켜짐 (false로만 끔) */
export function isSimpleWorkspaceDefault() {
  return process.env.NEXT_PUBLIC_BRICLOG_SIMPLE_WORKSPACE !== "false";
}

export function isSimpleWorkspaceMode(userId) {
  if (!isSimpleWorkspaceDefault()) return false;
  const prefs = loadUserPreferences(userId);
  return prefs.simpleWorkspaceMode !== false;
}

export function setSimpleWorkspaceMode(userId, enabled) {
  saveUserPreferences(userId, { simpleWorkspaceMode: !!enabled });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SIMPLE_MODE_CHANGED_EVENT));
  }
}
