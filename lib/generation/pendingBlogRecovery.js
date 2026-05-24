const STORAGE_KEY = "briclog_pending_blog_v1";
const MAX_AGE_MS = 30 * 60 * 1000;

export function stashPendingBlogResult(userId, payload) {
  if (typeof window === "undefined" || !payload?.blog) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: userId || null,
        savedAt: Date.now(),
        blog: payload.blog,
        baseContentLabel: payload.baseContentLabel || null,
        sourceChannel: payload.sourceChannel || "blog",
      })
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearPendingBlogResult() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string|null|undefined} userId
 * @returns {{ blog: object, baseContentLabel?: string, sourceChannel?: string } | null}
 */
export function restorePendingBlogResult(userId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.blog) return null;
    if (userId && data.userId && data.userId !== userId) return null;
    if (Date.now() - (data.savedAt || 0) > MAX_AGE_MS) {
      clearPendingBlogResult();
      return null;
    }
    return {
      blog: data.blog,
      baseContentLabel: data.baseContentLabel,
      sourceChannel: data.sourceChannel,
    };
  } catch {
    return null;
  }
}
