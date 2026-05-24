const draftKey = (userId) =>
  userId
    ? `briclog-form-draft-v1-${userId}`
    : "briclog-form-draft-v1";

export function loadFormDraft(userId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveFormDraft(values, userId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(values));
  } catch {
    /* ignore */
  }
}

/** 입력 중 메인 스레드 블로킹을 줄이기 위한 지연 저장 */
export function scheduleSaveFormDraft(values, userId, delayMs = 800) {
  if (typeof window === "undefined") return () => {};
  let timer = null;
  const run = () => {
    timer = null;
    const persist = () => saveFormDraft(values, userId);
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(persist, { timeout: 2500 });
    } else {
      persist();
    }
  };
  timer = window.setTimeout(run, delayMs);
  return () => {
    if (timer != null) {
      window.clearTimeout(timer);
      timer = null;
    }
  };
}

export function clearFormDraft(userId) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(draftKey(userId));
  } catch {
    /* ignore */
  }
}
