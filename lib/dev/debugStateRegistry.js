/**
 * Dev-only React state fragments for click-blocker diagnostics (browser).
 */

const FRAGMENTS = {};

export function setDebugStateFragment(key, value) {
  if (typeof window === "undefined") return;
  if (value == null) {
    delete FRAGMENTS[key];
  } else {
    FRAGMENTS[key] = value;
  }
  window.__BRICLOG_DEBUG__ = {
    ...FRAGMENTS,
    _updatedAt: new Date().toISOString(),
  };
}

export function getDebugState() {
  if (typeof window === "undefined") return {};
  return window.__BRICLOG_DEBUG__ || {};
}

/** 명시적 opt-in만 — 개발 서버에서도 기본 비표시 (`?debugClick=1` 또는 NEXT_PUBLIC_BRICLOG_DEBUG_CLICK=true) */
export function isClickDebugEnabled() {
  if (process.env.NEXT_PUBLIC_BRICLOG_DEBUG_CLICK === "true") return true;
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("debugClick") === "1";
  } catch {
    return false;
  }
}
