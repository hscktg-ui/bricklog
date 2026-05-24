import { normalizeUserId } from "./workspaceStorage";
import { clearFormDraft } from "@/lib/formDraft";

const USER_PREFIXES = (userId) => {
  const id = normalizeUserId(userId);
  return [
    `briclog-brands-v2-${id}`,
    `briclog-workspace-v2-${id}`,
    `briclog-prefs-${id}`,
    `briclog-feedback-${id}`,
  ];
};

const GLOBAL_PREFIX = "briclog-";

/**
 * 브라우저 저장소를 비우고 첫 접속 상태로 되돌립니다.
 */
export function resetBriclogWorkspace(userId, opts = {}) {
  if (typeof window === "undefined") return { ok: false };

  const removed = [];

  for (const key of USER_PREFIXES(userId)) {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      removed.push(key);
    }
  }

  clearFormDraft();
  removed.push("briclog-form-draft-v1");

  if (opts.full) {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(GLOBAL_PREFIX)) {
        localStorage.removeItem(key);
        removed.push(key);
      }
    }
  }

  try {
    sessionStorage.removeItem("briclog-reset-once");
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(GLOBAL_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    /* ignore */
  }

  return { ok: true, removed };
}

export function reloadAfterReset() {
  if (typeof window === "undefined") return;
  window.location.replace("/");
}
