/** 보완 저장 시 초안 기록 제목 접미사 (예: "제목 · 2026-05-21 보완") */
export function buildRefinedDraftLabel(baseTitle, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const base = String(baseTitle || "초안").trim().slice(0, 48) || "초안";
  return `${base} · ${y}-${m}-${d} 보완`;
}

export function baseTitleFromHistoryContent(channel, content) {
  if (!content) return "";
  if (channel === "blog") {
    return content.title || content.titles?.[0] || content.representativeTitle || "";
  }
  if (channel === "place") return content.title || content.shortNotice || "";
  if (channel === "instagram") return content.hook || content.caption?.slice?.(0, 40) || "";
  return "";
}
