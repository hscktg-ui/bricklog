function draftKey(userId, brandId) {
  const uid = userId ? String(userId) : "anon";
  const bid = brandId ? String(brandId) : "default";
  return `briclog-form-draft-v2-${uid}-${bid}`;
}

function legacyDraftKey(userId) {
  return userId
    ? `briclog-form-draft-v1-${userId}`
    : "briclog-form-draft-v1";
}

export function loadFormDraft(userId, brandId) {
  if (typeof window === "undefined") return null;
  try {
    const scoped = brandId
      ? localStorage.getItem(draftKey(userId, brandId))
      : null;
    if (scoped) return JSON.parse(scoped);
    if (!brandId) {
      const legacy = localStorage.getItem(legacyDraftKey(userId));
      return legacy ? JSON.parse(legacy) : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveFormDraft(values, userId, brandId) {
  if (typeof window === "undefined") return;
  const id = brandId || values?.brandId || "default";
  try {
    localStorage.setItem(draftKey(userId, id), JSON.stringify(values));
  } catch {
    /* ignore */
  }
}

/** 입력 중 메인 스레드 블로킹을 줄이기 위한 지연 저장 */
export function scheduleSaveFormDraft(values, userId, delayMs = 800, brandId) {
  if (typeof window === "undefined") return () => {};
  let timer = null;
  const run = () => {
    timer = null;
    const persist = () => saveFormDraft(values, userId, brandId);
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

export function clearFormDraft(userId, brandId) {
  if (typeof window === "undefined") return;
  try {
    if (brandId) {
      localStorage.removeItem(draftKey(userId, brandId));
      return;
    }
    localStorage.removeItem(legacyDraftKey(userId));
  } catch {
    /* ignore */
  }
}
