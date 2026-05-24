const key = (contentId) => `briclog-rewrite-versions-${contentId}`;

export function pushRewriteVersion(contentId, entry) {
  if (typeof window === "undefined" || !contentId) return [];
  const list = loadRewriteVersions(contentId);
  const next = {
    id: `v${list.length + 1}`,
    label: entry.label || `v${list.length + 1}`,
    content: entry.content,
    feedbackText: entry.feedbackText || "",
    feedbackCategory: entry.feedbackCategory || [],
    editorAIScore: entry.editorAIScore ?? entry.content?.editorAI?.summary?.overall ?? null,
    at: new Date().toISOString(),
  };
  list.unshift(next);
  localStorage.setItem(key(contentId), JSON.stringify(list.slice(0, 20)));
  return list;
}

export function loadRewriteVersions(contentId) {
  if (typeof window === "undefined" || !contentId) return [];
  try {
    return JSON.parse(localStorage.getItem(key(contentId)) || "[]");
  } catch {
    return [];
  }
}

export function seedInitialVersion(contentId, content, label = "v1 최초 생성") {
  const existing = loadRewriteVersions(contentId);
  if (existing.length) return existing;
  return pushRewriteVersion(contentId, { label, content, feedbackText: "" });
}
