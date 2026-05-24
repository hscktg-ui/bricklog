/** 도움말·안내 문구 — 마크다운·AI 티 제거 */

export function plainReply(text) {
  if (!text || typeof text !== "string") return "";
  return (
    text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/^#+\s+/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}
