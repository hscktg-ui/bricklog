const EMAIL_RE =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE =
  /(?:\+82|0)(?:\s*[-.]?\s*)?(?:1[0-9]{1}|[2-9][0-9]{0,2})(?:\s*[-.]?\s*)?[0-9]{3,4}(?:\s*[-.]?\s*)?[0-9]{4}/g;
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;
const SECRET_KEYS =
  /(?:api[_-]?key|secret|password|token|bearer)\s*[:=]\s*\S+/gi;

/**
 * 메모·로그 저장 전 PII·비밀값 마스킹
 */
export function sanitizeLogText(text) {
  if (text == null) return "";
  let s = String(text);
  s = s.replace(SECRET_KEYS, "[redacted]");
  s = s.replace(EMAIL_RE, "[email]");
  s = s.replace(PHONE_RE, "[phone]");
  s = s.replace(CARD_RE, "[card]");
  return s.slice(0, 4000);
}

export function sanitizeLogMeta(meta = {}) {
  if (!meta || typeof meta !== "object") return {};
  const out = { ...meta };
  for (const key of ["memo", "feedback", "message", "note", "text"]) {
    if (typeof out[key] === "string") {
      out[key] = sanitizeLogText(out[key]);
    }
  }
  return out;
}
